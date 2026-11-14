// TNV mail service. One send() for the whole server, with switchable providers:
//
//   MAIL_PROVIDER=resend     Resend (resend.com). Free plan: 3,000 emails a month,
//                            100 a day. Needs RESEND_API_KEY and a verified domain.
//   MAIL_PROVIDER=zeptomail  Zoho ZeptoMail / Zoho CPaaS. Pay as you go (one-time
//                            free credit). Needs ZEPTOMAIL_TOKEN (the "Send Mail
//                            token") and a verified domain. ZEPTOMAIL_API_URL is the send
//                            URL shown in your ZeptoMail / CPaaS console for your data
//                            centre (default https://cpaas.zoho.com/v1.1/email).
//   MAIL_PROVIDER=log        Nothing is sent; emails are only written to the log.
//                            The default when no provider key is set (local development).
//
// Every email is recorded in the email log (Admin > Email Status). Emails over the
// daily limit (MAIL_DAILY_LIMIT, default 100 to match Resend's free plan) are queued
// and sent by the daily job the next day.

const crypto = require('crypto');

const LOG_KEY = 'sync_email_log';
const LOG_CAP = 1500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mailConfig() {
  const env = process.env;
  const explicit = String(env.MAIL_PROVIDER || '').toLowerCase().trim();
  const provider = ['resend', 'zeptomail', 'log'].includes(explicit)
    ? explicit
    : env.RESEND_API_KEY ? 'resend' : env.ZEPTOMAIL_TOKEN ? 'zeptomail' : 'log';
  const from = env.MAIL_FROM || env.EMAIL_FROM || 'Tamil Nadu Volunteers <noreply@tamilnaduvolunteers.org>';
  const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return {
    provider,
    from,
    fromName: match ? match[1] : 'Tamil Nadu Volunteers',
    fromAddress: match ? match[2] : from,
    replyTo: env.MAIL_REPLY_TO || '',
    dailyLimit: Math.max(1, Number(env.MAIL_DAILY_LIMIT) || 100),
    configured: provider === 'log' || (provider === 'resend' ? Boolean(env.RESEND_API_KEY) : Boolean(env.ZEPTOMAIL_TOKEN))
  };
}

const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const dayIST = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

async function postJson(url, headers, body, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers }, body: JSON.stringify(body), signal: controller.signal });
    const raw = await res.text();
    let data = {};
    try { data = raw ? JSON.parse(raw) : {}; } catch (_e) { data = { raw }; }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { message: err.name === 'AbortError' ? 'The mail provider did not answer in time.' : err.message } };
  } finally {
    clearTimeout(timer);
  }
}

