/**
 * Guest RSVP confirmation emails — the single source of truth for both the
 * real send (RsvpService) and the Studio's live preview endpoint.
 *
 * Couples customize subject / heading / message per outcome in the Studio
 * (content.guestEmails); everything else — couple photo, date, venue block
 * with per-event directions, invitation button, unsubscribe footer — is
 * composed here on a fixed, email-safe layout (600px table, inline styles)
 * so it renders correctly in Gmail / Outlook / Apple Mail.
 *
 * `{guest}` and `{names}` placeholders in custom texts are replaced with the
 * guest's name and the couple's names.
 */

type Dict = Record<string, unknown>;

export interface GuestEmailInput {
  /** InvitationContent (parsed) */
  content: Dict;
  guestName: string;
  attending: 'accept' | 'decline';
  guests?: number;
  /** public site origin, e.g. https://webinvite.co — used to absolutize photo/links */
  origin: string;
  /** invitation slug for the "View invitation" button (omit to hide it) */
  slug?: string;
  /** one-click unsubscribe URL (omit to hide the footer link) */
  unsubscribeUrl?: string;
  /** keep data: photo URLs (browser preview only — email clients strip them) */
  allowDataUrls?: boolean;
}

export interface GuestEmail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const get = (o: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v as Dict | undefined)?.[k], o);

const str = (o: unknown, path: string): string => {
  const v = get(o, path);
  return typeof v === 'string' ? v.trim() : '';
};

function coupleNames(content: Dict): string {
  const p1 = str(content, 'couple.partner1.name');
  const p2 = str(content, 'couple.partner2.name');
  return p1 && p2 ? `${p1} & ${p2}` : p1 || p2 || 'The couple';
}

