import { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import speakeasy from 'speakeasy';
import { loadSessionUser } from '@api/commons/utils';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const extraAuthenticatorRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
extraAuthenticatorRouter.use(cors());

extraAuthenticatorRouter.get('/', async (c) => {
  return c.json({ hello: 'extra authenticator router!!' });
});

extraAuthenticatorRouter.post('/challenge', async (c) => {
  const body = await c.req.parseBody();
  const code = body.code.toString();
  return c.json({
    challenge: 'success',
  });
});

extraAuthenticatorRouter.post('/regist', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  if (userInfo.extraAuthInfo?.secret) {
    throw new HTTPException(403, { message: 'Already Registed' });
  }
  const secret = speakeasy.generateSecret();
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  await secureAuthChallangeUserKV.put(userInfo.email, JSON.stringify({ ...userInfo, extraAuthInfo: { secret: secret.base32 } }));
  const otpauthUrl = secret.otpauth_url || '';
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
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  await secureAuthChallangeUserKV.put(userInfo.email, JSON.stringify({ ...userInfo, extraAuthInfo: {} }));
  return c.status(200);
});

export { extraAuthenticatorRouter };
