// Shows a volunteer's past field work: the areas they selected at registration
// (past_field_work) as chips, plus any free-text notes (previous_works) that add
// something beyond the selections. Shows "Not provided" only when both are empty.
export function fieldWorkItems(record) {
  const raw = record?.past_field_work;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    // Supabase may return a Postgres array literal or a comma list
    return raw.replace(/^\{|\}$/g, '').split(',').map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
  }
  return [];
}

export default function FieldWorkList({ record, className = '' }) {
  const items = fieldWorkItems(record);
  const notes = (record?.previous_works || record?.previous_experience || '').trim();
  // The server saves the joined selections as previous_works when no notes were
  // typed, so only show notes that say something the chips don't
  const notesAddInfo = notes && notes !== items.join(', ') && !(items.includes('Fresher') && /^fresher$/i.test(notes));

  if (!items.length && !notes) {
    return <span className={`text-neutral-500 ${className}`}>Not provided</span>;
  }

  return (
    <div className={className}>
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Past field work">
          {items.map(item => (
            <li
              key={item}
              className="rounded-full border border-brand-green/30 bg-brand-green-tint px-2.5 py-0.5 text-xs font-semibold text-brand-green-dark"
            >
              {item === 'Fresher' ? 'Fresher (no prior field work)' : item}
            </li>
          ))}
        </ul>
      )}
      {(notesAddInfo || !items.length) && (
        <p className={`text-sm leading-relaxed text-neutral-800 ${items.length ? 'mt-2' : ''}`}>{notes}</p>
      )}
    </div>
  );
}
