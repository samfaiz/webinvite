import { Controller, Get } from '@nestjs/common';
import { IntegrationsService } from './secrets/integrations.service';
import { SiteSettingsService } from './site-settings/site-settings.service';

@Controller()
export class AppController {
  constructor(
    private integrations: IntegrationsService,
    private siteSettings: SiteSettingsService,
  ) {}

  @Get('health')
  health() {
    return { ok: true, service: 'wedding-invite-api' };
  }

  /** Public, non-secret runtime config for the frontend (GA4 measurement id
   *  + Meta Pixel id). Anything that must not be secret can live here. */
  @Get('public/config')
  async config() {
    const [gaId, s] = await Promise.all([
      this.integrations.getGaMeasurementId(),
      this.siteSettings.getAll(),
    ]);
    return {
      ga4Id: gaId || null,
      metaPixelId: s.seo.metaPixelId || null,
    };
  }
}
