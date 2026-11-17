import { useState } from 'react';
import { api } from '../../lib/api.js';
import { getToken } from '../../lib/session.js';
import { Modal, Notice, Badge, Field, btn, inputCls, formatDateTime } from './donations/ui.jsx';
import Spinner from '../Spinner.jsx';

// Admin > Payments: review a member's ₹365 payment. Approve or reject it, and
// change an earlier decision later with a remark that is kept in the history.

export const paymentState = a => {
  if (a.membership_paid) return 'paid';
  if (a.payment_status === 'rejected') return 'rejected';
  if (a.payment_status === 'pending_verification' || a.payment_screenshot) return 'pending';
  return 'unpaid';
};

export const PAYMENT_LABEL = {
  paid: ['Paid', 'green'],
  pending: ['Proof sent', 'amber'],
  rejected: ['Rejected', 'rose'],
  unpaid: ['Not paid', 'grey']
};

export default function PaymentReview({ member, onClose, onDone }) {
  const state = paymentState(member);
  const decided = state === 'paid' || state === 'rejected';
  const [mode, setMode] = useState('view'); // view | approve | reject
  const [remark, setRemark] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const history = member.payment_decisions || [];

  const submit = async action => {
    if (decided && remark.trim().length < 4) { setError('Write a remark explaining why the decision is being changed.'); return; }
    setBusy(true);
    setError('');
    const res = await api('/api/admin/verify-payment', { method: 'POST', token: getToken(), body: { applicant_id: member.id, action, remark: remark.trim() } });
    setBusy(false);
    if (!res.ok) { setError(res.data?.error || 'Could not save the decision. Try again.'); return; }
    onDone({
      ...member,
      membership_paid: action === 'approve',
      payment_status: action === 'approve' ? 'paid' : 'rejected',
      receipt_no: action === 'approve' ? res.data.receipt_no : null,
      membership_paid_at: action === 'approve' ? (res.data.paid_at || new Date().toISOString()) : null,
      payment_decisions: res.data.payment_decisions || history
    }, action === 'approve'
      ? `${member.full_name || 'Payment'}: approved. Receipt ${res.data.receipt_no}.`
      : `${member.full_name || 'Payment'}: rejected.`);
  };

  const [label, tone] = PAYMENT_LABEL[state];
  const footer = mode === 'view' ? (
    <>
      {member.receipt_no && <a className={btn.secondary} href={`/api/receipts/${encodeURIComponent(member.receipt_no)}.pdf?t=${encodeURIComponent(getToken() || '')}`} target="_blank" rel="noopener noreferrer">Open receipt</a>}
      {state !== 'rejected' && state !== 'unpaid' && <button type="button" className={btn.danger} onClick={() => setMode('reject')}>{decided ? 'Change to rejected' : 'Reject'}</button>}
      {state !== 'paid' && (member.payment_screenshot || member.gateway_ref || state === 'rejected') && <button type="button" className={btn.primary} onClick={() => setMode('approve')}>{decided ? 'Change to approved' : 'Approve and issue receipt'}</button>}
    </>
  ) : (
    <>
      <button type="button" className={btn.secondary} onClick={() => { setMode('view'); setError(''); }} disabled={busy}>Back</button>
      <button type="button" className={mode === 'reject' ? btn.dangerSolid : btn.primary} onClick={() => submit(mode)} disabled={busy} aria-busy={busy || undefined}>
        {busy && <Spinner className="h-3.5 w-3.5" />}{mode === 'reject' ? 'Reject payment' : 'Approve payment'}
      </button>
    </>
  );

  return (
    <Modal title={`Payment: ${member.full_name || member.username}`} description={`${member.phone || ''}${member.district_name ? ` · ${member.district_name}` : ''}`} onClose={onClose} footer={footer} size="lg">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone={tone}>{label}</Badge>
          {member.receipt_no && <span className="font-mono text-xs text-neutral-600">{member.receipt_no}</span>}
          {member.gateway_ref && <span className="text-xs text-neutral-600">UTR <span className="font-mono">{member.gateway_ref}</span></span>}
        </div>
        {error && <Notice notice={{ tone: 'error', text: error }} />}

        {member.payment_screenshot ? (
          <a href={member.payment_screenshot} target="_blank" rel="noopener noreferrer" className="flex justify-center rounded-lg border border-neutral-200 bg-neutral-50">
            <img src={member.payment_screenshot} alt="Payment screenshot" className="max-h-[360px] w-auto object-contain" />
          </a>
        ) : <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">No screenshot was uploaded.</p>}

        {mode !== 'view' && (
          <Field
            label={decided ? 'Remark for this change *' : mode === 'reject' ? 'Reason (optional)' : 'Remark (optional)'}
            hint={decided ? 'Kept in the payment history with your name and the time.' : mode === 'approve' ? 'Approve only after you see ₹365 in the trust’s bank statement.' : 'For example: no matching credit in the bank statement.'}
          >
            {id => <textarea id={id} rows={2} maxLength={300} className={`${inputCls} py-2`} value={remark} onChange={e => setRemark(e.target.value)} />}
          </Field>
        )}

        {history.length > 0 && (
          <div>
            <h4 className="mb-1.5 text-sm font-semibold text-neutral-900">History</h4>
            <ol className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
              {history.map((h, i) => (
                <li key={i} className="px-3 py-2 text-sm">
                  <p><span className={h.action === 'approve' ? 'font-semibold text-emerald-700' : 'font-semibold text-rose-700'}>{h.action === 'approve' ? 'Approved' : 'Rejected'}</span>{h.edit && <span className="text-neutral-500"> (changed)</span>} by {h.by} · {formatDateTime(h.at)}</p>
                  {h.remark && <p className="text-xs text-neutral-600">“{h.remark}”</p>}
                  {(h.receipt_no || h.voided_receipt) && <p className="font-mono text-[0.6875rem] text-neutral-500">{h.receipt_no ? `Receipt ${h.receipt_no}` : `Receipt ${h.voided_receipt} withdrawn`}</p>}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Modal>
  );
}
