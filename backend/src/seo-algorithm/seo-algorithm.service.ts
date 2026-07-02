import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { SeoAlgorithm, SeoAlgorithmVersion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { DEFAULT_LEARNING_MEMORY, DEFAULT_SEO_ALGORITHM } from './seo-algorithm.defaults';
import type { AlgoFrequency, SaveSeoAlgorithmDto } from './seo-algorithm.dto';

/** Singleton row id — there is only one SEO algorithm config for the site. */
const CONFIG_ID = 'seo-algo-1';

export type SeoAlgorithmSourceLabel =
  | 'manual'
  | 'ai-improve'
  | 'schedule'
  | 'restore'
  | 'reset';

export type SeoAlgorithmDto = {
  algorithm: string;
  learningMemory: string;
  autoImprove: boolean;
  frequency: AlgoFrequency;
  versionsToKeep: number;
  lastRunAt: string | null;
  lastRunNote: string | null;
  currentVersionId: string | null;
  updatedAt: string | null;
  versions: SeoAlgorithmVersionDto[];
};

export type SeoAlgorithmVersionDto = {
  id: string;
  createdAt: string;
  source: SeoAlgorithmSourceLabel;
  avgAuditScore: number | null;
  isCurrent: boolean;
  /** Present only when the caller asks for one specific version. */
  algorithm?: string;
  learningMemory?: string;
};

@Injectable()
export class SeoAlgorithmService {
  private readonly logger = new Logger(SeoAlgorithmService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
  ) {}

  /* ------------------------------- reads --------------------------------- */

  /** Full state used by the admin tab (config + version list + current text). */
  async getAll(): Promise<SeoAlgorithmDto> {
    const config = await this.ensureConfig();
    const current = await this.ensureCurrentVersion();
    const versions = await this.prisma.seoAlgorithmVersion.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, createdAt: true, source: true, avgAuditScore: true, isCurrent: true },
    });
    return {
      algorithm: current.algorithm,
      learningMemory: current.learningMemory,
      autoImprove: config.autoImprove,
      frequency: this.frequency(config),
      versionsToKeep: config.versionsToKeep,
      lastRunAt: config.lastRunAt?.toISOString() ?? null,
      lastRunNote: config.lastRunNote,
      currentVersionId: current.id,
      updatedAt: config.updatedAt?.toISOString() ?? null,
      versions: versions.map((v) => this.versionSummaryDto(v)),
    };
  }

  /** Get one archived version's full text — used by the "load into editor" flow. */
  async getVersion(id: string): Promise<SeoAlgorithmVersionDto> {
    const v = await this.prisma.seoAlgorithmVersion.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Version not found');
    return this.versionFullDto(v);
  }

  /* ------------------------------ writes --------------------------------- */

  /**
   * Save partial config + optionally the algorithm/memory text. When either
   * text field changes vs the current version, a new version is archived and
   * the previous "current" is unmarked. Prunes old versions past
   * `versionsToKeep`.
   */
  async update(input: SaveSeoAlgorithmDto, source: SeoAlgorithmSourceLabel = 'manual'): Promise<SeoAlgorithmDto> {
    const config = await this.ensureConfig();
    const current = await this.ensureCurrentVersion();

    const nextAlgo = input.algorithm !== undefined ? input.algorithm : current.algorithm;
    const nextMemory = input.learningMemory !== undefined ? input.learningMemory : current.learningMemory;
    const textChanged =
      nextAlgo.trim() !== current.algorithm.trim() ||
      nextMemory.trim() !== current.learningMemory.trim();

    // Config patch — only fields present in the payload move.
    const configPatch: Partial<Pick<SeoAlgorithm, 'autoImprove' | 'frequency' | 'versionsToKeep'>> = {};
    if (input.autoImprove !== undefined) configPatch.autoImprove = input.autoImprove;
    if (input.frequency !== undefined) configPatch.frequency = input.frequency;
    if (input.versionsToKeep !== undefined) configPatch.versionsToKeep = input.versionsToKeep;
    if (Object.keys(configPatch).length) {
      await this.prisma.seoAlgorithm.update({ where: { id: config.id }, data: configPatch });
    }

    if (textChanged) {
      await this.createVersion(nextAlgo, nextMemory, source);
    }

    return this.getAll();
  }

  /** Revert the algorithm text to the built-in default (archives as a new version). */
  async resetToDefault(): Promise<SeoAlgorithmDto> {
    await this.createVersion(DEFAULT_SEO_ALGORITHM, DEFAULT_LEARNING_MEMORY, 'reset');
    return this.getAll();
  }

  /**
   * Restore a previous version — copies its algorithm + memory into a new
   * "current" version (source = restore). We create a new row rather than
   * flipping isCurrent on the old one so the audit trail stays linear.
   */
  async restoreVersion(id: string): Promise<SeoAlgorithmDto> {
    const v = await this.prisma.seoAlgorithmVersion.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Version not found');
    if (v.isCurrent) return this.getAll();
    await this.createVersion(v.algorithm, v.learningMemory, 'restore');
    return this.getAll();
  }

  /**
   * Run one improvement now. Sends the current algorithm + memory to Claude
   * and archives whatever comes back as the new current version. Marks
   * `lastRunAt` regardless of the source label (manual button vs cron).
   */
  async runImprovement(source: 'manual' | 'schedule' = 'manual'): Promise<{
    algorithm: string;
    learningMemory: string;
    rationale: string;
    dto: SeoAlgorithmDto;
  }> {
    const current = await this.ensureCurrentVersion();
    const scoresSample = (
      await this.prisma.seoAlgorithmVersion.findMany({
        where: { avgAuditScore: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { avgAuditScore: true },
      })
    )
      .map((r) => r.avgAuditScore ?? 0)
      .filter((n) => n > 0);

    const improved = await this.ai.improveSeoAlgorithm({
      current: current.algorithm,
      memory: current.learningMemory,
      scoresSample,
    });

    await this.createVersion(
      improved.algorithm,
      improved.learningMemory,
      source === 'schedule' ? 'schedule' : 'ai-improve',
    );
    await this.prisma.seoAlgorithm.update({
      where: { id: CONFIG_ID },
      data: {
        lastRunAt: new Date(),
        lastRunNote: source === 'schedule' ? 'Auto-scheduled run' : 'Manual run',
      },
    });
    return { ...improved, dto: await this.getAll() };
  }

  /**
   * Only improve the algorithm/memory text — DON'T archive it yet. Powers the
   * "Improve editor text with AI" button, which returns a candidate the admin
   * can review and Save (which then archives via update()).
   */
  async improveDraft(): Promise<{ algorithm: string; learningMemory: string; rationale: string }> {
    const current = await this.ensureCurrentVersion();
    return this.ai.improveSeoAlgorithm({
      current: current.algorithm,
      memory: current.learningMemory,
    });
  }

  /* ------------------------------ cron ----------------------------------- */

  /** Runs hourly and triggers an improvement when the configured cadence is due. */
  @Cron('0 * * * *')
  async cronTick() {
    try {
      const config = await this.ensureConfig();
      if (!config.autoImprove) return;
      if (!(await this.ai.isConfigured())) return;
      if (!this.isDue(config)) return;
      this.logger.log(`Auto-improve triggered (${this.frequency(config)}).`);
      await this.runImprovement('schedule');
    } catch (e) {
      this.logger.error(`Auto-improve failed: ${(e as Error).message}`);
    }
  }

  /* ------------------------------ helpers -------------------------------- */

  /**
   * Insert a new version row, unmark the previous current, prune old ones
   * past `versionsToKeep`. Single small transaction so a partial failure
   * doesn't leave two "current" rows.
   */
  private async createVersion(algorithm: string, learningMemory: string, source: SeoAlgorithmSourceLabel) {
    const config = await this.ensureConfig();
    await this.prisma.$transaction(async (tx) => {
      await tx.seoAlgorithmVersion.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false },
      });
      await tx.seoAlgorithmVersion.create({
        data: {
          algorithm,
          learningMemory,
          source,
          isCurrent: true,
        },
      });
      // Prune anything past the retention window (keeps the current one).
      const keep = Math.max(5, Math.min(365, config.versionsToKeep));
      const survivors = await tx.seoAlgorithmVersion.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true },
        take: keep,
      });
      const survivorIds = new Set(survivors.map((s) => s.id));
      const allIds = await tx.seoAlgorithmVersion.findMany({ select: { id: true } });
      const toDelete = allIds.filter((r) => !survivorIds.has(r.id)).map((r) => r.id);
      if (toDelete.length) {
        await tx.seoAlgorithmVersion.deleteMany({ where: { id: { in: toDelete } } });
      }
    });
  }

  private isDue(config: SeoAlgorithm): boolean {
    if (!config.lastRunAt) return true;
    const now = Date.now();
    const last = config.lastRunAt.getTime();
    const day = 24 * 60 * 60 * 1000;
    switch (this.frequency(config)) {
      case 'daily':
        return now - last >= day - 60_000;
      case 'weekly':
        return now - last >= 7 * day - 5 * 60_000;
      case 'monthly':
        return now - last >= 30 * day - 30 * 60_000;
    }
  }

  private frequency(config: SeoAlgorithm): AlgoFrequency {
    return (config.frequency === 'daily' || config.frequency === 'monthly'
      ? config.frequency
      : 'weekly') as AlgoFrequency;
  }

  /** Get-or-create the singleton config row. */
  private async ensureConfig(): Promise<SeoAlgorithm> {
    const row = await this.prisma.seoAlgorithm.findUnique({ where: { id: CONFIG_ID } });
    if (row) return row;
    return this.prisma.seoAlgorithm.create({
      data: { id: CONFIG_ID },
    });
  }

  /** Get the current version, seeding a v1 from defaults on first use. */
  private async ensureCurrentVersion(): Promise<SeoAlgorithmVersion> {
    const current = await this.prisma.seoAlgorithmVersion.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: 'desc' },
    });
    if (current) return current;
    return this.prisma.seoAlgorithmVersion.create({
      data: {
        algorithm: DEFAULT_SEO_ALGORITHM,
        learningMemory: DEFAULT_LEARNING_MEMORY,
        source: 'manual',
        isCurrent: true,
      },
    });
  }

  private versionSummaryDto(
    v: Pick<SeoAlgorithmVersion, 'id' | 'createdAt' | 'source' | 'avgAuditScore' | 'isCurrent'>,
  ): SeoAlgorithmVersionDto {
    return {
      id: v.id,
      createdAt: v.createdAt.toISOString(),
      source: this.sourceLabel(v.source),
      avgAuditScore: v.avgAuditScore,
      isCurrent: v.isCurrent,
    };
  }

  private versionFullDto(v: SeoAlgorithmVersion): SeoAlgorithmVersionDto {
    return {
      ...this.versionSummaryDto(v),
      algorithm: v.algorithm,
      learningMemory: v.learningMemory,
    };
  }

  private sourceLabel(source: string): SeoAlgorithmSourceLabel {
    switch (source) {
      case 'ai-improve':
      case 'schedule':
      case 'restore':
      case 'reset':
      case 'manual':
        return source;
      default:
        return 'manual';
    }
  }

}
