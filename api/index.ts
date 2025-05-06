import { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { appendTrailingSlash } from 'hono/trailing-slash';
import { accountRouter } from './routes/account';
import { extraAuthenticatorRouter } from './routes/extra-authenticator';

const app = new Hono({ strict: true }).basePath('/api');
app.use(appendTrailingSlash());
app.route('/account', accountRouter);
app.route('/extraauth', extraAuthenticatorRouter);

app.get('/', (c) => {
  return c.json({ Hello: 'Hono!' });
});

export default app;
