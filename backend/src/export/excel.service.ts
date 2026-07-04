import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type { Rsvp } from '@prisma/client';

@Injectable()
export class ExcelService {
  /** Build an .xlsx attendee sheet for a set of RSVPs. */
  async rsvpWorkbook(title: string, rsvps: Rsvp[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Eternal';
    const ws = wb.addWorksheet('RSVPs');

    ws.columns = [
      { header: 'Guest Name', key: 'guestName', width: 30 },
      { header: 'Response', key: 'attending', width: 14 },
      { header: 'Guests', key: 'guests', width: 10 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Updates', key: 'subscribed', width: 10 },
      { header: 'Message', key: 'message', width: 45 },
      { header: 'Responded At', key: 'createdAt', width: 24 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2B3A67' },
    };
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    let accepting = 0;
    let headcount = 0;
    for (const r of rsvps) {
      if (r.attending === 'accept') {
        accepting += 1;
        headcount += r.guests;
      }
      ws.addRow({
        guestName: r.guestName,
        attending: r.attending === 'accept' ? 'Accepting' : 'Declining',
        guests: r.guests,
        email: r.email || '',
        subscribed: r.email ? (r.subscribed ? 'Yes' : 'No') : '',
        message: r.message || '',
        createdAt: new Date(r.createdAt).toLocaleString(),
      });
    }

    ws.addRow({});
    const summary = ws.addRow({
      guestName: `${title}`,
      attending: `${accepting} accepting`,
      guests: headcount,
      message: `${rsvps.length - accepting} declining`,
    });
    summary.font = { italic: true };

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