// ---- Providers: each returns { ok, id?, error? } ----
const PROVIDERS = {
  async resend(msg, cfg) {
    const res = await postJson('https://api.resend.com/emails', {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      ...(msg.idempotencyKey ? { 'Idempotency-Key': msg.idempotencyKey.slice(0, 256) } : {})
    }, {
      from: cfg.from,
      to: [msg.toName ? `${msg.toName.replace(/[<>"]/g, '')} <${msg.to}>` : msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(cfg.replyTo ? { reply_to: cfg.replyTo } : {}),
      tags: [{ name: 'kind', value: String(msg.kind || 'general').replace(/[^A-Za-z0-9_-]/g, '_') }]
    });
    if (res.ok && res.data.id) return { ok: true, id: res.data.id };
    return { ok: false, error: res.data.message || res.data.error || `Resend error ${res.status}` };
  },

  async zeptomail(msg, cfg) {
    const url = process.env.ZEPTOMAIL_API_URL || 'https://cpaas.zoho.com/v1.1/email';
    const token = String(process.env.ZEPTOMAIL_TOKEN || '').replace(/^Zoho-enczapikey\s+/i, '');
    const res = await postJson(url, { Authorization: `Zoho-enczapikey ${token}` }, {
      from: { address: cfg.fromAddress, name: cfg.fromName },
      to: [{ email_address: { address: msg.to, ...(msg.toName ? { name: msg.toName } : {}) } }],
      ...(cfg.replyTo ? { reply_to: [{ address: cfg.replyTo }] } : {}),
      subject: msg.subject,
      htmlbody: msg.html,
      textbody: msg.text
    });
    if (res.ok) return { ok: true, id: res.data.request_id || (res.data.data && res.data.data[0] && res.data.data[0].message) || 'accepted' };
    const err = res.data.error || {};
    return { ok: false, error: err.message || (err.details && err.details[0] && err.details[0].message) || res.data.message || `ZeptoMail error ${res.status}` };
  },

  async log(msg) {
    console.log(`[mail:log] to=${msg.to} kind=${msg.kind} subject="${msg.subject}"`);
    return { ok: true, id: `log-${crypto.randomUUID().slice(0, 8)}` };
  }
};

function createMailer({ supabaseBridge }) {
  async function loadLog() {
    const snap = await supabaseBridge.getSupabaseSnapshot(LOG_KEY);
    if (Array.isArray(snap)) return snap;
    if (snap && Array.isArray(snap.items)) return snap.items;
    return [];
  }
  const saveLog = list => supabaseBridge.saveSupabaseSnapshot(LOG_KEY, list.slice(0, LOG_CAP));

  const sentToday = list => list.filter(e => (e.status === 'sent' || e.status === 'logged') && e.sent_at && dayIST(e.sent_at) === todayIST()).length;

  async function deliver(msg, cfg) {
    try {
      return await PROVIDERS[cfg.provider](msg, cfg);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  function record(msg, cfg, status, result = {}) {
    const now = new Date().toISOString();
    return {
      id: `mail_${crypto.randomUUID().slice(0, 12)}`,
      kind: msg.kind || 'general',
      to: msg.to,
      to_name: msg.toName || null,
      subject: msg.subject,
      provider: cfg.provider,
      status, // sent | logged | failed | queued | skipped
      provider_id: result.id || null,
      error: result.error || null,
      meta: msg.meta || null,
      idempotency_key: msg.idempotencyKey || null,
      created_at: now,
      sent_at: status === 'sent' || status === 'logged' ? now : null,
      attempts: status === 'queued' || status === 'skipped' ? 0 : 1,
      // Queued emails keep their content so the daily job can send them later
      payload: status === 'queued' ? { html: msg.html, text: msg.text } : undefined
    };
  }

  /**
   * Send several emails in one go (one log write). Each message:
   * { to, toName?, subject, html, text, kind, meta?, idempotencyKey? }
   * Never throws; returns the log records.
   */
  async function sendMany(messages, { queueOverLimit = true } = {}) {
    const cfg = mailConfig();
    const log = await loadLog();
    let budget = cfg.dailyLimit - sentToday(log);
    const records = [];
    for (const msg of messages) {
      if (!msg || !EMAIL_RE.test(String(msg.to || ''))) {
        records.push(record({ ...msg, to: String((msg && msg.to) || '') }, cfg, 'skipped', { error: 'No valid email address.' }));
        continue;
      }
      // The same email (e.g. this year's birthday card) is only sent once
      if (msg.idempotencyKey && log.concat(records).some(e => e.idempotency_key === msg.idempotencyKey && ['sent', 'logged', 'queued'].includes(e.status))) {
        continue;
      }
      if (budget <= 0) {
        records.push(record(msg, cfg, queueOverLimit ? 'queued' : 'skipped', { error: `Daily limit of ${cfg.dailyLimit} reached.` }));
        continue;
      }
      const result = await deliver(msg, cfg);
      if (result.ok) budget -= 1;
      records.push(record(msg, cfg, result.ok ? (cfg.provider === 'log' ? 'logged' : 'sent') : 'failed', result));
    }
    if (records.length) await saveLog([...[...records].reverse(), ...log]);
    return records;
  }

  async function send(message, opts) {
    const [rec] = await sendMany([message], opts);
    return rec || { status: 'skipped', error: 'Already sent.' };
  }

  // Send queued emails (oldest first) and retry recent failures, within today's limit
  async function flushQueue() {
    const cfg = mailConfig();
    const log = await loadLog();
    let budget = cfg.dailyLimit - sentToday(log);
    const waiting = log
      .filter(e => e.status === 'queued' && e.payload)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    let sent = 0;
    for (const entry of waiting) {
      if (budget <= 0) break;
      const result = await deliver({ to: entry.to, toName: entry.to_name, subject: entry.subject, html: entry.payload.html, text: entry.payload.text, kind: entry.kind, idempotencyKey: entry.idempotency_key }, cfg);
      entry.attempts = (entry.attempts || 0) + 1;
      entry.provider = cfg.provider;
      if (result.ok) {
        entry.status = cfg.provider === 'log' ? 'logged' : 'sent';
        entry.sent_at = new Date().toISOString();
        entry.provider_id = result.id || null;
        entry.error = null;
        delete entry.payload;
        budget -= 1;
        sent += 1;
      } else {
        entry.error = result.error;
        if (entry.attempts >= 3) {
          entry.status = 'failed';
          delete entry.payload;
        }
      }
    }
    if (waiting.length) await saveLog(log);
    return { sent, still_queued: log.filter(e => e.status === 'queued').length };
  }

  async function status() {
    const cfg = mailConfig();
    const log = await loadLog();
    const today = sentToday(log);
    return {
      provider: cfg.provider,
      configured: cfg.configured,
      from: cfg.from,
      reply_to: cfg.replyTo || null,
      daily_limit: cfg.dailyLimit,
      sent_today: today,
      remaining_today: Math.max(0, cfg.dailyLimit - today),
      queued: log.filter(e => e.status === 'queued').length,
      failed: log.filter(e => e.status === 'failed').length
    };
  }

  async function listLog({ status: wanted, kind, limit = 200 } = {}) {
    const log = await loadLog();
    return log
      .filter(e => (!wanted || e.status === wanted) && (!kind || e.kind === kind))
      .slice(0, limit)
      .map(({ payload, ...e }) => e);
  }


  return { send, sendMany, flushQueue, status, listLog };
}

module.exports = { createMailer, mailConfig };
