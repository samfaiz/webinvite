/**
 * The couple's "new RSVP" alert: sent the moment a guest accepts or declines,
 * with everything the guest gave (name, answer, party size, meal, message,
 * email) and the running totals. Same email-safe layout as the guest emails
 * (600px table, inline styles).
 */

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const C = { bg: '#f2efe9', card: '#fffdf8', text: '#3d4658', primary: '#2b3a67', accent: '#b08d57', muted: '#8b93a5', yes: '#2f7a4f', no: '#a43d4f' };

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** The addresses an invitation's alerts go to: its "Your email" field (one
 *  or more, separated by commas), else the account's email. */
export function alertRecipients(ownerEmail?: string | null, accountEmail?: string | null): string[] {
  const pick = (s?: string | null) => [
    ...new Set(
      (s ?? '')
        .split(/[,;\s]+/)
        .map((x) => x.trim())
        .filter((x) => EMAIL.test(x)),
    ),
  ];
  const own = pick(ownerEmail);
  return own.length ? own : pick(accountEmail);
}

export interface OwnerAlertInput {
  names: string;
  guestName: string;
  attending: 'accept' | 'decline';
  guests?: number;
  meal?: string;
  message?: string;
  email?: string;
  totals: { accepted: number; declined: number; headcount: number; meals: { label: string; count: number }[] };
  /** absolute links (omit to hide the buttons) */
  inviteUrl?: string;
  dashboardUrl?: string;
}

export function buildOwnerAlert(i: OwnerAlertInput): { subject: string; html: string; text: string } {
  const coming = i.attending === 'accept';
  const answer = coming ? 'Joyfully accepts' : 'Regretfully declines';
  const subject = `RSVP: ${i.guestName} ${coming ? 'is coming 🎉' : "can't make it"} — ${i.names}`;

  const rows: [string, string, boolean?][] = [
    ['Guest', esc(i.guestName)],
    ['Answer', `<span style="font-weight:bold;color:${coming ? C.yes : C.no};">${coming ? '✔' : '✖'} ${answer}</span>`],
  ];
  if (coming) rows.push(['Guests', `${i.guests ?? 1} ${(i.guests ?? 1) === 1 ? 'person' : 'people'}`]);
  if (coming && i.meal) rows.push(['Meal', esc(i.meal)]);
  if (i.email) rows.push(['Email', `<a href="mailto:${esc(i.email)}" style="color:${C.primary};">${esc(i.email)}</a>`]);
  if (i.message) rows.push(['Message', `<em>“${esc(i.message).replace(/\n/g, '<br />')}”</em>`, true]);

  const rowHtml = rows
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #ece6da;width:110px;vertical-align:top;font-size:13px;color:${C.muted};font-family:Arial,sans-serif;">${k}</td>
          <td style="padding:10px 0;border-top:1px solid #ece6da;font-size:16px;line-height:1.5;color:${C.text};">${v}</td>
        </tr>`,
    )
    .join('');

  const stat = (n: number | string, label: string) => `
          <td align="center" style="padding:8px 4px;">
            <p style="margin:0;font-size:24px;color:${C.primary};font-weight:bold;">${n}</p>
            <p style="margin:2px 0 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${C.muted};font-family:Arial,sans-serif;">${label}</p>
          </td>`;
  const meals = i.totals.meals.filter((m) => m.count > 0);

  const button = (href: string, label: string, solid: boolean) => `
          <td style="padding:4px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:999px;background:${solid ? C.primary : C.card};border:1px solid ${C.primary};">
            <a href="${esc(href)}" style="display:inline-block;padding:11px 24px;font-size:13px;letter-spacing:1px;color:${solid ? '#ffffff' : C.primary};text-decoration:none;font-family:Arial,sans-serif;">${label}</a>
          </td></tr></table></td>`;
  const buttons = [
    i.dashboardUrl ? button(i.dashboardUrl, 'See all replies', true) : '',
    i.inviteUrl ? button(i.inviteUrl, 'Open the invitation', false) : '',
  ].join('');

  const html = `
<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${C.card};border-radius:16px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;">
        <tr><td style="height:6px;background:${coming ? C.yes : C.no};"></td></tr>
        <tr><td style="padding:28px 32px 30px;">
          <p style="margin:0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${C.accent};">${esc(i.names)} · New RSVP</p>
          <h1 style="margin:10px 0 0;font-size:26px;line-height:1.25;color:${C.primary};font-weight:normal;">${esc(i.guestName)} ${coming ? 'is coming!' : "can't make it"}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">${rowHtml}
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};border-radius:12px;margin:22px 0 0;">
            <tr><td style="padding:14px 10px 6px;">
              <p style="margin:0 0 4px;text-align:center;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.accent};font-family:Arial,sans-serif;">Replies so far</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                ${stat(i.totals.accepted, 'Coming')}${stat(i.totals.headcount, 'Total guests')}${stat(i.totals.declined, 'Not coming')}
              </tr></table>
              ${meals.length ? `<p style="margin:4px 0 8px;text-align:center;font-size:13px;color:${C.text};">${meals.map((m) => `${esc(m.label)}: ${m.count}`).join(' &nbsp;·&nbsp; ')}</p>` : ''}
            </td></tr>
          </table>
          ${buttons ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px auto 0;"><tr>${buttons}</tr></table>` : ''}
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:11px;color:${C.muted};font-family:Arial,sans-serif;">
        You get this because your email is set for RSVP alerts on your invitation.${i.email ? ' Reply to this email to write to the guest.' : ''}
      </p>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `${i.guestName} ${coming ? 'is coming!' : "can't make it"} (${i.names})`,
    '',
    `Answer: ${answer}`,
    coming ? `Guests: ${i.guests ?? 1}` : '',
    coming && i.meal ? `Meal: ${i.meal}` : '',
    i.email ? `Email: ${i.email}` : '',
    i.message ? `Message: “${i.message}”` : '',
    '',
    `Replies so far — coming: ${i.totals.accepted} (total guests ${i.totals.headcount}), not coming: ${i.totals.declined}.`,
    meals.length ? meals.map((m) => `${m.label}: ${m.count}`).join(' · ') : '',
    i.dashboardUrl ? `See all replies: ${i.dashboardUrl}` : '',
    i.inviteUrl ? `Invitation: ${i.inviteUrl}` : '',
  ]
    .filter((l, k, all) => l !== '' || (k > 0 && all[k - 1] !== ''))
    .join('\n');

  return { subject, html, text };
}
