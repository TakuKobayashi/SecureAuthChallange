import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export async function loadSessionUser(context: Context, sessionUuid: string): Promise<any> {
  const secureAuthChallangeSessionKV = context.env.secure_auth_challange_session;
  const sessionInfoJson = await secureAuthChallangeSessionKV.get(sessionUuid);
  if (!sessionInfoJson) {
    throw new HTTPException(401, { message: 'Session Expired' });
  }
  const sessionInfo = JSON.parse(sessionInfoJson);
  const secureAuthChallangeUserKV = context.env.secure_auth_challange_user;
  const userInfoJson = await secureAuthChallangeUserKV.get(sessionInfo.userEmail);
  if (!userInfoJson) {
    throw new HTTPException(401, { message: 'User Not Exist' });
  }
  return JSON.parse(userInfoJson);
}
