import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExcelService } from './excel.service';
import { MailService } from '../mail/mail.service';
import type { Invitation, User } from '@prisma/client';

type InvWithUser = Invitation & { user?: User | null };

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private excel: ExcelService,
    private mail: MailService,
  ) {}

  private names(json: string) {
    try {
      const c = JSON.parse(json);
      return (
        `${c.couple?.partner1?.name ?? ''} & ${c.couple?.partner2?.name ?? ''}`.trim() ||
        'Wedding'
      );
    } catch {
      return 'Wedding';
    }
  }

  private async ownedOrThrow(id: string, userId: string, asAdmin = false): Promise<InvWithUser> {
    const inv = await this.prisma.invitation.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!inv || (!asAdmin && inv.userId !== userId))
      throw new NotFoundException('Invitation not found');
    return inv;
  }

  private async buildXlsx(inv: InvWithUser) {
    const rsvps = await this.prisma.rsvp.findMany({
      where: { invitationId: inv.id },
      orderBy: { createdAt: 'asc' },
    });
    const title = this.names(inv.contentJson);
    const buffer = await this.excel.rsvpWorkbook(title, rsvps);
    const filename = `${inv.slug || inv.id}-rsvps.xlsx`;
    return { buffer, filename, title, count: rsvps.length };
  }

  /** Owner-authenticated download (admins can export any invitation). */
  async download(id: string, userId: string, asAdmin = false) {
    const inv = await this.ownedOrThrow(id, userId, asAdmin);
    return this.buildXlsx(inv);
  }

  /** Email the export. If userId is given, ownership is enforced (manual send);
   *  without it (system / cron) it sends for the given invitation. */
  async emailById(id: string, userId?: string, asAdmin = false) {
    const inv = userId
      ? await this.ownedOrThrow(id, userId, asAdmin)
      : await this.prisma.invitation.findUnique({
          where: { id },
          include: { user: true },
        });
    if (!inv) throw new NotFoundException('Invitation not found');

    const recipient = inv.ownerEmail || inv.user?.email;
    if (!recipient)
      throw new BadRequestException('No recipient email set for this invitation');

    const { buffer, filename, title, count } = await this.buildXlsx(inv);
    const result = await this.mail.send({
      to: recipient,
      subject: `RSVP attendee list — ${title}`,
      text: `Here is the RSVP attendee list for ${title} (${count} response${count === 1 ? '' : 's'}). The full list is attached as an Excel file.`,
      attachments: [{ filename, content: buffer }],
    });
    return { ...result, count, filename, title };
  }
}
