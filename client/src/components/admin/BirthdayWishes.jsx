import { useMemo, useState } from 'react';

// Birthday Wishes: pick a range (today, next days, a month, or between two dates),
// choose one of the wish templates (they name the member's district), then send it
// by WhatsApp or email. Emails can carry a link, such as a greeting card or a page
// on the TNV site.

const TEMPLATES = [
  {
    id: 'warm',
    name: 'Warm wishes',
    subject: 'Happy Birthday, {name}!',
    body: 'Dear {name},\n\nHappy Birthday! Everyone at Tamil Nadu Volunteers, {district} wishes you a wonderful year ahead, filled with good health, happiness and many more moments of service.\n\nWith warm regards,\nTamil Nadu Volunteers – {district}'
  },
  {
    id: 'service',
    name: 'Thank you for serving',
    subject: 'Birthday greetings from TNV {district}',
    body: 'Dear {name},\n\nOn your birthday, the {district} district team of Tamil Nadu Volunteers thanks you for the time and care you give to our community. May this year bring you joy and strength.\n\nHappy Birthday!\nTNV {district} District Team'
  },
  {
    id: 'short',
    name: 'Short and simple',
    subject: 'Happy Birthday {name}',
    body: 'Happy Birthday {name}! 🎉 Wishing you a great year ahead. – Tamil Nadu Volunteers, {district}'
  },
  {
    id: 'tamil',
    name: 'Tamil & English',
    subject: 'இனிய பிறந்தநாள் வாழ்த்துகள், {name}!',
    body: 'அன்புள்ள {name},\n\nஇனிய பிறந்தநாள் வாழ்த்துகள்! தமிழ்நாடு தன்னார்வலர்கள் – {district} மாவட்டம் சார்பாக உங்களுக்கு மகிழ்ச்சியும் நலமும் நிறைந்த ஆண்டாக அமைய வாழ்த்துகிறோம்.\n\nHappy Birthday from Tamil Nadu Volunteers, {district}!'
  }
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Date of birth is stored as YYYY-MM-DD (DD-MM-YYYY and DD/MM/YYYY accepted too)
function parseDob(dob) {
  if (!dob || typeof dob !== 'string') return null;
  let m = dob.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = dob.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return { year: +m[3], month: +m[2], day: +m[1] };
  return null;
}

// The birthday that falls in a given year (29 Feb becomes 28 Feb outside leap years)
function birthdayIn(dob, year) {
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = dob.month === 2 && dob.day === 29 && !leap ? 28 : dob.day;
  return new Date(year, dob.month - 1, day);
}

const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const formatDay = d => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

function fill(text, member) {
  const first = (member.full_name || member.username || 'friend').split(' ')[0];
  return text
    .replaceAll('{name}', first)
    .replaceAll('{district}', member.district_name || 'Tamil Nadu');
}

function whatsappLink(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}?text=${encodeURIComponent(text)}`;
}

function emailLink(email, subject, body) {
  if (!email) return null;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function BirthdayWishes({ members, initialRange = 'today' }) {
  const today = startOfDay(new Date());
  const [range, setRange] = useState(initialRange); // today | week | month30 | month | between
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [fromDate, setFromDate] = useState(ymd(today));
  const [toDate, setToDate] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30)));
  const [district, setDistrict] = useState('');
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [link, setLink] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [includeLink, setIncludeLink] = useState(true);
  const [copied, setCopied] = useState('');

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];

  // Members whose birthday falls in the chosen range, soonest first
  const list = useMemo(() => {
    let start = today;
    let end = today;
    if (range === 'week') end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
    if (range === 'month30') end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30);
    if (range === 'between') {
      start = fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`)) : today;
      end = toDate ? startOfDay(new Date(`${toDate}T00:00:00`)) : start;
    }

    return (members || [])
      .filter(m => m && !m.blocked && (!district || m.district_name === district))
      .map(m => {
        const dob = parseDob(m.dob);
        if (!dob) return null;
        if (range === 'month') {
          if (dob.month !== Number(month)) return null;
          // This year's date in that month (next year's if the month has passed)
          let date = birthdayIn(dob, today.getFullYear());
          if (dob.month - 1 < today.getMonth()) date = birthdayIn(dob, today.getFullYear() + 1);
          return { ...m, date, turning: date.getFullYear() - dob.year };
        }
        for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
          const date = birthdayIn(dob, y);
          if (date >= start && date <= end) return { ...m, date, turning: y - dob.year };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
  }, [members, range, month, fromDate, toDate, district, today.getTime()]);

  const districts = useMemo(
    () => Array.from(new Set((members || []).map(m => m && m.district_name).filter(Boolean))).sort(),
    [members]
  );

  const messageFor = member => {
    const body = fill(template.body, member);
    const withLink = includeLink && link.trim() ? `${body}\n\n${link.trim()}` : body;
    return { subject: fill(template.subject, member), body: withLink };
  };

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch (_e) {
      window.prompt('Copy this text:', text);
    }
  };

  const sample = list[0] || { full_name: 'Priya', district_name: district || 'Chennai' };
  const preview = messageFor(sample);
  const emails = list.map(m => m.email).filter(Boolean);
  const isToday = m => m.date.getTime() === today.getTime();

  const rangeLabel = {
    today: 'today',
    week: 'in the next 7 days',
    month30: 'in the next 30 days',
    month: `in ${MONTHS[month - 1]}`,
    between: 'between the chosen dates'
  }[range];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-4 sm:p-6 space-y-5">
      <div>
        <h3 className="font-bold text-brand-green-dark text-base font-display">Birthday Wishes</h3>
        <p className="text-xs text-neutral-muted mt-0.5">Find member birthdays, pick a wish, and send it by WhatsApp or email.</p>
      </div>

      {/* Range */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Birthday range">
          {[
            ['today', 'Today'],
            ['week', 'Next 7 days'],
            ['month30', 'Next 30 days'],
            ['month', 'By month'],
            ['between', 'Between dates']
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id)}
              aria-pressed={range === id}
              className={`min-h-9 px-3 rounded-lg text-xs font-bold border transition-colors ${range === id ? 'bg-brand-green text-white border-brand-green' : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {range === 'month' && (
            <label className="min-w-0">
              <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Month</span>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white">
                {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
              </select>
            </label>
          )}
          {range === 'between' && (
            <>
              <label className="min-w-0">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">From</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full py-1 px-2 rounded-lg border border-neutral-300 text-xs bg-white" />
              </label>
              <label className="min-w-0">
                <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">To</span>
                <input type="date" value={toDate} min={fromDate} onChange={e => setToDate(e.target.value)} className="w-full py-1 px-2 rounded-lg border border-neutral-300 text-xs bg-white" />
              </label>
            </>
          )}
          <label className="min-w-0">
            <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">District</span>
            <select value={district} onChange={e => setDistrict(e.target.value)} className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white">
              <option value="">All districts</option>
              {districts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Template */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 min-w-0">
          <p className="text-xs font-bold text-neutral-700">Wish template</p>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplateId(t.id)}
                aria-pressed={templateId === t.id}
                className={`rounded-xl border p-2.5 text-left text-xs font-bold transition-colors ${templateId === t.id ? 'border-brand-green bg-brand-green-tint text-brand-green-dark' : 'border-neutral-200 hover:border-brand-green'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
            <input type="checkbox" checked={includeLink} onChange={e => setIncludeLink(e.target.checked)} className="h-4 w-4 accent-brand-green" />
            Add a link to the message
          </label>
          {includeLink && (
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              placeholder="https://"
              aria-label="Link to include"
              className="w-full py-2 px-3 rounded-lg border border-neutral-300 text-xs"
            />
          )}
          <p className="text-[11px] text-neutral-500">{'{name}'} and {'{district}'} are filled in for each member.</p>
        </div>
        <div className="min-w-0 rounded-xl bg-neutral-bg p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Preview{list[0] ? ` for ${list[0].full_name}` : ''}</p>
          <p className="mt-2 text-xs font-bold text-neutral-900">{preview.subject}</p>
          <p className="mt-1 whitespace-pre-line break-words text-xs text-neutral-700">{preview.body}</p>
        </div>
      </div>

      {/* Members */}
      <div className="border-t border-neutral-100 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="text-sm font-bold text-neutral-900">
            {list.length} birthday{list.length === 1 ? '' : 's'} {rangeLabel}
          </p>
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => copy(emails.join(', '), 'emails')} className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50">
                {copied === 'emails' ? 'Copied' : `Copy ${emails.length} email${emails.length === 1 ? '' : 's'}`}
              </button>
            </div>
          )}
        </div>

        {list.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-500">No member birthdays {rangeLabel}.</p>
        ) : (
          <ul className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {list.map(m => {
              const msg = messageFor(m);
              const wa = whatsappLink(m.phone, msg.body);
              const mail = emailLink(m.email, msg.subject, msg.body);
              return (
                <li key={m.id} className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-neutral-200 p-3.5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex flex-col items-center justify-center shrink-0 text-[10px] font-black leading-tight ${isToday(m) ? 'bg-brand-yellow text-neutral-900' : 'bg-brand-yellow-tint text-amber-800'}`}>
                      {formatDay(m.date).split(' ').map(p => <span key={p}>{p}</span>)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">{m.full_name || m.username}</p>
                      <p className="text-[11px] text-neutral-500 truncate">
                        {isToday(m) ? 'Today' : formatDay(m.date)} · turns {m.turning}{m.district_name ? ` · ${m.district_name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                        WhatsApp
                      </a>
                    )}
                    {mail && (
                      <a href={mail} className="px-3 py-2 rounded-lg bg-brand-green-dark text-white text-xs font-bold hover:bg-brand-green">
                        Email
                      </a>
                    )}
                    <button type="button" onClick={() => copy(`${msg.subject}\n\n${msg.body}`, m.id)} className="px-3 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-50">
                      {copied === m.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
