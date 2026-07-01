import { Controller, Get } from '@nestjs/common';
import { IntegrationsService } from './secrets/integrations.service';

@Controller()
export class AppController {
  constructor(private integrations: IntegrationsService) {}

  @Get('health')
  health() {
    return { ok: true, service: 'wedding-invite-api' };
  }

  /** Public, non-secret runtime config for the frontend (GA4 measurement id). */
  @Get('public/config')
  async config() {
    return { ga4Id: (await this.integrations.getGaMeasurementId()) || null };
  }
}
