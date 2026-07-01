import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsService } from '../settings/settings.service';

export interface MailAttachment {
  filename: string;
  content: Buffer;
}

interface ResolvedMailConfig {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  live: boolean;
}

/**
 * Sends email via SMTP. The "from" address and SMTP credentials are configured
 * by an admin in the panel (stored in Settings) and fall back to .env values.
 * When no SMTP host is configured (or sending is disabled) it runs in DEV mode:
 * nothing is sent over the network — the message is logged and any attachment is
 * written to backend/exports/ so you can open exactly what would have been sent.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private cached?: { sig: string; transporter: nodemailer.Transporter };

  constructor(
    private config: ConfigService,
    private settings: SettingsService,
  ) {}

  /** Merge DB settings over .env defaults into a concrete mail config. */
  async resolveConfig(): Promise<ResolvedMailConfig> {
    const s = await this.settings
      .getAll()
      .catch(() => ({}) as Record<string, string>);

    const host = s['mail.smtpHost'] || this.config.get<string>('SMTP_HOST') || undefined;
    const port = Number(s['mail.smtpPort'] || this.config.get('SMTP_PORT') || 587);
    const user = s['mail.smtpUser'] || this.config.get<string>('SMTP_USER') || undefined;
    const pass = s['mail.smtpPass'] || this.config.get<string>('SMTP_PASS') || undefined;

    const fromEmail = s['mail.fromEmail'] || this.config.get<string>('MAIL_FROM_EMAIL') || '';
    const fromName = s['mail.fromName'] || this.config.get<string>('MAIL_FROM_NAME') || 'Eternal';
    const from = fromEmail
      ? `${fromName} <${fromEmail}>`
      : this.config.get<string>('MAIL_FROM') || 'Eternal <no-reply@eternal.local>';

    // sending is "live" when an SMTP host exists and the admin hasn't disabled it
    const disabled = s['mail.enabled'] === 'false';
    const live = Boolean(host) && !disabled;

    return { host, port, user, pass, from, live };
  }

  private transporterFor(cfg: ResolvedMailConfig): nodemailer.Transporter {
    if (!cfg.live || !cfg.host) {
      return nodemailer.createTransport({ jsonTransport: true });
    }
    const sig = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.pass}`;
    if (this.cached?.sig !== sig) {
      this.cached = {
        sig,
        transporter: nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.port === 465,
          auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        }),
      };
    }
    return this.cached.transporter;
  }

  async send(opts: {
    to: string;
    subject: string;
    text: string;
    attachments?: MailAttachment[];
  }): Promise<{ sent: boolean; recipient: string; savedTo?: string }> {
    const cfg = await this.resolveConfig();
    const transporter = this.transporterFor(cfg);

    let savedTo: string | undefined;
    if (!cfg.live && opts.attachments?.length) {
      const dir = path.join(process.cwd(), 'exports');
      fs.mkdirSync(dir, { recursive: true });
      for (const a of opts.attachments) {
        const p = path.join(dir, a.filename);
        fs.writeFileSync(p, a.content);
        savedTo = p;
      }
    }

    await transporter.sendMail({ from: cfg.from, ...opts });

    if (cfg.live) {
      this.logger.log(`Email sent to ${opts.to}: "${opts.subject}" (from ${cfg.from})`);
    } else {
      this.logger.warn(
        `[DEV] Email NOT sent (SMTP not configured / disabled). To: ${opts.to} · "${opts.subject}"` +
          (savedTo ? ` · attachment saved to ${savedTo}` : ''),
      );
    }

    return { sent: cfg.live, recipient: opts.to, savedTo };
  }

  /** Send a one-off test message; never throws — returns a structured result. */
  async sendTest(
    to: string,
  ): Promise<{ ok: boolean; live: boolean; from: string; error?: string }> {
    const cfg = await this.resolveConfig();
    try {
      await this.send({
        to,
        subject: 'Test email from your invitation site',
        text:
          'This is a test message confirming your outgoing-email settings work. ' +
          `If you received this, notifications will be sent from ${cfg.from}.`,
      });
      return { ok: true, live: cfg.live, from: cfg.from };
    } catch (e) {
      return { ok: false, live: cfg.live, from: cfg.from, error: (e as Error).message };
    }
  }
}
