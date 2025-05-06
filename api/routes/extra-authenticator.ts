import { Hono } from 'hono';
import { cors } from 'hono/cors';

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
  return c.json({
    regist: 'success',
  });
});

extraAuthenticatorRouter.post('/unregist', async (c) => {
  return c.json({
    unregist: 'success',
  });
});

export { extraAuthenticatorRouter };
