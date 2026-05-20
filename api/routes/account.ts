import type { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { deleteSession, generateSession, getRequiredFormValue, loadSessionUser, saveUser, sha512Hex } from '@api/commons/utils';
import type { UserInfo } from '@api/commons/utils';
import crypto from 'node:crypto';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const accountRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
accountRouter.use(cors({ origin: '*', allowHeaders: ['Content-Type', 'session'], allowMethods: ['GET', 'POST', 'OPTIONS'] }));

accountRouter.get('/settings', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  const settingsInfo = {
    extraAuthActive: false,
    passkeyActive: false,
  };
  if (userInfo.extraAuthInfo?.secret) {
    settingsInfo.extraAuthActive = true;
  }
  if ((userInfo.passkeyInfo?.credentials || []).length > 0) {
    settingsInfo.passkeyActive = true;
  }
  return c.json(settingsInfo);
});

accountRouter.post('/signin', async (c) => {
  const body = await c.req.parseBody();
  const email = getRequiredFormValue(body, 'email');
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  const userInfoJson = await secureAuthChallangeUserKV.get(email);
  if (!userInfoJson) {
    throw new HTTPException(401, { message: 'User Not Exist' });
  }
  const userInfo = JSON.parse(userInfoJson);
  const password = getRequiredFormValue(body, 'password');
  const passwordHash = sha512Hex(password);
  if (userInfo.passwordHash !== passwordHash) {
    throw new HTTPException(401, { message: 'Invalid password' });
  }
  if (userInfo.extraAuthInfo?.secret) {
    const sessionUuid = await generateSession(c, { userEmail: email, purpose: 'mfa' });
    return c.json({
      state: 'extraauth',
      session: sessionUuid,
    });
  } else {
    await saveUser(c, { ...userInfo, lastLoginedAt: new Date().toISOString() });
    const sessionUuid = await generateSession(c, { userEmail: email, purpose: 'authenticated' });
    return c.json({
      state: 'success',
      session: sessionUuid,
    });
  }
});

accountRouter.post('/signup', async (c) => {
  const body = await c.req.parseBody();
  const email = getRequiredFormValue(body, 'email');
  const password = getRequiredFormValue(body, 'password');
  const passwordHash = sha512Hex(password);
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  const existingUserInfoJson = await secureAuthChallangeUserKV.get(email);
  if (existingUserInfoJson) {
    throw new HTTPException(409, { message: 'User Already Exists' });
  }
  const userInfo: UserInfo = {
    email: email,
    userId: crypto.randomUUID(),
    passwordHash: passwordHash,
    lastLoginedAt: new Date().toISOString(),
  };
  await secureAuthChallangeUserKV.put(email, JSON.stringify(userInfo));
  const sessionUuid = await generateSession(c, { userEmail: email, purpose: 'authenticated' });
  return c.json({
    state: 'success',
    session: sessionUuid,
  });
});

accountRouter.post('/signout', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  await deleteSession(c, sessionUuid);
  return c.text('');
});

export { accountRouter };
