/**
 * Manual notebook migration runner.
 * Executes prisma/migrations/manual-add-notebooks.sql against DATABASE_URL.
 * Idempotent — safe to re-run.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function main() {
  const sqlPath = resolve(__dirname, '../prisma/migrations/manual-add-notebooks.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Strip BEGIN/COMMIT (Prisma manages its own transactions). Then strip line
  // comments (--) since they confuse the simple `;` splitter. Split on `;` at
  // end of statement; our SQL has no dollar-quoted blocks so this is safe.
  const cleaned = sql
    .replace(/^\s*BEGIN\s*;\s*$/gim, '')
    .replace(/^\s*COMMIT\s*;\s*$/gim, '')
    .split('\n')
    .map((line) => {
      // Strip line comments (-- to end of line), but preserve quoted strings.
      const idx = line.indexOf('--');
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join('\n');

  const statements = cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const prisma = new PrismaClient();
  try {
    console.log(`Running ${statements.length} statements...`);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 80);
      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('OK');
      } catch (e) {
        console.log('FAIL');
        console.error('Statement:', stmt);
        throw e;
      }
    }
    console.log('Migration applied successfully.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
