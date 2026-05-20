import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import crypto from 'node:crypto';

export type SessionPurpose = 'authenticated' | 'mfa' | 'passkey-registration' | 'passkey-authentication';

export type SessionInfo = {
  userEmail: string;
  purpose: SessionPurpose;
  challenge?: string;
};

export type StoredPasskeyCredential = {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  credentialDeviceType?: string;
  credentialBackedUp?: boolean;
};

export type UserInfo = {
  email: string;
  userId?: string;
  passwordHash?: string;
  lastLoginedAt?: string;
  extraAuthInfo?: {
    secret?: string;
  };
  passkeyInfo?: {
    credentials?: StoredPasskeyCredential[];
  };
};

const AUTHENTICATED_SESSION_TTL_SECONDS = 60 * 60 * 24;
const CHALLENGE_SESSION_TTL_SECONDS = 60 * 5;

export function sha512Hex(value: string): string {
  return crypto.createHash('sha512').update(value).digest('hex');
}

export function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function fromBase64Url(value: string): ReturnType<Uint8Array['slice']> {
  return Uint8Array.from(Buffer.from(value, 'base64url')).slice();
}

export function getRequiredFormValue(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value) {
    throw new HTTPException(400, { message: `${key} is required` });
  }
  return value;
}

export async function loadSession(context: Context, sessionUuid: string, purpose: SessionPurpose): Promise<SessionInfo> {
  if (!sessionUuid) {
    throw new HTTPException(401, { message: 'Session Required' });
  }
  const sessionInfoJson = await context.env.secure_auth_challange_session.get(sessionUuid);
  if (!sessionInfoJson) {
    throw new HTTPException(401, { message: 'Session Expired' });
  }
  const sessionInfo = JSON.parse(sessionInfoJson) as SessionInfo;
  if (sessionInfo.purpose !== purpose) {
    throw new HTTPException(401, { message: 'Invalid Session' });
  }
  return sessionInfo;
}

export async function loadUser(context: Context, email: string): Promise<UserInfo> {
  const userInfoJson = await context.env.secure_auth_challange_user.get(email);
  if (!userInfoJson) {
    throw new HTTPException(401, { message: 'User Not Exist' });
  }
  return JSON.parse(userInfoJson) as UserInfo;
}

export async function saveUser(context: Context, userInfo: UserInfo): Promise<void> {
  await context.env.secure_auth_challange_user.put(userInfo.email, JSON.stringify(userInfo));
}

export async function loadSessionUser(context: Context, sessionUuid: string): Promise<UserInfo> {
  const sessionInfo = await loadSession(context, sessionUuid, 'authenticated');
  return loadUser(context, sessionInfo.userEmail);
}

export async function loadChallengeSessionUser(
  context: Context,
  sessionUuid: string,
  purpose: SessionPurpose,
): Promise<{ sessionInfo: SessionInfo; userInfo: UserInfo }> {
  const sessionInfo = await loadSession(context, sessionUuid, purpose);
  const userInfo = await loadUser(context, sessionInfo.userEmail);
  return { sessionInfo, userInfo };
}

export async function generateSession(context: Context, sessionInfo: SessionInfo): Promise<string> {
  const sessionUuid = crypto.randomUUID();
  const expirationTtl = sessionInfo.purpose === 'authenticated' ? AUTHENTICATED_SESSION_TTL_SECONDS : CHALLENGE_SESSION_TTL_SECONDS;
  await context.env.secure_auth_challange_session.put(sessionUuid, JSON.stringify(sessionInfo), { expirationTtl });
  return sessionUuid;
}

export async function deleteSession(context: Context, sessionUuid: string): Promise<void> {
  if (sessionUuid) {
    await context.env.secure_auth_challange_session.delete(sessionUuid);
  }
}
