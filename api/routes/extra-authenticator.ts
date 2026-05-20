import type { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as OTPAuth from 'otpauth';
import {
  deleteSession,
  generateSession,
  getRequiredFormValue,
  loadChallengeSessionUser,
  loadSessionUser,
  saveUser,
} from '@api/commons/utils';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const extraAuthenticatorRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
extraAuthenticatorRouter.use(cors({ origin: '*', allowHeaders: ['Content-Type', 'session'], allowMethods: ['GET', 'POST', 'OPTIONS'] }));

extraAuthenticatorRouter.get('/', async (c) => {
  return c.json({ hello: 'extra authenticator router!!' });
});

extraAuthenticatorRouter.post('/challenge', async (c) => {
  const body = await c.req.parseBody();
  const sessionUuid = c.req.header('session') || '';
  const { userInfo } = await loadChallengeSessionUser(c, sessionUuid, 'mfa');
  if (!userInfo.extraAuthInfo?.secret) {
    throw new HTTPException(403, { message: '2FA not Registed Yet' });
  }
  const code = getRequiredFormValue(body, 'code');
  const totp = new OTPAuth.TOTP({
    secret: userInfo.extraAuthInfo?.secret,
  });
  const verified = totp.validate({
    token: code,
  });
  if (verified !== null) {
    await deleteSession(c, sessionUuid);
    await saveUser(c, { ...userInfo, lastLoginedAt: new Date().toISOString() });
    const newSessionUuid = await generateSession(c, { userEmail: userInfo.email, purpose: 'authenticated' });
    return c.json({
      state: 'success',
      session: newSessionUuid,
    });
  } else {
    throw new HTTPException(401, { message: 'token failed' });
  }
});

extraAuthenticatorRouter.post('/regist', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  if (userInfo.extraAuthInfo?.secret) {
    throw new HTTPException(403, { message: 'Already Registed' });
  }
  const secret = new OTPAuth.Secret();
  await saveUser(c, { ...userInfo, extraAuthInfo: { secret: secret.base32 } });
  const totp = new OTPAuth.TOTP({
    secret: secret,
  });
  const otpauthUrl = totp.toString();
  return c.json({
    otpauth_url: otpauthUrl,
  });
});

extraAuthenticatorRouter.post('/unregist', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  if (!userInfo.extraAuthInfo?.secret) {
    throw new HTTPException(403, { message: 'Already Unregisted' });
  }
  await saveUser(c, { ...userInfo, extraAuthInfo: {} });
  return c.text('');
});

export { extraAuthenticatorRouter };
