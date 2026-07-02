import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';
import { SaveSeoAlgorithmDto } from './seo-algorithm.dto';
import { SeoAlgorithmService } from './seo-algorithm.service';

@Controller('admin/seo-algorithm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SeoAlgorithmController {
  constructor(private svc: SeoAlgorithmService) {}

  /** Current config + text + version list. */
  @Get()
  getAll() {
    return this.svc.getAll();
  }

  /** Save partial config + optionally the algorithm/memory text. Creates a
   *  new version when the text changed. */
  @Put()
  update(@Body() body: SaveSeoAlgorithmDto) {
    return this.svc.update(body, 'manual');
  }

  /** Wipe back to the built-in default (archives as a new version). */
  @Post('reset-to-default')
  reset() {
    return this.svc.resetToDefault();
  }

  /** AI-improve WITHOUT saving — the admin reviews before Save. */
  @Post('improve-draft')
  improveDraft() {
    return this.svc.improveDraft();
  }

  /** Run an improvement now, save it as the new current version. */
  @Post('run-now')
  runNow() {
    return this.svc.runImprovement('manual');
  }

  /** Full text of a specific version (for the "load into editor" flow). */
  @Get('versions/:id')
  getVersion(@Param('id') id: string) {
    return this.svc.getVersion(id);
  }

  /** Restore a specific version — copies its text into a new current version. */
  @Post('versions/:id/restore')
  restore(@Param('id') id: string) {
    return this.svc.restoreVersion(id);
  }
}
