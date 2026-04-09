import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class JournalService {
  constructor(private prisma: PrismaService) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new Error('User not found');
    return user.id;
  }

  async list(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { entryDate: 'desc' },
      select: { id: true, entryDate: true, content: true },
    });
  }

  async getByDate(clerkId: string, date: string) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.journalEntry.findUnique({
      where: { userId_entryDate: { userId, entryDate: new Date(date) } },
    });
  }

  async upsert(clerkId: string, date: string, content: string) {
    const userId = await this.resolveUserId(clerkId);
    const entryDate = new Date(date);
    return this.prisma.journalEntry.upsert({
      where: { userId_entryDate: { userId, entryDate } },
      create: { userId, entryDate, content },
      update: { content },
    });
  }
}
