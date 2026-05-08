import {
  createMobileAccessToken,
  createMobileRefreshToken,
  hashMobileRefreshToken,
} from "@/lib/auth/mobile-token";
import {
  saveMobileRefreshTokenHash,
  type MobileAuthUser,
} from "@/lib/db/queries/mobile-auth";

export type MobileSessionPayload = {
  refreshToken: string;
  token: string;
  user: {
    avatarUrl: string | null;
    email: string;
    emailVerified: boolean;
    id: string;
    name: string | null;
    plan: MobileAuthUser["plan"];
    role: string;
  };
};

export function formatMobileUser(user: MobileAuthUser): MobileSessionPayload["user"] {
  return {
    avatarUrl: user.avatarUrl,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    id: user.id,
    name: user.name,
    plan: user.plan,
    role: user.role,
  };
}

export async function createMobileSession(
  user: MobileAuthUser,
): Promise<MobileSessionPayload> {
  const refreshToken = createMobileRefreshToken();
  const refreshTokenHash = hashMobileRefreshToken(refreshToken);
  const saved = await saveMobileRefreshTokenHash({
    refreshTokenHash,
    userId: user.id,
  });

  if (!saved) {
    throw new Error("Unable to save mobile refresh token.");
  }

  return {
    refreshToken,
    token: createMobileAccessToken(user),
    user: formatMobileUser(user),
  };
}
