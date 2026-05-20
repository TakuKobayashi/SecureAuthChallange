import type { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON, WebAuthnCredential } from '@simplewebauthn/server';
import {
  deleteSession,
  fromBase64Url,
  generateSession,
  getRequiredFormValue,
  loadChallengeSessionUser,
  loadSessionUser,
  loadUser,
  saveUser,
  toBase64Url,
} from '@api/commons/utils';
import type { StoredPasskeyCredential, UserInfo } from '@api/commons/utils';
import crypto from 'node:crypto';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const passkeyRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
passkeyRouter.use(cors({ origin: '*', allowHeaders: ['Content-Type', 'session'], allowMethods: ['GET', 'POST', 'OPTIONS'] }));

function getWebAuthnConfig(c: any): { rpName: string; rpID: string; origin: string } {
  const origin = c.req.header('Origin');
  if (!origin) {
    throw new HTTPException(400, { message: 'Origin header is required for WebAuthn' });
  }
  const url = new URL(origin);
  return {
    rpName: 'SecureAuthChallange',
    rpID: url.hostname,
    origin,
  };
}

function getCredentials(userInfo: UserInfo): StoredPasskeyCredential[] {
  return userInfo.passkeyInfo?.credentials || [];
}

function toWebAuthnCredential(credential: StoredPasskeyCredential): WebAuthnCredential {
  return {
    id: credential.id,
    publicKey: fromBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports as WebAuthnCredential['transports'],
  };
}

async function ensureUserId(c: any, userInfo: UserInfo): Promise<UserInfo> {
  if (userInfo.userId) {
    return userInfo;
  }
  const nextUserInfo = { ...userInfo, userId: crypto.randomUUID() };
  await saveUser(c, nextUserInfo);
  return nextUserInfo;
}

passkeyRouter.get('/', async (c) => {
  return c.json({ hello: 'passkey router!!' });
});

passkeyRouter.post('/registration/options', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await ensureUserId(c, await loadSessionUser(c, sessionUuid));
  const { rpName, rpID } = getWebAuthnConfig(c);
  const credentials = getCredentials(userInfo);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userInfo.userId),
    userName: userInfo.email,
    userDisplayName: userInfo.email,
    attestationType: 'none',
    excludeCredentials: credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports as any,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  const challengeSession = await generateSession(c, {
    userEmail: userInfo.email,
    purpose: 'passkey-registration',
    challenge: options.challenge,
  });
  return c.json({ options, challengeSession });
});

passkeyRouter.post('/registration/verify', async (c) => {
  const body = (await c.req.json()) as { session: string; credential: RegistrationResponseJSON };
  const { sessionInfo, userInfo } = await loadChallengeSessionUser(c, body.session, 'passkey-registration');
  const { rpID, origin } = getWebAuthnConfig(c);
  const verification = await verifyRegistrationResponse({
    response: body.credential,
    expectedChallenge: sessionInfo.challenge || '',
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
  await deleteSession(c, body.session);

  if (!verification.verified || !verification.registrationInfo) {
    throw new HTTPException(401, { message: 'Passkey registration failed' });
  }

  const credential = verification.registrationInfo.credential;
  const credentials = getCredentials(userInfo).filter((storedCredential) => storedCredential.id !== credential.id);
  credentials.push({
    id: credential.id,
    publicKey: toBase64Url(credential.publicKey),
    counter: credential.counter,
    transports: body.credential.response.transports,
    credentialDeviceType: verification.registrationInfo.credentialDeviceType,
    credentialBackedUp: verification.registrationInfo.credentialBackedUp,
  });
  await saveUser(c, { ...userInfo, passkeyInfo: { credentials } });

  return c.json({ state: 'success' });
});

passkeyRouter.post('/authentication/options', async (c) => {
  const body = await c.req.parseBody();
  const email = getRequiredFormValue(body, 'email');
  const userInfo = await loadUser(c, email);
  const credentials = getCredentials(userInfo);
  if (credentials.length === 0) {
    throw new HTTPException(401, { message: 'Passkey is not registered' });
  }

  const { rpID } = getWebAuthnConfig(c);
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: credentials.map((credential) => ({
      id: credential.id,
      transports: credential.transports as any,
    })),
    userVerification: 'required',
  });
  const challengeSession = await generateSession(c, {
    userEmail: email,
    purpose: 'passkey-authentication',
    challenge: options.challenge,
  });
  return c.json({ options, challengeSession });
});

passkeyRouter.post('/authentication/verify', async (c) => {
  const body = (await c.req.json()) as { session: string; credential: AuthenticationResponseJSON };
  const { sessionInfo, userInfo } = await loadChallengeSessionUser(c, body.session, 'passkey-authentication');
  const storedCredential = getCredentials(userInfo).find((credential) => credential.id === body.credential.id);
  if (!storedCredential) {
    await deleteSession(c, body.session);
    throw new HTTPException(401, { message: 'Unknown passkey' });
  }

  const { rpID, origin } = getWebAuthnConfig(c);
  const verification = await verifyAuthenticationResponse({
    response: body.credential,
    expectedChallenge: sessionInfo.challenge || '',
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: toWebAuthnCredential(storedCredential),
    requireUserVerification: true,
  });
  await deleteSession(c, body.session);

  if (!verification.verified) {
    throw new HTTPException(401, { message: 'Passkey authentication failed' });
  }

  const credentials = getCredentials(userInfo).map((credential) =>
    credential.id === verification.authenticationInfo.credentialID
      ? { ...credential, counter: verification.authenticationInfo.newCounter }
      : credential,
  );
  await saveUser(c, { ...userInfo, passkeyInfo: { credentials }, lastLoginedAt: new Date().toISOString() });
  const session = await generateSession(c, { userEmail: userInfo.email, purpose: 'authenticated' });

  return c.json({ state: 'success', session });
});

passkeyRouter.post('/unregister', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  await saveUser(c, { ...userInfo, passkeyInfo: { credentials: [] } });
  return c.text('');
});

export { passkeyRouter };
