import { Global, Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { CryptoService } from './crypto.service';
import { IntegrationsService } from './integrations.service';

/** Global so any service can resolve integration config / encrypt secrets. */
@Global()
@Module({
  imports: [SettingsModule],
  providers: [CryptoService, IntegrationsService],
  exports: [CryptoService, IntegrationsService],
})
export class SecretsModule {}
