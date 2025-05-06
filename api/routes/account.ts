import { KVNamespace } from '@cloudflare/workers-types';
import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import crypto from 'node:crypto';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const accountRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
accountRouter.use(cors());

async function generateAndRegistSession(context: Context, userEmail: string): Promise<string> {
  const secureAuthChallangeSessionKV = context.env.secure_auth_challange_session;
  const sessionUuid = crypto.randomUUID();
  const sessionInfo = {
    userEmail: userEmail,
  };
  await secureAuthChallangeSessionKV.put(sessionUuid, JSON.stringify(sessionInfo), { expirationTtl: 60 });
  return sessionUuid;
}

accountRouter.post('/signin', async (c) => {
  const body = await c.req.parseBody();
  const email = body.email.toString();
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  const userInfoJson = await secureAuthChallangeUserKV.get(email);
  if (!userInfoJson) {
    throw new HTTPException(401, { message: 'User Not Exist' });
  }
  const userInfo = JSON.parse(userInfoJson);
  const password = body.password.toString();
  const passwordHash = crypto.createHash('sha512').update(password).digest('hex');
  if (userInfo.passwordHash !== passwordHash) {
    throw new HTTPException(401, { message: 'Invalid password' });
  }
  await secureAuthChallangeUserKV.put(email, JSON.stringify({ ...userInfo, lastLoginedAt: new Date() }));
  const sessionUuid = await generateAndRegistSession(c, email);
  return c.json({
    session: sessionUuid,
  });
});

accountRouter.post('/signup', async (c) => {
  const body = await c.req.parseBody();
  const email = body.email.toString();
  const password = body.password.toString();
  const passwordHash = crypto.createHash('sha512').update(password).digest('hex');
  const secureAuthChallangeUserKV = c.env.secure_auth_challange_user;
  const userInfo = {
    passwordHash: passwordHash,
    lastLoginedAt: new Date(),
  };
  await secureAuthChallangeUserKV.put(email, JSON.stringify(userInfo));
  const sessionUuid = await generateAndRegistSession(c, email);
  return c.json({
    session: sessionUuid,
  });
});

accountRouter.post('/signout', async (c) => {
  return c.json({
    signput: 'success',
  });
});

export { accountRouter };
