/**
 * One-shot cleanup for the dev Bloom state hosed by the old upsertLog logic.
 * Restores lastPeriodStart to the user's onboarding value (13 April 2026)
 * and clears all period_logs so the user can start fresh from a known-good state.
 *
 * Run with: pnpm --filter @ai-therapist/api exec tsx scripts/cleanup-bloom-state.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RESTORE_LAST_PERIOD_START = new Date('2026-04-13T00:00:00.000Z');

async function main() {
  const profiles = await prisma.cycleProfile.findMany({
    include: { user: { select: { email: true, clerkId: true } } },
  });

  console.log(`Found ${profiles.length} cycle profile(s):\n`);

  for (const p of profiles) {
    const logs = await prisma.periodLog.findMany({
      where: { userId: p.userId },
      orderBy: { logDate: 'asc' },
    });

    console.log(`User: ${p.user?.email ?? p.userId}`);
    console.log(`  before: lastPeriodStart=${p.lastPeriodStart?.toISOString().slice(0, 10) ?? 'null'}, logs=${logs.length}`);

    const deleted = await prisma.periodLog.deleteMany({ where: { userId: p.userId } });
    await prisma.cycleProfile.update({
      where: { userId: p.userId },
      data: { lastPeriodStart: RESTORE_LAST_PERIOD_START },
    });

    console.log(`  after:  lastPeriodStart=${RESTORE_LAST_PERIOD_START.toISOString().slice(0, 10)}, deleted ${deleted.count} log(s)\n`);
  }

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
