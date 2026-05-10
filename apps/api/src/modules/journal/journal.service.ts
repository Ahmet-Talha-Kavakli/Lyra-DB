import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { NotebookService } from '../notebook/notebook.service';

@Injectable()
export class JournalService {
  constructor(
    private prisma: PrismaService,
    private notebooks: NotebookService,
  ) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    if (!clerkId) throw new NotFoundException('clerkId required');
    const user = await this.prisma.user.upsert({
      where:  { clerkId },
      create: { clerkId },
      update: {},
      select: { id: true },
    });
    return user.id;
  }

  /** Bir notebook'un kullanıcıya ait olduğunu doğrula. */
  private async assertNotebookOwnership(userId: string, notebookId: string) {
    const nb = await this.prisma.notebook.findUnique({ where: { id: notebookId } });
    if (!nb || nb.userId !== userId) {
      throw new NotFoundException('Notebook not found');
    }
    return nb;
  }

  /** Tek bir defterin tüm entries'i (eskiden tüm kullanıcının entries'iydi). */
  async list(clerkId: string, notebookId: string) {
    const userId = await this.resolveUserId(clerkId);
    await this.assertNotebookOwnership(userId, notebookId);
    return this.prisma.journalEntry.findMany({
      where:   { notebookId },
      orderBy: { entryDate: 'desc' },
      select:  { id: true, entryDate: true, content: true },
    });
  }

  async getByDate(clerkId: string, notebookId: string, date: string) {
    const userId = await this.resolveUserId(clerkId);
    await this.assertNotebookOwnership(userId, notebookId);
    return this.prisma.journalEntry.findUnique({
      where: { notebookId_entryDate: { notebookId, entryDate: new Date(date) } },
    });
  }

  /**
   * Session bağlamı için: yalnızca aiAccessible=true olan defterlerin son N
   * entries'ini getir. Secret defter buraya gelmez.
   */
  async getRecentEntries(clerkId: string, limit = 5) {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return [];
    return this.prisma.journalEntry.findMany({
      where: {
        userId,
        content:  { not: '' },
        notebook: { aiAccessible: true },
      },
      orderBy: { entryDate: 'desc' },
      take:    limit,
      select:  {
        entryDate: true,
        content:   true,
        notebook:  { select: { name: true } },
      },
    });
  }

  /**
   * Belirli bir defterin son N entries'ini getir. Ownership + aiAccessible
   * doğrulaması yapar; defter erişime kapalıysa boş döner (sessizce).
   */
  async getRecentEntriesForNotebook(clerkId: string, notebookId: string, limit = 3) {
    const userId = await this.resolveUserId(clerkId).catch(() => null);
    if (!userId) return [];
    const nb = await this.prisma.notebook.findUnique({
      where:  { id: notebookId },
      select: { userId: true, aiAccessible: true },
    });
    if (!nb || nb.userId !== userId || !nb.aiAccessible) return [];
    return this.prisma.journalEntry.findMany({
      where:   { notebookId, content: { not: '' } },
      orderBy: { entryDate: 'desc' },
      take:    limit,
      select:  { entryDate: true, content: true },
    });
  }

  async upsert(clerkId: string, notebookId: string, date: string, content: string) {
    const userId = await this.resolveUserId(clerkId);
    await this.assertNotebookOwnership(userId, notebookId);
    if (!date) throw new BadRequestException('date required');
    const entryDate = new Date(date);
    return this.prisma.journalEntry.upsert({
      where:  { notebookId_entryDate: { notebookId, entryDate } },
      create: { userId, notebookId, entryDate, content },
      update: { content },
    });
  }
}
