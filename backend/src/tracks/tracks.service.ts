import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SaveTrackDto } from './tracks.dto';

/** Royalty-free sample tracks seeded once so the library isn't empty. Swap these
 *  for properly licensed wedding music in the admin Music screen. */
const SEED: { title: string; mood: string; url: string }[] = [
  {
    title: "Can't Help Falling in Love",
    mood: 'Romantic',
    url: '/music/cant-help-falling-in-love.mp3',
  },
  {
    title: 'Romantic Piano (sample)',
    mood: 'Romantic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  },
  {
    title: 'Acoustic Morning (sample)',
    mood: 'Acoustic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    title: 'Cinematic Strings (sample)',
    mood: 'Cinematic',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
  },
];

@Injectable()
export class TracksService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private settings: SettingsService,
  ) {}

  /** Seed sample tracks once (guarded by a flag so deleting them all won't
   *  re-create them on restart). */
  async onModuleInit() {
    const seeded = await this.settings.get('tracks.seeded').catch(() => null);
    if (seeded === 'true') return;
    const count = await this.prisma.track.count().catch(() => -1);
    if (count === 0) {
      await this.prisma.track.createMany({ data: SEED });
    }
    if (count >= 0) await this.settings.setMany({ 'tracks.seeded': 'true' });
  }

  listActive() {
    return this.prisma.track.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAll() {
    return this.prisma.track.findMany({ orderBy: { createdAt: 'desc' } });
  }

  create(dto: SaveTrackDto) {
    return this.prisma.track.create({
      data: {
        title: dto.title,
        mood: dto.mood,
        url: dto.url,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: SaveTrackDto) {
    const exists = await this.prisma.track.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Track not found');
    return this.prisma.track.update({
      where: { id },
      data: {
        title: dto.title,
        mood: dto.mood,
        url: dto.url,
        active: dto.active ?? exists.active,
      },
    });
  }

  async remove(id: string) {
    await this.prisma.track.delete({ where: { id } });
    return { ok: true };
  }
}
