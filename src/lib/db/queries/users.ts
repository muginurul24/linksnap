import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type UserVerificationStatus = {
  emailVerified: Date | null;
  id: string;
};

export async function findUserVerificationStatusById(
  userId: string,
): Promise<UserVerificationStatus | null> {
  const user = await db.query.users.findFirst({
    columns: {
      emailVerified: true,
      id: true,
    },
    where: eq(users.id, userId),
  });

  return user ?? null;
}
