import { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { appendTrailingSlash } from 'hono/trailing-slash';
import { accountRouter } from './routes/account';
import { extraAuthenticatorRouter } from './routes/extra-authenticator';

type Bindings = {
  KV: KVNamespace;
};

const app = new Hono<{ Bindings: Bindings }>({ strict: true }).basePath('/api');
app.use(appendTrailingSlash());
app.route('/account', accountRouter);
app.route('/extraauth', extraAuthenticatorRouter);

app.get('/', (c) => {
  return c.json({ Hello: 'Hono!' });
});

app.get('/kv/getsample', async (c) => {
  const kv = c.env.KV;
  const kvList = await kv.list();
  return c.json(kvList);
});

app.get('/kv/putsample', async (c) => {
  const kv = c.env.KV;
  const key = Math.random().toString(32).substring(2);
  const value = Math.random().toString(32).substring(2);
  await kv.put(key, value);
  return c.json({ key: key, value: value });
});

export default app;
