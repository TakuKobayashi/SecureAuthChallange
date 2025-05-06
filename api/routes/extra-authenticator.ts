import { Hono } from 'hono';
import { cors } from 'hono/cors';
import speakeasy from 'speakeasy';

const extraAuthenticatorRouter = new Hono({ strict: true });
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
  const secret = speakeasy.generateSecret();
  console.log(secret.base32);
  const otpauthUrl = secret.otpauth_url || '';
  return c.json({
    otpauth_url: otpauthUrl,
  });
});

extraAuthenticatorRouter.post('/unregist', async (c) => {
  return c.json({
    unregist: 'success',
  });
});

export { extraAuthenticatorRouter };
