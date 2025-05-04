import { Hono } from 'hono'

const app = new Hono({ strict: true }).basePath('/api')

app.get('/', (c) => {
  return c.json({Hello: 'Hono!'})
})

export default app
