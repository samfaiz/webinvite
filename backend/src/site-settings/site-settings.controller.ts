import { Body, Controller, Delete, Get, Post, Put, UseGuards } from '@nestjs/common';
import { SiteSettingsService } from './site-settings.service';
import { SaveSiteSettingsDto } from './site-settings.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class SiteSettingsController {
  constructor(private svc: SiteSettingsService) {}

  /** Public — brand name, logos, favicon. Cached-friendly. */
  @Get('site-settings/public')
  publicSettings() {
    return this.svc.getPublic();
  }

  /* ------------------------------- admin ------------------------------- */

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/site-settings')
  getAll() {
    return this.svc.getAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/site-settings')
  update(@Body() body: SaveSiteSettingsDto) {
    return this.svc.update(body);
  }

  /** POST alias so browser fetch()s without a body can still trigger a reset. */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/site-settings/reset')
  reset() {
    return this.svc.reset();
  }

  /** DELETE variant (semantic match for the "Delete" button in the UI). */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/site-settings')
  deleteAll() {
    return this.svc.reset();
  }
}
