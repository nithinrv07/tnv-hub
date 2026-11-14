import { useCallback, useEffect, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { getMailStatus, getMailLog, sendTestEmail, flushMailQueue, runBirthdayEmails } from '../../lib/adminService.js';

// Admin > Email Status: which provider the portal sends through, today's count
// against the daily limit, and every email it has sent, queued or failed.

const PROVIDER_LABEL = { resend: 'Resend', zeptomail: 'Zoho ZeptoMail', log: 'Not sending (log only)' };

const KINDS = [
  ['', 'All emails'],
  ['welcome', 'Registration'],
  ['approval', 'Approval'],
  ['payment', 'Payment receipt'],
  ['birthday', 'Birthday card'],
  ['message', 'Admin message'],
  ['ngo', 'NGO application'],
  ['test', 'Test']
];
const KIND_LABEL = Object.fromEntries(KINDS.filter(([k]) => k));

const STATUSES = [['', 'Any status'], ['sent', 'Sent'], ['logged', 'Logged only'], ['queued', 'Queued'], ['failed', 'Failed'], ['skipped', 'Skipped']];
const STATUS_STYLE = {
  sent: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  logged: 'bg-neutral-100 text-neutral-700 border-neutral-200',
  queued: 'bg-amber-50 text-amber-800 border-amber-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
  skipped: 'bg-neutral-50 text-neutral-500 border-neutral-200'
};

const formatWhen = iso => (iso
  ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
  : '—');

function Tile({ label, value, note, tone = 'text-neutral-900' }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className={`mt-1 text-xl font-black font-display truncate ${tone}`}>{value}</p>
      {note && <p className="mt-0.5 text-[11px] text-neutral-500 truncate">{note}</p>}
    </div>
  );
}

