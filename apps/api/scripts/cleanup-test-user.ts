/**
 * One-off: delete the fake user created by Clerk's "Send Example" webhook test.
 * That user_id is in the form `user_2` etc (Clerk demo prefix). Real signups
 * use longer ids with random suffixes.
 *
 * Cascade deletes (Prisma onDelete) clear notebooks/sessions/journal/etc.
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    // Clerk test event uses clerkId starting with "user_2" (a stable demo id).
    // Real users have ids like "user_3..." (current Clerk format with random hash).
    const testUsers = await prisma.user.findMany({
      where: { clerkId: { startsWith: 'user_2' } },
      select: { id: true, clerkId: true },
    });

    if (testUsers.length === 0) {
      console.log('No test users found.');
      return;
    }

    console.log(`Found ${testUsers.length} test user(s):`);
    testUsers.forEach((u) => console.log(`  ${u.clerkId} (${u.id})`));

    for (const u of testUsers) {
      await prisma.user.delete({ where: { id: u.id } });
      console.log(`  ✓ deleted ${u.clerkId}`);
    }

    console.log('Done.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
