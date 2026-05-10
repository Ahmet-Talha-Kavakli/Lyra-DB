import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, clerkId: true, email: true },
    });
    console.log(`\n=== USERS (${users.length}) ===`);
    users.forEach((u) => console.log(`  ${u.clerkId} | ${u.email ?? '(no email)'} | id=${u.id}`));

    const notebooks = await prisma.notebook.findMany({
      orderBy: [{ userId: 'asc' }, { createdAt: 'asc' }],
    });
    console.log(`\n=== NOTEBOOKS (${notebooks.length}) ===`);
    notebooks.forEach((n) =>
      console.log(`  user=${n.userId.slice(0, 8)} | ${n.notebookType.padEnd(8)} | ${n.name.padEnd(20)} | theme=${n.themeId} | id=${n.id}`),
    );

    const entries = await prisma.journalEntry.findMany({
      select: { id: true, userId: true, notebookId: true, entryDate: true, content: true },
      orderBy: { entryDate: 'desc' },
    });
    console.log(`\n=== JOURNAL ENTRIES (${entries.length}) ===`);
    entries.forEach((e) =>
      console.log(`  ${e.entryDate.toISOString().split('T')[0]} | nb=${e.notebookId.slice(0, 8)} | ${e.content.slice(0, 50)}`),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
