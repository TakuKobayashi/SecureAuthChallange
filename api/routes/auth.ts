import { Hono } from 'hono';
import crypto from 'node:crypto';

const authRouter = new Hono({ strict: true });

authRouter.get('/', async (c) => {
  return c.json({ hello: 'auth router!!' });
});

authRouter.post('/signin', async (c) => {
  const body = await c.req.parseBody();
  const password = body.password.toString();
  const passwordHash = crypto.createHash('sha512').update(password).digest('hex');
  const sessionInfo = {
    session_uuid: crypto.randomUUID(),
    last_logined_at: new Date(),
  };
  return c.json({
    session: sessionInfo.session_uuid,
  });
});

export { authRouter };
