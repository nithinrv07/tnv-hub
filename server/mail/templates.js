// Email templates. Table layout and inline styles only, so they render the same in
// Gmail, Outlook and phone mail apps. Every template returns { subject, html, text }.
// Rule kept from the original spec: emails never contain a password.

const { fillCard } = require('./birthdayCards');

const BRAND = { green: '#14532D', greenMid: '#166534', yellow: '#FACC15', tint: '#ECFDF5', ink: '#1F2937', muted: '#6B7280' };

const esc = v => String(v == null ? '' : v)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function portalUrl(path = '') {
  const base = (process.env.PORTAL_URL || 'https://tnv-hub.vercel.app').replace(/\/$/, '');
  return `${base}${path}`;
}

// The TNV logo, served from the portal (client/public/tnv-logo.png)
const logoUrl = () => portalUrl('/tnv-logo.png');

function button(href, label, color = BRAND.green) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0"><tr><td style="border-radius:8px;background:${color}">
<a href="${esc(href)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px">${esc(label)}</a>
</td></tr></table>`;
}

// The TNV frame around every email
function layout({ preheader = '', body, footerNote = '', header = true }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tamil Nadu Volunteers</title></head>
<body style="margin:0;padding:0;background:#F3F4F6">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F4F6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
${header ? `<tr><td style="background:${BRAND.green};padding:16px 24px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;vertical-align:middle"><img src="${esc(logoUrl())}" width="48" height="48" alt="TNV" style="display:block;width:48px;height:48px;border-radius:24px;background:#ffffff;border:0"></td>
<td style="vertical-align:middle"><span style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#ffffff">Tamil Nadu Volunteers</span><br>
<span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${BRAND.yellow}">தமிழ்நாடு தன்னார்வலர்கள்</span></td>
</tr></table>
</td></tr>` : ''}
<tr><td style="padding:28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.ink}">
${body}
</td></tr>
<tr><td style="padding:16px 24px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted}">
${footerNote ? `${footerNote}<br>` : ''}Tamil Nadu Volunteers · 14/15, 3rd Floor, Easwar Apartments, Karaneeswarar Koil Street, Saidapet, Chennai 600015<br>
You receive this email because you are registered with Tamil Nadu Volunteers.
</td></tr>
</table></td></tr></table></body></html>`;
}

const firstName = name => String(name || 'Volunteer').trim().split(/\s+/)[0];

