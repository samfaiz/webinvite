import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ExportService } from '../export/export.service';

/**
 * Hourly: finds published invitations past their expiry date, emails the final
 * RSVP attendee list to the owner, then marks them expired.
 */
@Injectable()
export class ExpiryService {
  private readonly logger = new Logger(ExpiryService.name);

  constructor(
    private prisma: PrismaService,
    private exportService: ExportService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async expireOldInvitations() {
    const due = await this.prisma.invitation.findMany({
      where: { status: 'published', expiryDate: { lt: new Date() } },
    });

    for (const inv of due) {
      try {
        await this.exportService.emailById(inv.id);
      } catch (e) {
        this.logger.error(
          `RSVP export email failed for ${inv.id}: ${(e as Error).message}`,
        );
      }
      await this.prisma.invitation.update({
        where: { id: inv.id },
        data: { status: 'expired' },
      });
    }

    if (due.length) {
      this.logger.log(
        `Expired ${due.length} invitation(s); emailed RSVP list to owners`,
      );
    }
  }
}