/** Absolute, email-client-safe image URL (or null when there's none usable). */
function photoUrl(content: Dict, origin: string, allowDataUrls: boolean): string | null {
  const items = get(content, 'story.items');
  const first = Array.isArray(items)
    ? (items.find((it) => typeof (it as Dict)?.photo === 'string' && (it as Dict).photo) as Dict | undefined)
    : undefined;
  const raw = str(content, 'guestEmails.photo') || ((first?.photo as string) ?? '');
  if (!raw) return null;
  if (raw.startsWith('data:')) return allowDataUrls ? raw : null;
  if (/^https?:\/\//.test(raw)) return raw;
  if (raw.startsWith('/')) return `${origin}${raw}`;
  return null;
}

interface EventRow {
  name: string;
  when: string;
  venue: string;
  directions?: string;
}

/** Schedule events with a directions link each (pasted map link wins). */
function eventRows(content: Dict, max = 5): EventRow[] {
  const events = get(content, 'schedule.events');
  if (!Array.isArray(events)) return [];
  return (events as Dict[]).slice(0, max).map((e) => {
    const venue = [str(e, 'venue'), str(e, 'address')].filter(Boolean).join(', ');
    const mapUrl = str(e, 'mapUrl');
    const directions = mapUrl
      ? mapUrl
      : venue
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`
        : undefined;
    return {
      name: str(e, 'name') || 'Celebration',
      when: [str(e, 'date'), str(e, 'time')].filter(Boolean).join(' · '),
      venue,
      directions,
    };
  });
}

const fill = (tpl: string, guest: string, names: string) =>
  tpl.replace(/\{guest\}/gi, guest).replace(/\{names\}/gi, names);

/* palette — matches the product's default look, safe on white */
const C = { bg: '#f2efe9', card: '#fffdf8', text: '#3d4658', primary: '#2b3a67', accent: '#b08d57', muted: '#8b93a5' };

export function buildGuestEmail(input: GuestEmailInput): GuestEmail {
  const { content, guestName, attending, origin } = input;
  const names = coupleNames(content);
  const coming = attending === 'accept';
  const custom = (get(content, `guestEmails.${attending}`) ?? {}) as Dict;

  const subject = fill(
    (custom.subject as string)?.trim() ||
      (coming ? `You're on the guest list — ${names}` : `Thank you for letting us know — ${names}`),
    guestName,
    names,
  );
  const heading = fill(
    (custom.heading as string)?.trim() || (coming ? "We can't wait to celebrate with you!" : "We'll miss you"),
    guestName,
    names,
  );
  const message = fill(
    (custom.message as string)?.trim() ||
      (coming
        ? `Dear {guest}, thank you for accepting our invitation — it means the world to us. Here is everything you need for the big day.`
        : `Dear {guest}, thank you for letting us know. We're sad you can't be with us, but we truly appreciate you taking the time — you'll be in our hearts on the day.`),
    guestName,
    names,
  );

  const photo = photoUrl(content, origin, Boolean(input.allowDataUrls));
  const date = str(content, 'dateReveal.eventDate');
  const location = str(content, 'dateReveal.location');
  const events = coming ? eventRows(content) : [];
  const inviteUrl = input.slug ? `${origin}/i/${input.slug}` : '';

  /* ------------------------------- HTML ------------------------------- */
  const eventsHtml = events
    .map(
      (e) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #ece6da;">
            <p style="margin:0;font-size:14px;font-weight:bold;color:${C.primary};">${esc(e.name)}${e.when ? ` <span style="font-weight:normal;color:${C.muted};">· ${esc(e.when)}</span>` : ''}</p>
            ${e.venue ? `<p style="margin:2px 0 0;font-size:13px;color:${C.text};">${esc(e.venue)}${e.directions ? ` &nbsp;·&nbsp; <a href="${esc(e.directions)}" style="color:${C.accent};">Get directions</a>` : ''}</p>` : ''}
          </td>
        </tr>`,
    )
    .join('');

  const venueCard =
    coming && (date || location || events.length)
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-radius:12px;margin:22px 0 0;">
        <tr><td style="padding:18px 22px;">
          ${date ? `<p style="margin:0;font-size:18px;color:${C.primary};font-weight:bold;">${esc(date)}</p>` : ''}
          ${location ? `<p style="margin:4px 0 0;font-size:14px;color:${C.text};">${esc(location)}</p>` : ''}
          ${eventsHtml ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">${eventsHtml}</table>` : ''}
        </td></tr>
      </table>`
      : '';

  const html = `
<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border-radius:16px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;">
        ${photo ? `<tr><td><img src="${esc(photo)}" alt="" width="600" style="display:block;width:100%;max-height:340px;object-fit:cover;" /></td></tr>` : ''}
        <tr><td style="padding:30px 34px 34px;">
          <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.accent};">${esc(names)}</p>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;color:${C.primary};font-weight:normal;">${esc(heading)}</h1>
          <p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:${C.text};">${esc(message)}</p>
          ${venueCard}
          ${
            inviteUrl
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 0;"><tr><td style="border-radius:999px;background:${C.primary};">
                   <a href="${esc(inviteUrl)}" style="display:inline-block;padding:12px 30px;font-size:13px;letter-spacing:1px;color:#ffffff;text-decoration:none;">View the invitation</a>
                 </td></tr></table>`
              : ''
          }
          <p style="margin:28px 0 0;font-size:16px;font-style:italic;color:${C.accent};text-align:center;">With love, ${esc(names)}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:${C.muted};font-family:Arial,sans-serif;">
        You received this because you responded to ${esc(names)}'s wedding invitation.${
          input.unsubscribeUrl
            ? ` <a href="${esc(input.unsubscribeUrl)}" style="color:${C.muted};">Unsubscribe from updates</a>`
            : ''
        }
      </p>
    </td></tr>
  </table>
</body></html>`;

  /* ------------------------------- text ------------------------------- */
  const text = [
    heading,
    '',
    message,
    ...(coming && (date || location) ? ['', [date, location].filter(Boolean).join(' — ')] : []),
    ...events.flatMap((e) => [
      '',
      `${e.name}${e.when ? ` · ${e.when}` : ''}`,
      e.venue ? `  ${e.venue}` : '',
      e.directions ? `  Directions: ${e.directions}` : '',
    ]).filter(Boolean),
    ...(inviteUrl ? ['', `View the invitation: ${inviteUrl}`] : []),
    '',
    `With love, ${names}`,
    ...(input.unsubscribeUrl ? ['', `Unsubscribe from updates: ${input.unsubscribeUrl}`] : []),
  ].join('\n');

  return { subject, html, text };
}
