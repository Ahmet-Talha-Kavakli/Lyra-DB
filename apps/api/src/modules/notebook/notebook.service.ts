import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';

const MAX_CUSTOM_NOTEBOOKS = 3;
const VALID_THEMES = [
  // Açık paletler
  'sunshine', 'azure', 'forest', 'amber', 'violet', 'rose', 'ivory',
  // Koyu paletler
  'midnight', 'charcoal', 'crimson', 'pine', 'walnut', 'obsidian',
];
const VALID_SILHOUETTES = ['classic', 'arched', 'pointed'];
const VALID_THICKNESS = ['slim', 'thick'];

@Injectable()
export class NotebookService {
  constructor(private prisma: PrismaService) {}

  /**
   * Clerk ID'den DB user.id çöz; yoksa otomatik oluştur.
   * Webhook bağlanana kadar mobil/web istemcisi her isteğinde implicit
   * user create eder. Idempotent (upsert).
   */
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

  /**
   * Sistem defterlerini bootstrap et — her kullanıcının "Journal" (standard)
   * ve "Secret" (private) defterleri olmalı. Yoksa oluştur.
   * Idempotent — defalarca çağrılabilir.
   */
  async bootstrapSystemNotebooks(userId: string) {
    const existing = await this.prisma.notebook.findMany({
      where: { userId, notebookType: { in: ['standard', 'private'] } },
      select: { notebookType: true },
    });
    const has = new Set(existing.map((n) => n.notebookType));

    const toCreate = [];
    if (!has.has('standard')) {
      toCreate.push({
        userId,
        notebookType: 'standard',
        name: 'Journal',
        themeId: 'amber',
        thicknessId: 'thick',
        silhouette: 'classic',
        locked: false,
        aiAccessible: true,
      });
    }
    if (!has.has('private')) {
      toCreate.push({
        userId,
        notebookType: 'private',
        name: 'Secret',
        themeId: 'azure',
        thicknessId: 'thick',
        silhouette: 'arched',
        locked: true,
        aiAccessible: false,
      });
    }
    if (toCreate.length > 0) {
      await this.prisma.notebook.createMany({ data: toCreate });
    }
  }

  async list(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    await this.bootstrapSystemNotebooks(userId);
    return this.prisma.notebook.findMany({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    clerkId: string,
    input: {
      name: string;
      themeId: string;
      silhouette: string;
      aiAccessible: boolean;
      thicknessId?: string;
    },
  ) {
    const userId = await this.resolveUserId(clerkId);

    if (!input.name || input.name.trim().length === 0) {
      throw new BadRequestException('Defter ismi boş olamaz');
    }
    if (!VALID_THEMES.includes(input.themeId)) {
      throw new BadRequestException('Geçersiz tema');
    }
    if (!VALID_SILHOUETTES.includes(input.silhouette)) {
      throw new BadRequestException('Geçersiz silüet');
    }
    const thickness = input.thicknessId ?? 'thick';
    if (!VALID_THICKNESS.includes(thickness)) {
      throw new BadRequestException('Geçersiz kalınlık');
    }

    // Custom defter limiti
    const customCount = await this.prisma.notebook.count({
      where: { userId, notebookType: 'custom' },
    });
    if (customCount >= MAX_CUSTOM_NOTEBOOKS) {
      throw new BadRequestException(
        `En fazla ${MAX_CUSTOM_NOTEBOOKS} custom defter eklenebilir`,
      );
    }

    return this.prisma.notebook.create({
      data: {
        userId,
        notebookType: 'custom',
        name: input.name.trim().slice(0, 20),
        themeId: input.themeId,
        thicknessId: thickness,
        silhouette: input.silhouette,
        locked: false,
        aiAccessible: input.aiAccessible,
      },
    });
  }

  async update(
    clerkId: string,
    notebookId: string,
    patch: { name?: string; themeId?: string; thicknessId?: string },
  ) {
    const userId = await this.resolveUserId(clerkId);
    const notebook = await this.prisma.notebook.findUnique({
      where: { id: notebookId },
    });
    if (!notebook || notebook.userId !== userId) {
      throw new NotFoundException('Defter bulunamadı');
    }

    // Sistem defterleri rename edilemez (sadece tema değişebilir)
    const updates: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      if (notebook.notebookType !== 'custom') {
        throw new ForbiddenException('Sistem defteri yeniden adlandırılamaz');
      }
      const trimmed = patch.name.trim();
      if (trimmed.length === 0) {
        throw new BadRequestException('Defter ismi boş olamaz');
      }
      updates.name = trimmed.slice(0, 20);
    }
    if (patch.themeId !== undefined) {
      if (!VALID_THEMES.includes(patch.themeId)) {
        throw new BadRequestException('Geçersiz tema');
      }
      updates.themeId = patch.themeId;
    }
    if (patch.thicknessId !== undefined) {
      if (!VALID_THICKNESS.includes(patch.thicknessId)) {
        throw new BadRequestException('Geçersiz kalınlık');
      }
      updates.thicknessId = patch.thicknessId;
    }

    return this.prisma.notebook.update({
      where: { id: notebookId },
      data:  updates,
    });
  }

  async delete(clerkId: string, notebookId: string) {
    const userId = await this.resolveUserId(clerkId);
    const notebook = await this.prisma.notebook.findUnique({
      where: { id: notebookId },
    });
    if (!notebook || notebook.userId !== userId) {
      throw new NotFoundException('Defter bulunamadı');
    }
    if (notebook.notebookType !== 'custom') {
      throw new ForbiddenException('Sistem defteri silinemez');
    }

    // Cascade — entries de silinir (FK onDelete: Cascade)
    await this.prisma.notebook.delete({ where: { id: notebookId } });
    return { ok: true };
  }
}
