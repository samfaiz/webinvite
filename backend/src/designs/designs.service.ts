import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveDesignDto } from './designs.dto';
import type { Design } from '@prisma/client';

@Injectable()
export class DesignsService {
  constructor(private prisma: PrismaService) {}

  private toDto(d: Design) {
    return {
      id: d.id,
      name: d.name,
      community: d.community,
      templateId: d.templateId,
      colors: JSON.parse(d.colorsJson),
      fonts: JSON.parse(d.fontsJson),
      particles: JSON.parse(d.particlesJson),
      backgrounds: JSON.parse(d.backgroundsJson),
      previewUrl: d.previewUrl,
      active: d.active,
      createdAt: d.createdAt,
    };
  }

  private data(dto: SaveDesignDto) {
    return {
      name: dto.name,
      community: dto.community,
      templateId: dto.templateId,
      colorsJson: JSON.stringify(dto.colors),
      fontsJson: JSON.stringify(dto.fonts),
      particlesJson: JSON.stringify(dto.particles),
      backgroundsJson: JSON.stringify(dto.backgrounds),
      previewUrl: dto.previewUrl,
      active: dto.active ?? true,
    };
  }

  async create(dto: SaveDesignDto) {
    return this.toDto(await this.prisma.design.create({ data: this.data(dto) }));
  }

  async update(id: string, dto: SaveDesignDto) {
    const exists = await this.prisma.design.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Design not found');
    return this.toDto(
      await this.prisma.design.update({ where: { id }, data: this.data(dto) }),
    );
  }

  async remove(id: string) {
    await this.prisma.design.delete({ where: { id } });
    return { ok: true };
  }

  async listAll() {
    const rows = await this.prisma.design.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((d) => this.toDto(d));
  }

  async listActive() {
    const rows = await this.prisma.design.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((d) => this.toDto(d));
  }

  async getOne(id: string) {
    const d = await this.prisma.design.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Design not found');
    return this.toDto(d);
  }
}