export default function EmailStatus({ adminEmail = '' }) {
  const [status, setStatus] = useState(null);
  const [log, setLog] = useState({ loading: true, entries: [], error: '' });
  const [filters, setFilters] = useState({ status: '', kind: '' });
  const [testTo, setTestTo] = useState(adminEmail);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState(null); // { tone, text }

  const loadStatus = useCallback(async () => {
    const res = await getMailStatus();
    setStatus(res.ok ? res.data : { error: res.data?.error || 'Could not load the email status.' });
  }, []);

  const loadLog = useCallback(async () => {
    setLog(l => ({ ...l, loading: true }));
    const res = await getMailLog(filters);
    setLog(res.ok
      ? { loading: false, entries: res.data.entries || [], error: '' }
      : { loading: false, entries: [], error: res.data?.error || 'Could not load the email log.' });
  }, [filters]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { loadLog(); }, [loadLog]);

  const refresh = () => { loadStatus(); loadLog(); };

  const act = async (key, fn, describe) => {
    setBusy(key);
    setNotice(null);
    const res = await fn();
    setBusy('');
    setNotice(res.ok ? { tone: 'ok', text: describe(res.data) } : { tone: 'error', text: res.data?.error || 'That did not work. Try again.' });
    refresh();
  };

  const sendTest = e => {
    e.preventDefault();
    act('test', () => sendTestEmail(testTo.trim()), d => (
      d.entry?.status === 'logged'
        ? `Test email written to the log for ${testTo.trim()}. Nothing was sent because no email provider is set up.`
        : `Test email sent to ${testTo.trim()}. Check the inbox (and the spam folder).`
    ));
  };

  const logOnly = status && status.provider === 'log';

  return (
    <section className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-brand-green-dark text-base font-display">Email Status</h3>
            <p className="text-xs text-neutral-muted mt-0.5">
              Registration, approval, payment receipt, birthday card, NGO and admin emails, and whether each one went out.
            </p>
          </div>
          <button type="button" onClick={refresh} className="self-start sm:self-auto px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50">
            Refresh
          </button>
        </div>

        {!status ? (
          <div className="py-6 text-center"><Spinner className="mx-auto" /></div>
        ) : status.error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{status.error}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Tile
                label="Sending through"
                value={PROVIDER_LABEL[status.provider] || status.provider}
                note={status.configured ? status.from : 'API key missing'}
                tone={logOnly || !status.configured ? 'text-amber-700' : 'text-brand-green-dark'}
              />
              <Tile label="Sent today" value={`${status.sent_today} / ${status.daily_limit}`} note={`${status.remaining_today} left today`} />
              <Tile label="Queued" value={status.queued} note="Sent by the 7:00 AM daily job" tone={status.queued ? 'text-amber-700' : 'text-neutral-900'} />
              <Tile label="Failed" value={status.failed} note="See the reason in the log" tone={status.failed ? 'text-rose-700' : 'text-neutral-900'} />
            </div>

            {logOnly && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-bold">Emails are not being sent yet</p>
                <p className="mt-1 text-xs leading-relaxed">
                  The portal is writing every email to this log only. To send them, add these settings to the server (Vercel → Project → Settings → Environment Variables) and redeploy:
                </p>
                <ul className="mt-2 space-y-1 text-xs font-mono break-all">
                  <li>RESEND_API_KEY = re_… <span className="font-sans text-amber-800">(free: 3,000 emails a month, 100 a day)</span></li>
                  <li>MAIL_FROM = Tamil Nadu Volunteers &lt;noreply@your-domain&gt;</li>
                  <li>CRON_SECRET = any long random text <span className="font-sans text-amber-800">(protects the daily job)</span></li>
                </ul>
                <p className="mt-2 text-xs">For Zoho ZeptoMail set ZEPTOMAIL_TOKEN instead of RESEND_API_KEY. Either way, verify your domain with the provider first.</p>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] border-t border-neutral-100 pt-4">
          <form onSubmit={sendTest} className="flex flex-col sm:flex-row gap-2 min-w-0">
            <label className="sr-only" htmlFor="mail-test-to">Send a test email to</label>
            <input
              id="mail-test-to"
              type="email"
              required
              value={testTo}
              onChange={e => setTestTo(e.target.value)}
              placeholder="Send a test email to…"
              className="min-w-0 flex-1 py-2 px-3 rounded-lg border border-neutral-300 text-sm"
            />
            <button type="submit" disabled={busy === 'test'} className="px-4 py-2 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark disabled:opacity-60">
              {busy === 'test' ? 'Sending…' : 'Send test email'}
            </button>
          </form>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === 'flush'}
              onClick={() => act('flush', flushMailQueue, d => `${d.sent} queued email${d.sent === 1 ? '' : 's'} sent; ${d.still_queued} still waiting.`)}
              className="px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy === 'flush' ? 'Sending…' : 'Send queued now'}
            </button>
            <button
              type="button"
              disabled={busy === 'birthdays'}
              onClick={() => act('birthdays', runBirthdayEmails, d => (d.birthdays
                ? `Today's birthday cards: ${d.sent} sent, ${d.already_sent} sent earlier${d.queued ? `, ${d.queued} queued` : ''}${d.failed ? `, ${d.failed} failed` : ''}.`
                : 'No member with an email address has a birthday today.'))}
              className="px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50 disabled:opacity-60"
            >
              {busy === 'birthdays' ? 'Sending…' : 'Send today’s birthday cards'}
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm font-medium ${notice.tone === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
            {notice.text}
          </p>
        )}
      </div>

      {/* Log */}
      <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-neutral-900">Email log</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <select aria-label="Email type" value={filters.kind} onChange={e => setFilters(f => ({ ...f, kind: e.target.value }))} className="py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white">
              {KINDS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <select aria-label="Status" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white">
              {STATUSES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </div>
        </div>

        {log.loading ? (
          <div className="py-10 text-center"><Spinner className="mx-auto" /></div>
        ) : log.error ? (
          <p className="py-10 text-center text-sm text-rose-700">{log.error}</p>
        ) : log.entries.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No emails {filters.kind || filters.status ? 'match these filters' : 'yet'}.</p>
        ) : (
          <>
            {/* Table on wide screens */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold">To</th>
                    <th className="py-2 pr-3 font-bold">Type</th>
                    <th className="py-2 pr-3 font-bold">Subject</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {log.entries.map(e => (
                    <tr key={e.id} className="align-top">
                      <td className="py-2.5 pr-3 whitespace-nowrap text-neutral-600">{formatWhen(e.sent_at || e.created_at)}</td>
                      <td className="py-2.5 pr-3 min-w-0">
                        <p className="font-semibold text-neutral-900">{e.to_name || '—'}</p>
                        <p className="text-neutral-500 break-all">{e.to}</p>
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-neutral-700">{KIND_LABEL[e.kind] || e.kind}</td>
                      <td className="py-2.5 pr-3 text-neutral-800">{e.subject}</td>
                      <td className="py-2.5">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[e.status] || STATUS_STYLE.skipped}`}>{e.status}</span>
                        {e.error && <p className="mt-1 max-w-xs text-[11px] text-rose-700">{e.error}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Cards on phones */}
            <ul className="md:hidden space-y-2">
              {log.entries.map(e => (
                <li key={e.id} className="rounded-xl border border-neutral-200 p-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-neutral-900 min-w-0 break-words">{e.subject}</p>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[e.status] || STATUS_STYLE.skipped}`}>{e.status}</span>
                  </div>
                  <p className="mt-1 text-neutral-600 break-all">{e.to_name ? `${e.to_name} · ` : ''}{e.to}</p>
                  <p className="mt-0.5 text-neutral-500">{KIND_LABEL[e.kind] || e.kind} · {formatWhen(e.sent_at || e.created_at)}</p>
                  {e.error && <p className="mt-1 text-rose-700">{e.error}</p>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
