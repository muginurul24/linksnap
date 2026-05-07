import { randomBytes } from "node:crypto";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/redis";

const CHALLENGE_TTL_SECONDS = 5 * 60;

export type TwoFactorChallengeKind = "password" | "two_factor";

export type TwoFactorChallenge = {
  kind: TwoFactorChallengeKind;
  userId: string;
};

function getChallengeKey(challengeId: string): string {
  return `auth:2fa:challenge:${challengeId}`;
}

export async function createTwoFactorChallenge(
  challenge: TwoFactorChallenge,
): Promise<string> {
  const challengeId = randomBytes(32).toString("hex");
  await cacheSet(getChallengeKey(challengeId), challenge, CHALLENGE_TTL_SECONDS);
  return challengeId;
}

export async function getTwoFactorChallenge(
  challengeId: string,
): Promise<TwoFactorChallenge | null> {
  if (!/^[a-f0-9]{64}$/i.test(challengeId)) return null;
  return cacheGet<TwoFactorChallenge>(getChallengeKey(challengeId));
}

export async function deleteTwoFactorChallenge(
  challengeId: string,
): Promise<void> {
  if (!/^[a-f0-9]{64}$/i.test(challengeId)) return;
  await cacheDelete(getChallengeKey(challengeId));
}
