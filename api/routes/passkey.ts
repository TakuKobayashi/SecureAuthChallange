import { KVNamespace } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { loadSessionUser, generateAndRegistSession } from '@api/commons/utils';
import crypto from 'node:crypto';
import { verifyRegistrationResponse } from '@simplewebauthn/server';

type Bindings = {
  secure_auth_challange_user: KVNamespace;
  secure_auth_challange_session: KVNamespace;
};

const passkeyRouter = new Hono<{ Bindings: Bindings }>({ strict: true });
passkeyRouter.use(cors());

passkeyRouter.get('/', async (c) => {
  return c.json({ hello: 'passkey router!!' });
});

passkeyRouter.post('/generate/publickey', async (c) => {
  const challenge = Math.random().toString(36).substring(2);
  console.log(challenge);
  const pubKey = {
    challenge: challenge,
    rp: {id: 'localhost', name: 'webauthn-app'},
    user: {id: crypto.randomUUID()},
    pubKeyCredParams: [
        {type: 'public-key', alg: -7},
        {type: 'public-key', alg: -257},
    ],
    authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
    }
  };
  console.log(pubKey);
  return c.json(pubKey);
});

passkeyRouter.post('/regist', async (c) => {
  //verifyRegistrationResponse
  return c.json({passkey: 'regist'});
});

export { passkeyRouter };
