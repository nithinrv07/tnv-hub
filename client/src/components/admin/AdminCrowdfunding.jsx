import { useCallback, useEffect, useMemo, useState } from 'react';
import Spinner from '../Spinner.jsx';
import { getAdminCampaigns, createCampaign, updateCampaign, deleteCampaign, errorText } from '../../lib/donationService.js';
import {
  inr, formatDate, todayISO, btn, inputCls, PageHeader, StatGrid, Badge, Notice, Card, Loading, Empty,
  Tabs, Field, Modal, ConfirmDialog, SubmitButton, TABLE
} from './donations/ui.jsx';

// Admin > Crowdfunding Campaigns. A campaign is written as a draft, published
// (shown on the public Campaigns page), paused or completed. "Raised" counts
// verified online donations plus anything entered as collected offline.

const CATEGORIES = ['Education', 'Environment', 'Disaster Relief', 'Healthcare', 'Civic Action', 'Nutrition'];
const STATUS = {
  DRAFT: { label: 'Draft', tone: 'grey' },
  ACTIVE: { label: 'Live', tone: 'green' },
  PAUSED: { label: 'Paused', tone: 'amber' },
  COMPLETED: { label: 'Completed', tone: 'blue' }
};
const EMPTY = { title: '', category: 'Education', target_amount: '', end_date: '', cover_image: '', story: '', featured: false, status: 'DRAFT', offline_raised: '', offline_donor_count: '' };

