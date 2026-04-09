import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class MoodService {
  constructor(private prisma: PrismaService) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { clerkId } });
    if (!user) throw new Error('User not found');
    return user.id;
  }

  async log(clerkId: string, score: number) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.moodLog.create({ data: { userId, score } });
  }

  async history(clerkId: string, days: number) {
    const userId = await this.resolveUserId(clerkId);
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.moodLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'asc' },
      select: { score: true, loggedAt: true },
    });
  }
}
