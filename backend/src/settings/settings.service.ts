import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Flat key→value settings store backed by the Setting table. Used for
 * admin-configurable app config (currently the outgoing-email setup).
 */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** All settings as a plain map. */
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async get(key: string): Promise<string | null> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value ?? null;
  }

  /** Upsert each provided entry. `undefined` values are skipped (left as-is). */
  async setMany(entries: Record<string, string | undefined | null>): Promise<void> {
    const ops = Object.entries(entries)
      .filter(([, v]) => v !== undefined)
      .map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value: value ?? '' },
          create: { key, value: value ?? '' },
        }),
      );
    await this.prisma.$transaction(ops);
  }
}