// ---- Registration received ----
function welcome({ full_name }) {
  const subject = 'Welcome to Tamil Nadu Volunteers – registration received';
  const html = layout({
    preheader: 'Your registration has been received and is under review.',
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.green}">Welcome, ${esc(firstName(full_name))}!</h1>
<p style="margin:0 0 12px">Thank you for registering with Tamil Nadu Volunteers. Our team will call you for a short telephone interview, then review your application.</p>
<p style="margin:0 0 12px">You can sign in at any time with your <strong>email address and password</strong> to follow your application, pay the ₹365 membership and see upcoming events.</p>
${button(portalUrl('/login'), 'Open your dashboard')}
<p style="margin:0;font-size:13px;color:${BRAND.muted}">For your security we never send your password by email. If you did not register, please reply to this email.</p>`
  });
  const text = `Welcome, ${firstName(full_name)}!\n\nThank you for registering with Tamil Nadu Volunteers. Our team will call you for a short interview, then review your application.\n\nSign in with your email and password: ${portalUrl('/login')}\n\nWe never send your password by email.`;
  return { subject, html, text };
}

// ---- Application approved ----
function approved({ full_name, tnv_id, role, portfolio_path }) {
  const subject = `You're approved! Your TNV ID is ${tnv_id || 'ready'}`;
  const html = layout({
    preheader: 'Your Tamil Nadu Volunteers membership is approved.',
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.green}">Congratulations, ${esc(firstName(full_name))}!</h1>
<p style="margin:0 0 16px">Your application has been approved. Welcome to the Tamil Nadu Volunteers family.</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${BRAND.tint};border-left:4px solid ${BRAND.green};border-radius:6px"><tr><td style="padding:14px 16px">
<span style="font-size:12px;color:${BRAND.muted}">Your TNV ID</span><br><strong style="font-size:20px;font-family:'Courier New',monospace;color:${BRAND.green}">${esc(tnv_id || '—')}</strong>
${role ? `<br><span style="font-size:13px;color:${BRAND.ink}">Role: ${esc(role)}</span>` : ''}
</td></tr></table>
<p style="margin:16px 0 0">Your ID card and appointment letter are now ready on your dashboard${portfolio_path ? ', and you have your own public volunteer portfolio' : ''}.</p>
${button(portalUrl('/dashboard'), 'Download ID card')}
${portfolio_path ? `<p style="margin:0;font-size:14px">Your portfolio: <a href="${esc(portalUrl(portfolio_path))}" style="color:${BRAND.green}">${esc(portalUrl(portfolio_path))}</a></p>` : ''}`
  });
  const text = `Congratulations, ${firstName(full_name)}!\n\nYour application is approved. Your TNV ID: ${tnv_id || '-'}${role ? `\nRole: ${role}` : ''}\n\nDownload your ID card and appointment letter: ${portalUrl('/dashboard')}${portfolio_path ? `\nYour portfolio: ${portalUrl(portfolio_path)}` : ''}`;
  return { subject, html, text };
}

// ---- Membership payment verified ----
function paymentVerified({ full_name, receipt_no, amount = 365 }) {
  const subject = `Payment received – receipt ${receipt_no || ''}`.trim();
  const receiptUrl = receipt_no ? portalUrl(`/api/receipts/${encodeURIComponent(receipt_no)}.pdf`) : portalUrl('/dashboard');
  const html = layout({
    preheader: `We have verified your ₹${amount} membership payment.`,
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.green}">Thank you, ${esc(firstName(full_name))}</h1>
<p style="margin:0 0 12px">We have verified your <strong>₹${esc(amount)}</strong> membership payment.${receipt_no ? ` Your receipt number is <strong>${esc(receipt_no)}</strong>.` : ''}</p>
${button(receiptUrl, 'Download receipt')}`
  });
  const text = `Thank you, ${firstName(full_name)}.\n\nWe have verified your ₹${amount} membership payment.${receipt_no ? ` Receipt: ${receipt_no}` : ''}\n\nDownload: ${receiptUrl}`;
  return { subject, html, text };
}

