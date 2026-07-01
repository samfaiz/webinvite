import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { IntegrationsService, type UpdateIntegrationsDto } from './integrations.service';
import { AiService } from '../ai/ai.service';
import { GaService } from '../analytics/ga.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards';
import { Roles } from '../auth/auth.decorators';

@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class IntegrationsController {
  constructor(
    private svc: IntegrationsService,
    private ai: AiService,
    private ga: GaService,
  ) {}

  /** Current config with secrets masked (never returns raw keys). */
  @Get()
  get() {
    return this.svc.getStatus();
  }

  @Put()
  update(@Body() dto: UpdateIntegrationsDto) {
    return this.svc.update(dto);
  }

  @Post('test-ai')
  testAi() {
    return this.ai.ping();
  }

  @Post('test-ga')
  testGa() {
    return this.ga.test();
  }
}
