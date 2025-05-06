import { KVNamespace } from '@cloudflare/workers-types';
import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import crypto from 'node:crypto';
import { loadSessionUser } from '@api/commons/utils';

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

accountRouter.get('/settings', async (c) => {
  const sessionUuid = c.req.header('session') || '';
  const userInfo = await loadSessionUser(c, sessionUuid);
  const settingsInfo = {
    extraAuthActive: false,
    passkeyActive: false,
  };
  if (userInfo.extraAuthInfo?.secret) {
    settingsInfo.extraAuthActive = true;
  }
  return c.json(settingsInfo);
});

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
    email: email,
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
  const sessionUuid = c.req.header('session') || '';
  const secureAuthChallangeSessionKV = c.env.secure_auth_challange_session;
  await secureAuthChallangeSessionKV.delete(sessionUuid);
  return c.status(200);
});

export { accountRouter };