// ---- Organisation application received / decided ----
function ngoReceived({ organisation_name, poc_name }) {
  const subject = `Application received – ${organisation_name}`;
  const html = layout({
    preheader: 'We have received your collaboration application.',
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.green}">Thank you, ${esc(organisation_name)}</h1>
<p style="margin:0 0 12px">We have received your application to partner with Tamil Nadu Volunteers. Our team reviews every application within 72 hours and will call ${esc(poc_name || 'your point of contact')}.</p>
${button(portalUrl('/ngo'), 'Open your organisation portal')}`
  });
  const text = `Thank you, ${organisation_name}.\n\nWe have received your application. Our team reviews every application within 72 hours and will call ${poc_name || 'your point of contact'}.\n\nPortal: ${portalUrl('/ngo')}`;
  return { subject, html, text };
}

function ngoDecision({ organisation_name, decision, remarks }) {
  const ok = decision === 'approved';
  const subject = ok ? `Welcome aboard, ${organisation_name}!` : `Update on your application – ${organisation_name}`;
  const html = layout({
    preheader: ok ? 'Your organisation is now a TNV collaboration partner.' : 'An update on your collaboration application.',
    body: `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.green}">${ok ? 'Your application is approved' : 'Your application was not approved'}</h1>
<p style="margin:0 0 12px">${ok
  ? `${esc(organisation_name)} is now a Tamil Nadu Volunteers collaboration partner. Volunteers can choose your organisation when they register, and you can see them in your portal.`
  : `Thank you for your interest in partnering with Tamil Nadu Volunteers. We are unable to approve the application for ${esc(organisation_name)} at this time.`}</p>
${remarks ? `<p style="margin:0 0 12px;padding:12px;background:#F9FAFB;border-radius:6px"><strong>Note from TNV:</strong> ${esc(remarks)}</p>` : ''}
${button(portalUrl('/ngo'), 'Open your organisation portal')}`
  });
  const text = `${ok ? 'Your application is approved' : 'Your application was not approved'}\n\n${organisation_name}${remarks ? `\n\nNote from TNV: ${remarks}` : ''}\n\nPortal: ${portalUrl('/ngo')}`;
  return { subject, html, text };
}

// ---- Admin message to members ----
function broadcast({ full_name, subject, body }) {
  const personal = String(body || '').replaceAll('{name}', firstName(full_name));
  const html = layout({
    preheader: personal.slice(0, 90),
    body: `${personal.split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}`,
    footerNote: 'Sent by the Tamil Nadu Volunteers team.'
  });
  return { subject: subject || 'Message from Tamil Nadu Volunteers', html, text: personal };
}

// ---- Birthday card ----
function birthday({ member, card, turning }) {
  const c = fillCard(card, member);
  const k = c.colors;
  const dark = c.id === 'palm';
  // Text colour for headings: the confetti yellow is too light on cream, so use amber
  const strong = dark ? '#FFFFFF' : c.id === 'confetti' ? '#B45309' : k.accent;
  const subject = `${c.emoji} Happy Birthday, ${firstName(member.full_name)}!`;
  const confetti = c.id === 'confetti'
    ? `<div style="font-size:22px;letter-spacing:6px;line-height:1">🎊 🎈 🎁 🎈 🎊</div>`
    : c.id === 'kolam'
      ? `<div style="font-size:18px;letter-spacing:10px;color:${k.accent};line-height:1">✦ · ✦ · ✦ · ✦</div>`
      : c.id === 'palm'
        ? `<div style="font-size:22px;letter-spacing:8px;line-height:1">🌱 🌴 🌱</div>`
        : `<div style="font-size:22px;letter-spacing:8px;line-height:1">☀️ 🌼 ☀️</div>`;
  const html = layout({
    header: false, // the card carries the logo and name itself
    preheader: `${c.title} – a wish from Tamil Nadu Volunteers`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${k.bg}" style="background:${c.id === 'sunrise' ? `linear-gradient(135deg,#FFE8DC,#FDE68A)` : k.bg};border:3px solid ${k.border};border-radius:16px">
<tr><td style="padding:18px 18px 6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="64" style="width:64px;vertical-align:middle"><img src="${esc(logoUrl())}" width="58" height="58" alt="TNV logo" style="display:block;width:58px;height:58px;border-radius:29px;background:#ffffff;border:3px solid ${k.border}"></td>
<td align="center" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif"><span style="font-size:17px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:${dark ? k.accent : k.text}">Tamil Nadu Volunteers</span><br><span style="font-size:12px;font-weight:bold;color:${dark ? '#D1FAE5' : k.muted}">தமிழ்நாடு தன்னார்வலர்கள்</span></td>
<td width="64" style="width:64px">&nbsp;</td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding:8px 20px 6px">${confetti}</td></tr>
<tr><td align="center" style="padding:6px 20px 0;font-size:52px;line-height:1">${c.emoji}</td></tr>
<tr><td align="center" style="padding:14px 24px 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:bold;color:${strong}">${esc(c.title)}</td></tr>
<tr><td align="center" style="padding:6px 24px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${dark ? k.accent : k.muted}">${esc(c.subtitle)}${turning ? ` · Turning ${esc(turning)} today` : ''}</td></tr>
<tr><td style="padding:20px 24px 28px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${k.panel}" style="background:${k.panel};border-radius:12px"><tr><td style="padding:18px 20px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${dark ? '#FFFFFF' : k.text};text-align:center">
${esc(c.message)}<br><br><strong style="color:${dark ? k.accent : strong}">– Tamil Nadu Volunteers, ${esc(member.district_name || 'Tamil Nadu')}</strong>
</td></tr></table>
</td></tr>
</table>
${button(portalUrl('/dashboard'), 'See your birthday card', dark ? BRAND.green : k.accent)}`
  });
  const text = `${c.title}\n${c.subtitle}\n\n${c.message}\n\n– Tamil Nadu Volunteers, ${member.district_name || 'Tamil Nadu'}\n\nSee your card: ${portalUrl('/dashboard')}`;
  return { subject, html, text };
}

module.exports = { welcome, approved, paymentVerified, ngoReceived, ngoDecision, broadcast, birthday, portalUrl };
