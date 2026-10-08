import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Invitation } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';
import { applyOps, ROOTS } from './ops';

function toDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The agent API: read and change any invitation from a script, the way an
 * admin can in the Studio. Every change first saves the invitation as it
 * was (InvitationRevision), so it can be undone, a delete included.
 */
@Injectable()
export class AgentService {
  private readonly logger = new Logger('AgentAPI');

  constructor(
    private prisma: PrismaService,
    private invitations: InvitationsService,
  ) {}

  /* ------------------------------ reading ------------------------------ */

  /** An invitation by its id or its slug. */
  private async resolve(ref: string): Promise<Invitation> {
    const inv =
      (await this.prisma.invitation.findUnique({ where: { id: ref } })) ??
      (await this.prisma.invitation.findUnique({ where: { slug: ref } }));
    if (!inv) throw new NotFoundException(`No invitation "${ref}"`);
    return inv;
  }

  private names(contentJson: string) {
    try {
      const c = JSON.parse(contentJson) as {
        couple?: { partner1?: { name?: string }; partner2?: { name?: string } };
      };
      return `${c.couple?.partner1?.name ?? ''} & ${c.couple?.partner2?.name ?? ''}`;
    } catch {
      return '';
    }
  }

  async list(q?: string) {
    const rows = await this.prisma.invitation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { email: true } },
        _count: { select: { rsvps: true } },
      },
    });
    const needle = q?.trim().toLowerCase();
    return rows
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        status: r.status,
        templateId: r.templateId,
        names: this.names(r.contentJson),
        owner: r.user.email,
        rsvps: r._count.rsvps,
        eventDate: r.eventDate,
        updatedAt: r.updatedAt,
      }))
      .filter(
        (r) =>
          !needle ||
          [r.slug, r.names, r.owner, r.id].some((x) =>
            (x ?? '').toLowerCase().includes(needle),
          ),
      );
  }

  private shape(inv: Invitation & { user?: { email: string } }) {
    return {
      id: inv.id,
      slug: inv.slug,
      status: inv.status,
      url: inv.slug ? `/i/${inv.slug}` : null,
      templateId: inv.templateId,
      themeId: inv.themeId,
      motifId: inv.motifId,
      ownerEmail: inv.ownerEmail,
      owner: inv.user?.email,
      theme: JSON.parse(inv.themeJson) as unknown,
      content: JSON.parse(inv.contentJson) as unknown,
      eventDate: inv.eventDate,
      expiryDate: inv.expiryDate,
      views: inv.views,
      publishedAt: inv.publishedAt,
      updatedAt: inv.updatedAt,
    };
  }

  async get(ref: string) {
    const inv = await this.resolve(ref);
    const user = await this.prisma.user.findUnique({
      where: { id: inv.userId },
      select: { email: true },
    });
    return this.shape({ ...inv, user: user ?? undefined });
  }

  /* ----------------------------- revisions ----------------------------- */

  private async snapshot(
    inv: Invitation,
    action: string,
    note?: string,
    extra?: Record<string, unknown>,
  ) {
    return this.prisma.invitationRevision.create({
      data: {
        invitationId: inv.id,
        slug: inv.slug,
        action,
        note: note?.slice(0, 500) || null,
        snapshotJson: JSON.stringify({ ...inv, ...extra }),
      },
      select: { id: true },
    });
  }

  async revisions(ref: string) {
    // by the invitation's id when it exists (copies taken while it was still a
    // draft have no slug); a deleted one's are still found by its old slug
    const live =
      (await this.prisma.invitation.findUnique({
        where: { id: ref },
        select: { id: true },
      })) ??
      (await this.prisma.invitation.findUnique({
        where: { slug: ref },
        select: { id: true },
      }));
    const ids = [ref, ...(live ? [live.id] : [])];
    const rows = await this.prisma.invitationRevision.findMany({
      where: { OR: [{ invitationId: { in: ids } }, { slug: ref }] },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invitationId: true,
        slug: true,
        action: true,
        note: true,
        createdAt: true,
      },
      take: 100,
    });
    return rows;
  }

  /** Puts an invitation back as it was in a revision; recreates it (and its
   *  RSVPs) if it was deleted. The current state is saved first. */
  async restore(revisionId: string) {
    const rev = await this.prisma.invitationRevision.findUnique({
      where: { id: revisionId },
    });
    if (!rev) throw new NotFoundException('No such revision');
    const snap = JSON.parse(rev.snapshotJson) as Invitation & {
      rsvps?: Record<string, unknown>[];
    };
    const fields = {
      templateId: snap.templateId,
      themeId: snap.themeId,
      motifId: snap.motifId,
      themeJson: snap.themeJson,
      contentJson: snap.contentJson,
      status: snap.status,
      ownerEmail: snap.ownerEmail,
      eventDate: snap.eventDate ? new Date(snap.eventDate) : null,
      expiryDate: snap.expiryDate ? new Date(snap.expiryDate) : null,
      publishedAt: snap.publishedAt ? new Date(snap.publishedAt) : null,
    };
    const current = await this.prisma.invitation.findUnique({
      where: { id: snap.id },
    });
    if (current) {
      await this.snapshot(
        current,
        'restore',
        `before restoring revision ${rev.id}`,
      );
      const updated = await this.prisma.invitation.update({
        where: { id: snap.id },
        data: fields,
      });
      this.logger.log(`restore ${rev.id} → ${updated.slug ?? updated.id}`);
      return this.shape(updated);
    }
    if (
      snap.slug &&
      (await this.prisma.invitation.findUnique({ where: { slug: snap.slug } }))
    ) {
      throw new ConflictException(
        `The address "${snap.slug}" is taken by another invitation now`,
      );
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: snap.userId },
    });
    if (!owner)
      throw new ConflictException(
        "The invitation's owner account no longer exists",
      );
    const created = await this.prisma.invitation.create({
      data: {
        id: snap.id,
        userId: snap.userId,
        slug: snap.slug,
        views: snap.views ?? 0,
        ...fields,
      },
    });
    for (const r of snap.rsvps ?? []) {
      await this.prisma.rsvp.create({
        data: {
          ...(r as object),
          invitationId: snap.id,
          createdAt: r.createdAt
            ? new Date(r.createdAt as string | number | Date)
            : undefined,
        } as never,
      });
    }
    this.logger.log(
      `restore ${rev.id} → recreated ${created.slug ?? created.id} with ${snap.rsvps?.length ?? 0} RSVPs`,
    );
    return this.shape(created);
  }

  /* ------------------------------ changing ------------------------------ */

  /** The editable parts of a row, as one object the ops address. */
  private doc(inv: Invitation): Record<string, unknown> {
    return {
      content: JSON.parse(inv.contentJson) as unknown,
      theme: JSON.parse(inv.themeJson) as unknown,
      templateId: inv.templateId,
      themeId: inv.themeId,
      motifId: inv.motifId,
      ownerEmail: inv.ownerEmail,
    };
  }

  /** Back to columns, keeping a published invitation's slug and its content's
   *  slug in step (the RSVP form posts to the content's), and the event and
   *  expiry dates derived from the content as the Studio does. */
  private columns(inv: Invitation, doc: Record<string, unknown>) {
    if (!isObject(doc.content))
      throw new BadRequestException('"content" must stay an object');
    if (!isObject(doc.theme))
      throw new BadRequestException('"theme" must stay an object');
    for (const k of ['templateId', 'themeId', 'motifId'] as const) {
      if (typeof doc[k] !== 'string' || !doc[k].trim())
        throw new BadRequestException(`"${k}" must be text`);
    }
    const content = doc.content as Record<string, unknown> & {
      countdown?: { targetDate?: unknown };
      expiry?: { expiresAt?: unknown };
    };
    if (inv.slug)
      content.meta = {
        ...(isObject(content.meta) ? content.meta : {}),
        slug: inv.slug,
      };
    return {
      contentJson: JSON.stringify(content),
      themeJson: JSON.stringify(doc.theme),
      templateId: doc.templateId as string,
      themeId: doc.themeId as string,
      motifId: doc.motifId as string,
      ownerEmail: typeof doc.ownerEmail === 'string' ? doc.ownerEmail : null,
      eventDate: toDate(content?.countdown?.targetDate),
      expiryDate: toDate(content?.expiry?.expiresAt),
    };
  }

  /** Small edits by path. With `dryRun`, nothing is saved: the result is
   *  returned to look at first. */
  async patch(
    ref: string,
    body: { ops?: unknown; note?: string; dryRun?: boolean },
  ) {
    const inv = await this.resolve(ref);
    const doc = this.doc(inv);
    const touched = applyOps(doc, body?.ops);
    const data = this.columns(inv, doc);
    if (body?.dryRun)
      return { dryRun: true, touched, result: this.shape({ ...inv, ...data }) };
    const rev = await this.snapshot(inv, 'update', body?.note);
    const updated = await this.prisma.invitation.update({
      where: { id: inv.id },
      data,
    });
    this.logger.log(
      `update ${updated.slug ?? updated.id}: ${touched.join(', ')}`,
    );
    return { touched, revision: rev.id, result: this.shape(updated) };
  }

  /** Replaces whole parts at once: any of content, theme, templateId,
   *  themeId, motifId, ownerEmail. */
  async replace(ref: string, body: Record<string, unknown>) {
    const inv = await this.resolve(ref);
    const doc = this.doc(inv);
    const given = Object.keys(body ?? {}).filter((k) =>
      (ROOTS as readonly string[]).includes(k),
    );
    if (!given.length)
      throw new BadRequestException(`Send any of: ${ROOTS.join(', ')}`);
    for (const k of given) doc[k] = body[k];
    const data = this.columns(inv, doc);
    if (body?.dryRun)
      return {
        dryRun: true,
        replaced: given,
        result: this.shape({ ...inv, ...data }),
      };
    const rev = await this.snapshot(
      inv,
      'replace',
      typeof body.note === 'string' ? body.note : undefined,
    );
    const updated = await this.prisma.invitation.update({
      where: { id: inv.id },
      data,
    });
    this.logger.log(
      `replace ${updated.slug ?? updated.id}: ${given.join(', ')}`,
    );
    return { replaced: given, revision: rev.id, result: this.shape(updated) };
  }

  /** A new draft for an existing account: copied from another invitation
   *  (`copyFrom`), or from the parts given. Publish it separately. */
  async create(body: Record<string, any>) {
    const email = String(body?.ownerEmail ?? '')
      .trim()
      .toLowerCase();
    if (!email)
      throw new BadRequestException(
        '"ownerEmail" (an existing account) is required',
      );
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user)
      throw new NotFoundException(`No account with the email ${email}`);
    const base = body.copyFrom
      ? this.doc(await this.resolve(String(body.copyFrom)))
      : {};
    const doc: Record<string, unknown> = { ...base };
    for (const k of ROOTS) if (k in (body ?? {})) doc[k] = body[k];
    doc.ownerEmail =
      typeof doc.ownerEmail === 'string' ? doc.ownerEmail : email;
    if (isObject(doc.content)) {
      const meta = doc.content.meta;
      doc.content = {
        ...doc.content,
        meta: {
          ...(isObject(meta) ? meta : {}),
          slug: String(body.slug ?? ''),
        },
      };
    }
    const data = this.columns({ slug: null } as Invitation, doc);
    const created = await this.prisma.invitation.create({
      data: { userId: user.id, status: 'draft', ...data },
    });
    this.logger.log(
      `create draft ${created.id} for ${email}${body.copyFrom ? ` from ${body.copyFrom}` : ''}`,
    );
    return this.shape(created);
  }

  async publish(ref: string) {
    const inv = await this.resolve(ref);
    await this.snapshot(inv, 'publish');
    const out = await this.invitations.publish('agent', inv.id, true);
    this.logger.log(`publish ${out.slug}`);
    return out;
  }

  async unpublish(ref: string) {
    const inv = await this.resolve(ref);
    await this.snapshot(inv, 'unpublish');
    const out = await this.invitations.unpublish('agent', inv.id, true);
    this.logger.log(`unpublish ${inv.slug ?? inv.id}`);
    return out;
  }

  /** Deletes an invitation and its RSVPs, only when `confirm` repeats its
   *  slug (or id). Everything is saved first, so `restore` brings it back. */
  async remove(ref: string, confirm?: string) {
    const inv = await this.resolve(ref);
    if (!confirm || (confirm !== inv.slug && confirm !== inv.id)) {
      throw new BadRequestException(
        `To delete, send ?confirm=${inv.slug ?? inv.id}`,
      );
    }
    const rsvps = await this.prisma.rsvp.findMany({
      where: { invitationId: inv.id },
    });
    const rev = await this.snapshot(inv, 'delete', undefined, { rsvps });
    await this.prisma.invitation.delete({ where: { id: inv.id } });
    this.logger.warn(
      `delete ${inv.slug ?? inv.id} (${rsvps.length} RSVPs) — revision ${rev.id}`,
    );
    return {
      ok: true,
      deleted: inv.slug ?? inv.id,
      rsvps: rsvps.length,
      revision: rev.id,
    };
  }
}
