import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InvitationsModule } from './invitations/invitations.module';
import { RsvpModule } from './rsvp/rsvp.module';
import { AdminModule } from './admin/admin.module';
import { MailModule } from './mail/mail.module';
import { ExportModule } from './export/export.module';
import { UploadsModule } from './uploads/uploads.module';
import { DesignsModule } from './designs/designs.module';
import { TracksModule } from './tracks/tracks.module';
import { ContentModule } from './content/content.module';
import { AiModule } from './ai/ai.module';
import { SeoModule } from './seo/seo.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SecretsModule } from './secrets/secrets.module';
import { IntegrationsModule } from './secrets/integrations.module';
import { SiteSettingsModule } from './site-settings/site-settings.module';
import { ContactModule } from './contact/contact.module';
import { SeoAlgorithmModule } from './seo-algorithm/seo-algorithm.module';
import { ExpiryService } from './tasks/expiry.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SecretsModule,
    PrismaModule,
    AuthModule,
    InvitationsModule,
    RsvpModule,
    AdminModule,
    MailModule,
    ExportModule,
    UploadsModule,
    DesignsModule,
    TracksModule,
    ContentModule,
    AiModule,
    SeoModule,
    AnalyticsModule,
    IntegrationsModule,
    SiteSettingsModule,
    ContactModule,
    SeoAlgorithmModule,
  ],
  controllers: [AppController],
  providers: [ExpiryService],
})
export class AppModule {}
