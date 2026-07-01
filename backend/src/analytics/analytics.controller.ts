import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller()
export class AnalyticsController {
  constructor(private svc: AnalyticsService) {}

  /** Public tracking beacon — called by the client on each public pageview. */
  @Post('analytics/collect')
  @HttpCode(204)
  async collect(@Req() req: Request, @Body() body: { path?: string; referrer?: string }) {
    await this.svc.collect({
      ip: req.ip || '',
      ua: (req.headers['user-agent'] as string) || '',
      path: body?.path || '',
      referrer: body?.referrer,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/analytics/summary')
  summary(@Query('days') days?: string) {
    return this.svc.summary(days ? parseInt(days, 10) : 30);
  }
}
