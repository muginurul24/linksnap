export const SIGN_OUT_CALLBACK_URL = "/";

type ClientSignOut = (options: { callbackUrl: string }) => unknown;

export function signOutToLanding(signOutClient: ClientSignOut): unknown {
  return signOutClient({ callbackUrl: SIGN_OUT_CALLBACK_URL });
}
