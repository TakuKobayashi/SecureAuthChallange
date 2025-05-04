import { Hono } from 'hono';
import { authRouter } from './routes/auth';

const app = new Hono({ strict: true }).basePath('/api');
app.route('/auth', authRouter);

app.get('/', (c) => {
  return c.json({ Hello: 'Hono!' });
});

export default app;
