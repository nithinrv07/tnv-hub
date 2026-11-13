import { useEffect, useMemo, useState } from 'react';
import { getSentMessages, logSentMessage } from '../../lib/adminService.js';
import Spinner from '../Spinner.jsx';

// Send Message: choose who gets it (up to 10 people picked by hand, everyone in a
// district, or everyone in an assembly constituency), write it once, then send it
// to each person on WhatsApp or by email. Each send is kept under Previous Notices.

const MAX_PICK = 10;

function whatsappLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`;
}

const personalise = (text, m) => text.replaceAll('{name}', (m.full_name || 'Volunteer').split(' ')[0]);

const formatWhen = value => {
  const d = new Date(value);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function SendMessage({ members, initialTab = 'compose' }) {
  const [tab, setTab] = useState(initialTab);
  const [mode, setMode] = useState('pick'); // pick | district | constituency
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [constituency, setConstituency] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [channel, setChannel] = useState('whatsapp');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // { record, recipients }
  const [done, setDone] = useState(new Set());
  const [log, setLog] = useState({ loading: true, items: [], error: '' });

  useEffect(() => setTab(initialTab), [initialTab]);

  const loadLog = async () => {
    const res = await getSentMessages();
    setLog({ loading: false, items: res.ok ? res.data.messages || [] : [], error: res.ok ? '' : res.data?.error || "Previous notices couldn't be loaded." });
  };
  useEffect(() => { loadLog(); }, []);

  const pool = useMemo(
    () => (members || []).filter(m => m && !m.blocked && (!onlyActive || m.status === 'approved')),
    [members, onlyActive]
  );
  const districts = useMemo(() => Array.from(new Set(pool.map(m => m.district_name).filter(Boolean))).sort(), [pool]);
  const constituencies = useMemo(
    () => Array.from(new Set(pool.filter(m => !district || m.district_name === district).map(m => m.assembly_constituency).filter(Boolean))).sort(),
    [pool, district]
  );

  const recipients = useMemo(() => {
    if (mode === 'pick') return pool.filter(m => picked.includes(m.id));
    if (mode === 'district') return district ? pool.filter(m => m.district_name === district) : [];
    return constituency ? pool.filter(m => m.assembly_constituency === constituency) : [];
  }, [mode, pool, picked, district, constituency]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return pool
      .filter(m => [m.full_name, m.phone, m.email, m.tnv_id].some(v => String(v || '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [pool, search]);

  const audienceLabel = mode === 'pick'
    ? `${recipients.length} selected member${recipients.length === 1 ? '' : 's'}`
    : mode === 'district' ? `District: ${district}` : `Constituency: ${constituency}`;

  const togglePick = id => {
    setPicked(p => {
      if (p.includes(id)) return p.filter(x => x !== id);
      if (p.length >= MAX_PICK) return p;
      return [...p, id];
    });
  };

  const reachable = m => (channel === 'email' ? Boolean(m.email) : Boolean(String(m.phone || '').replace(/\D/g, '')));

  const handleSend = async () => {
    setError('');
    if (!recipients.length) return setError('Choose who should receive the message.');
    if (!body.trim()) return setError('Write the message.');
    if (channel === 'email' && !subject.trim()) return setError('Add a subject for the email.');
    const list = recipients.filter(reachable);
    if (!list.length) return setError(channel === 'email' ? 'None of these members has an email address.' : 'None of these members has a phone number.');

    setSending(true);
    const res = await logSentMessage({
      channel,
      audience: audienceLabel,
      subject: subject.trim(),
      body: body.trim(),
      recipients: list.map(m => ({ id: m.id, name: m.full_name }))
    });
    setSending(false);
    if (!res.ok) return setError(res.data?.error || 'The message could not be saved. Please try again.');
    setSent({ record: res.data.message, recipients: list });
    setDone(new Set());
    loadLog();
  };

  const startOver = () => {
    setSent(null);
    setBody('');
    setSubject('');
    setPicked([]);
  };

  const bccLink = sent && channel === 'email'
    ? `mailto:?bcc=${encodeURIComponent(sent.recipients.map(m => m.email).join(','))}&subject=${encodeURIComponent(sent.record.subject)}&body=${encodeURIComponent(sent.record.body.replaceAll('{name}', 'Volunteer'))}`
    : null;

  const input = 'w-full py-2 px-3 rounded-lg border border-neutral-300 text-sm bg-white focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green';

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-green-dark text-base font-display">Send Message</h3>
          <p className="text-xs text-neutral-muted mt-0.5">Message up to {MAX_PICK} people, a whole district, or a constituency.</p>
        </div>
        <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-bold">
          {[['compose', 'New message'], ['notices', `Previous notices (${log.items.length})`]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`min-h-9 px-3 rounded-lg transition-colors ${tab === id ? 'bg-white text-brand-green-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'notices' ? (
        log.loading ? (
          <div className="py-10 text-center"><Spinner className="mx-auto" /></div>
        ) : log.error ? (
          <p className="py-10 text-center text-sm text-rose-700">{log.error}</p>
        ) : log.items.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No messages sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {log.items.map(item => (
              <li key={item.id} className="rounded-xl border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
                  <span className="font-bold text-neutral-800">{item.audience} · {item.recipient_count} recipient{item.recipient_count === 1 ? '' : 's'}</span>
                  <span>{item.channel === 'email' ? 'Email' : 'WhatsApp'} · {formatWhen(item.created_at)} · {item.sent_by}</span>
                </div>
                {item.subject && <p className="mt-2 text-sm font-bold text-neutral-900">{item.subject}</p>}
                <p className="mt-1 whitespace-pre-line break-words text-sm text-neutral-700">{item.body}</p>
              </li>
            ))}
          </ul>
        )
      ) : sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-green/30 bg-brand-green-tint p-4 text-sm text-brand-green-dark">
            <p className="font-bold">Message saved for {sent.recipients.length} member{sent.recipients.length === 1 ? '' : 's'}.</p>
            <p className="mt-1 text-xs">
              {channel === 'email'
                ? 'Open one email to everyone (their addresses are hidden from each other), or send them one by one.'
                : 'Open WhatsApp for each member below. The message is filled in with their name.'}
            </p>
          </div>
          {bccLink && sent.recipients.length <= 50 && (
            <a href={bccLink} className="inline-flex px-4 py-2 rounded-lg bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark">
              Open one email to all {sent.recipients.length}
            </a>
          )}
          <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
            {sent.recipients.map(m => {
              const text = personalise(sent.record.body, m);
              const href = channel === 'email'
                ? `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(sent.record.subject)}&body=${encodeURIComponent(text)}`
                : whatsappLink(m.phone, text);
              return (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">{m.full_name}</p>
                    <p className="truncate text-[11px] text-neutral-500">{channel === 'email' ? m.email : m.phone} · {m.district_name}</p>
                  </div>
                  <a
                    href={href}
                    target={channel === 'email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    onClick={() => setDone(d => new Set(d).add(m.id))}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${done.has(m.id) ? 'bg-neutral-100 text-neutral-600' : channel === 'email' ? 'bg-brand-green-dark text-white' : 'bg-emerald-600 text-white'}`}
                  >
                    {done.has(m.id) ? 'Opened' : channel === 'email' ? 'Email' : 'WhatsApp'}
                  </a>
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={startOver} className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-bold hover:bg-neutral-50">
            Write another message
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Audience */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-neutral-700">Send to</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Audience">
              {[['pick', `Choose people (up to ${MAX_PICK})`], ['district', 'A district'], ['constituency', 'A constituency']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  aria-pressed={mode === id}
                  className={`min-h-9 px-3 rounded-lg text-xs font-bold border ${mode === id ? 'bg-brand-green text-white border-brand-green' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} className="h-4 w-4 accent-brand-green" />
              Active (approved) members only
            </label>

            {mode === 'pick' && (
              <div className="space-y-2">
                <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email or TNV ID" className={input} aria-label="Search members" />
                {searchResults.length > 0 && (
                  <ul className="max-h-60 overflow-y-auto divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                    {searchResults.map(m => {
                      const on = picked.includes(m.id);
                      const full = !on && picked.length >= MAX_PICK;
                      return (
                        <li key={m.id}>
                          <label className={`flex items-center gap-3 px-3 py-2 text-sm ${full ? 'opacity-50' : 'cursor-pointer hover:bg-neutral-50'}`}>
                            <input type="checkbox" checked={on} disabled={full} onChange={() => togglePick(m.id)} className="h-4 w-4 accent-brand-green" />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-neutral-900">{m.full_name}</span>
                              <span className="block truncate text-[11px] text-neutral-500">{m.phone} · {m.district_name}</span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="text-[11px] text-neutral-500">{picked.length} of {MAX_PICK} chosen</p>
                {picked.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {recipients.map(m => (
                      <button key={m.id} type="button" onClick={() => togglePick(m.id)} className="inline-flex items-center gap-1 rounded-full bg-brand-green-tint px-2.5 py-1 text-xs font-semibold text-brand-green-dark hover:bg-rose-50 hover:text-rose-700" title="Remove">
                        {m.full_name} <span aria-hidden="true">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(mode === 'district' || mode === 'constituency') && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="min-w-0">
                  <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">District</span>
                  <select value={district} onChange={e => { setDistrict(e.target.value); setConstituency(''); }} className={input}>
                    <option value="">{mode === 'district' ? 'Choose a district' : 'Any district'}</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </label>
                {mode === 'constituency' && (
                  <label className="min-w-0">
                    <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Constituency</span>
                    <select value={constituency} onChange={e => setConstituency(e.target.value)} className={input}>
                      <option value="">Choose a constituency</option>
                      {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                )}
              </div>
            )}
            {mode !== 'pick' && (
              <p className="text-xs font-semibold text-neutral-700">{recipients.length} member{recipients.length === 1 ? '' : 's'} will receive this.</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-3 border-t border-neutral-100 pt-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Send by">
              {[['whatsapp', 'WhatsApp'], ['email', 'Email']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setChannel(id)}
                  aria-pressed={channel === id}
                  className={`min-h-9 px-3 rounded-lg text-xs font-bold border ${channel === id ? 'bg-brand-green-dark text-white border-brand-green-dark' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {channel === 'email' && (
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" className={input} />
            )}
            <textarea rows={6} value={body} onChange={e => setBody(e.target.value)} placeholder="Dear {name}, ..." aria-label="Message" className={input} />
            <p className="text-[11px] text-neutral-500">{'{name}'} is replaced with each member's first name.</p>
          </div>

          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

          <button type="button" onClick={handleSend} disabled={sending} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-green text-white text-sm font-bold hover:bg-brand-green-dark disabled:opacity-60">
            {sending && <Spinner className="h-4 w-4" />}
            Send to {recipients.length} member{recipients.length === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </section>
  );
}
