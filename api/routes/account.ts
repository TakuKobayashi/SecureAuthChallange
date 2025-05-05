import { Hono } from 'hono';
import { cors } from 'hono/cors';
import crypto from 'node:crypto';

const accountRouter = new Hono({ strict: true });
accountRouter.use(cors());

accountRouter.get('/', async (c) => {
  return c.json({ hello: 'account router!!' });
});

accountRouter.post('/signin', async (c) => {
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

accountRouter.post('/signup', async (c) => {
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

accountRouter.post('/signout', async (c) => {
  return c.json({
    signput: 'success',
  });
});

export { accountRouter };
