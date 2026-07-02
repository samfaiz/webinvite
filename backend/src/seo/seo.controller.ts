import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SeoService } from './seo.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller('admin/seo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SeoController {
  constructor(private svc: SeoService) {}

  @Get('status')
  status() {
    return this.svc.status();
  }

  @Get('proposals')
  proposals(@Query('status') status?: string) {
    return this.svc.listProposals(status || 'pending');
  }

  @Get('insights')
  insights(@Query('days') days?: string) {
    return this.svc.insights(days ? parseInt(days, 10) : 30);
  }

  @Post('audit')
  audit() {
    return this.svc.runAudit();
  }

  @Post('content/:id/suggest')
  suggest(@Param('id') id: string) {
    return this.svc.suggest(id);
  }

  @Post('content/:id/optimise-all')
  optimiseAll(@Param('id') id: string) {
    return this.svc.optimiseAll(id);
  }

  @Post('content/:id/faqs')
  faqs(@Param('id') id: string, @Body() body?: { count?: number }) {
    return this.svc.generateFaqs(id, body?.count);
  }

  @Post('content/:id/propose')
  propose(@Param('id') id: string) {
    return this.svc.proposeForContent(id, 'manual');
  }

  @Get('content/:id/memory')
  memory(@Param('id') id: string) {
    return this.svc.getMemory(id);
  }

  @Post('proposals/:id/approve')
  approve(@Param('id') id: string) {
    return this.svc.approve(id);
  }

  @Post('proposals/:id/reject')
  reject(@Param('id') id: string) {
    return this.svc.reject(id);
  }

  @Post('blog-draft')
  blogDraft(@Body() body: { topic: string; keywords?: string[] }) {
    return this.svc.generateBlogDraft(body?.topic, body?.keywords);
  }
}