export default function AdminCrowdfunding() {
  const [state, setState] = useState({ loading: true, list: [], error: '' });
  const [tab, setTab] = useState('all');
  const [notice, setNotice] = useState(null);
  const [editing, setEditing] = useState(null); // campaign or {} for new
  const [confirm, setConfirm] = useState(null); // { campaign, action }
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await getAdminCampaigns();
    setState({ loading: false, list: res.campaigns, error: res.ok ? '' : res.error });
  }, []);
  useEffect(() => { load(); }, [load]);

  const list = state.list;
  const count = s => list.filter(c => c.status === s).length;
  const shown = useMemo(() => (tab === 'all' ? list : list.filter(c => c.status === tab)), [list, tab]);
  const raised = list.reduce((s, c) => s + Number(c.raised_amount || 0), 0);
  const pending = list.reduce((s, c) => s + Number(c.pending_count || 0), 0);

  const stats = [
    { label: 'Live campaigns', value: count('ACTIVE'), note: `${count('DRAFT')} draft${count('DRAFT') === 1 ? '' : 's'}, ${count('PAUSED')} paused` },
    { label: 'Raised so far', value: inr(raised), note: 'Verified donations and offline collections' },
    { label: 'Donations to verify', value: pending, note: pending ? 'Not counted until verified' : 'All caught up', attention: pending ? 'amber' : null },
    { label: 'Completed', value: count('COMPLETED'), note: 'Closed to new donations' }
  ];

  const runConfirm = async () => {
    const { campaign: c, action } = confirm;
    setBusy(true);
    const res = action === 'delete' ? await deleteCampaign(c.id) : await updateCampaign(c.id, { status: action });
    setBusy(false);
    setConfirm(null);
    if (!res.ok) { setNotice({ tone: 'error', text: errorText(res) }); return; }
    const verb = { delete: 'deleted', ACTIVE: 'is now live', PAUSED: 'is paused', COMPLETED: 'is marked completed', DRAFT: 'moved back to drafts' }[action];
    setNotice({ tone: 'ok', text: `“${c.title}” ${verb}.` });
    load();
  };

  const CONFIRM_TEXT = {
    ACTIVE: ['Publish campaign', 'It will appear on the public Campaigns page and accept donations.'],
    PAUSED: ['Pause campaign', 'It stays visible only to admins and stops taking new donations until you resume it.'],
    COMPLETED: ['Mark as completed', 'It stops taking donations and shows as completed on the public page.'],
    delete: ['Delete campaign', 'This removes the draft permanently. Campaigns that have received donations cannot be deleted.']
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title="Crowdfunding campaigns"
        description="Causes shown on the public Campaigns page. Only verified donations count towards a campaign’s total, so the progress donors see is money the trust has actually received."
        actions={(
          <>
            <button type="button" className={btn.primary} onClick={() => setEditing({})}>New campaign</button>
            <button type="button" className={btn.secondary} onClick={load} disabled={state.loading}>{state.loading && <Spinner className="h-3.5 w-3.5" />}Refresh</button>
          </>
        )}
      />
      <StatGrid items={stats} />
      <Notice notice={notice} onClose={() => setNotice(null)} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 p-4">
          <Tabs
            label="Filter campaigns"
            value={tab}
            onChange={setTab}
            tabs={[{ id: 'all', label: 'All', count: list.length }, ...Object.entries(STATUS).map(([id, s]) => ({ id, label: s.label, count: count(id) }))]}
          />
          <a href="/campaigns" target="_blank" rel="noopener noreferrer" className={btn.link}>View public page</a>
        </div>
        {state.loading && !list.length ? <Loading label="Loading campaigns…" /> : state.error ? (
          <div className="p-4"><Notice notice={{ tone: 'error', text: state.error }} /></div>
        ) : !shown.length ? (
          <Empty title={list.length ? 'No campaigns with this status' : 'No campaigns yet'} action={!list.length && <button type="button" className={btn.primary} onClick={() => setEditing({})}>Create the first campaign</button>}>
            {!list.length && 'Write a campaign as a draft, then publish it when the story and target are ready.'}
          </Empty>
        ) : (
          <div className={TABLE.wrap}>
            <table className={TABLE.table}>
              <thead className={TABLE.head}>
                <tr>
                  <th scope="col" className={TABLE.th}>Campaign</th>
                  <th scope="col" className={`${TABLE.th} min-w-[12rem]`}>Progress</th>
                  <th scope="col" className={TABLE.th}>Ends</th>
                  <th scope="col" className={TABLE.th}>Status</th>
                  <th scope="col" className={`${TABLE.th} text-right`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(c => {
                  const pct = c.target_amount ? Math.min(100, Math.round((c.raised_amount / c.target_amount) * 100)) : 0;
                  const ended = c.end_date && c.end_date < todayISO();
                  const deletable = !c.donor_count && !c.pending_count && c.status !== 'ACTIVE';
                  return (
                    <tr key={c.id} className={TABLE.row}>
                      <td className={`${TABLE.td} max-w-xs`}>
                        <p className="font-semibold text-neutral-900">{c.title}{c.featured && <span className="ml-2 align-middle"><Badge tone="amber">Featured</Badge></span>}</p>
                        <p className="text-xs text-neutral-muted">{c.category}</p>
                      </td>
                      <td className={TABLE.td}>
                        <div className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="font-semibold tabular-nums text-neutral-900">{inr(c.raised_amount)}</span>
                          <span className="tabular-nums text-neutral-muted">of {inr(c.target_amount)}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% of target`}>
                          <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="mt-1 text-[11px] text-neutral-muted">
                          {c.donor_count} donor{c.donor_count === 1 ? '' : 's'} · {pct}%
                          {c.pending_count > 0 && <span className="text-amber-700"> · {c.pending_count} to verify</span>}
                        </p>
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap text-xs ${ended && c.status === 'ACTIVE' ? 'text-rose-700' : 'text-neutral-600'}`}>
                        {c.end_date ? formatDate(c.end_date) : 'No end date'}
                        {ended && c.status === 'ACTIVE' && <p>Past end date</p>}
                      </td>
                      <td className={TABLE.td}><Badge tone={STATUS[c.status]?.tone}>{STATUS[c.status]?.label || c.status}</Badge></td>
                      <td className={`${TABLE.td} text-right`}>
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button type="button" className={btn.small} onClick={() => setEditing(c)}>Edit</button>
                          {(c.status === 'DRAFT' || c.status === 'PAUSED') && <button type="button" className={btn.smallPrimary} onClick={() => setConfirm({ campaign: c, action: 'ACTIVE' })}>{c.status === 'DRAFT' ? 'Publish' : 'Resume'}</button>}
                          {c.status === 'ACTIVE' && <button type="button" className={btn.small} onClick={() => setConfirm({ campaign: c, action: 'PAUSED' })}>Pause</button>}
                          {(c.status === 'ACTIVE' || c.status === 'PAUSED') && <button type="button" className={btn.small} onClick={() => setConfirm({ campaign: c, action: 'COMPLETED' })}>Complete</button>}
                          {deletable && <button type="button" className={`${btn.small} text-rose-700`} onClick={() => setConfirm({ campaign: c, action: 'delete' })}>Delete</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <CampaignEditor
          campaign={editing}
          onClose={() => setEditing(null)}
          onSaved={(c, isNew) => { setEditing(null); setNotice({ tone: 'ok', text: isNew ? `“${c.title}” saved${c.status === 'ACTIVE' ? ' and published' : ' as a draft'}.` : `“${c.title}” updated.` }); load(); }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={CONFIRM_TEXT[confirm.action][0]}
          confirmLabel={CONFIRM_TEXT[confirm.action][0]}
          tone={confirm.action === 'delete' ? 'danger' : 'primary'}
          busy={busy}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        >
          <p><strong>{confirm.campaign.title}</strong></p>
          <p className="mt-1">{CONFIRM_TEXT[confirm.action][1]}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function CampaignEditor({ campaign, onClose, onSaved }) {
  const isNew = !campaign.id;
  const [form, setForm] = useState(() => (isNew ? EMPTY : {
    ...EMPTY,
    ...campaign,
    end_date: campaign.end_date || '',
    cover_image: campaign.cover_image || '',
    offline_raised: campaign.offline_raised || '',
    offline_donor_count: campaign.offline_donor_count || ''
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState({ text: '', field: '' });
  const [imgOk, setImgOk] = useState(true);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const err = f => (error.field === f ? error.text : '');

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError({ text: '', field: '' });
    const payload = {
      title: form.title.trim(),
      category: form.category,
      target_amount: Number(form.target_amount),
      end_date: form.end_date || '',
      cover_image: form.cover_image.trim(),
      story: form.story.trim(),
      featured: form.featured,
      ...(isNew ? { status: form.status } : {}),
      ...(!isNew ? { offline_raised: Number(form.offline_raised) || 0, offline_donor_count: Number(form.offline_donor_count) || 0 } : {})
    };
    const res = isNew ? await createCampaign(payload) : await updateCampaign(campaign.id, payload);
    setBusy(false);
    if (!res.ok) { setError({ text: errorText(res), field: res.data?.field || '' }); return; }
    onSaved(res.data.campaign, isNew);
  };

  return (
    <Modal
      title={isNew ? 'New campaign' : 'Edit campaign'}
      description={isNew ? 'Save as a draft first if the story or photo is not ready.' : `${STATUS[campaign.status]?.label || campaign.status} · created ${formatDate(campaign.created_at)}`}
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <button type="button" className={btn.secondary} onClick={onClose}>Cancel</button>
          <SubmitButton form="campaign-form" busy={busy}>{isNew ? (form.status === 'ACTIVE' ? 'Save and publish' : 'Save draft') : 'Save changes'}</SubmitButton>
        </>
      )}
    >
      <form id="campaign-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {error.text && !error.field && <div className="sm:col-span-2"><Notice notice={{ tone: 'error', text: error.text }} /></div>}
        <Field label="Title" className="sm:col-span-2" error={err('title')}>{id => <input id={id} className={inputCls} value={form.title} maxLength={140} onChange={e => set('title', e.target.value)} placeholder="School bags for 200 children in Kallakurichi" />}</Field>
        <Field label="Cause">
          {id => <select id={id} className={inputCls} value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>}
        </Field>
        <Field label="Target (₹)" error={err('target_amount')} hint="At least ₹1,000.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.target_amount} onChange={e => set('target_amount', e.target.value.replace(/\D/g, ''))} />}</Field>
        <Field label="End date" error={err('end_date')} hint="Optional.">{id => <input id={id} type="date" className={inputCls} min={isNew ? todayISO() : undefined} value={form.end_date} onChange={e => set('end_date', e.target.value)} />}</Field>
        {isNew ? (
          <Field label="Status">
            {id => (
              <select id={id} className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="DRAFT">Draft (not public yet)</option>
                <option value="ACTIVE">Live on the public page</option>
              </select>
            )}
          </Field>
        ) : <div className="hidden sm:block" />}
        <Field label="Story" className="sm:col-span-2" error={err('story')} hint="Who it helps, what the money buys and how you will report back. Needed before publishing.">
          {id => <textarea id={id} rows={5} className={`${inputCls} py-2`} value={form.story} maxLength={4000} onChange={e => set('story', e.target.value)} />}
        </Field>
        <Field label="Cover photo link" className="sm:col-span-2" error={err('cover_image')} hint="An https:// link to a real photo of the work. Leave blank to show the cause’s icon.">
          {id => <input id={id} className={inputCls} value={form.cover_image} onChange={e => { set('cover_image', e.target.value); setImgOk(true); }} placeholder="https://" />}
        </Field>
        {form.cover_image.startsWith('https://') && (
          <div className="sm:col-span-2">
            {imgOk
              ? <img src={form.cover_image} alt="Cover preview" onError={() => setImgOk(false)} className="h-36 w-full rounded-lg border border-neutral-200 object-cover" />
              : <p className="text-xs text-rose-700">This link did not load as an image.</p>}
          </div>
        )}
        {!isNew && (
          <>
            <Field label="Collected offline (₹)" hint="Cash or cheques given at events, not entered as donations.">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.offline_raised} onChange={e => set('offline_raised', e.target.value.replace(/\D/g, ''))} />}</Field>
            <Field label="Offline donors">{id => <input id={id} className={inputCls} inputMode="numeric" value={form.offline_donor_count} onChange={e => set('offline_donor_count', e.target.value.replace(/\D/g, ''))} />}</Field>
          </>
        )}
        <label className="flex items-center gap-2.5 text-sm text-neutral-800 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 accent-brand-green" checked={form.featured} onChange={e => set('featured', e.target.checked)} />
          Feature this campaign at the top of the public page
        </label>
      </form>
    </Modal>
  );
}
