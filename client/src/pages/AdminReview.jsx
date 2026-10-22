import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getQueue,
  revealAadhaar,
  logCall,
  getCallLogs,
  getQuestions,
  getScores,
  saveScores,
  approveApplicant
} from '../lib/adminService.js';
import { getCurrentUser } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';

export default function AdminReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [applicant, setApplicant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Aadhaar reveal
  const [revealedAadhaar, setRevealedAadhaar] = useState('');
  const [showAadhaarModal, setShowAadhaarModal] = useState(false);
  const [masterKey, setMasterKey] = useState('');
  const [aadhaarLoading, setAadhaarLoading] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  // Call Logger
  const [callOutcome, setCallOutcome] = useState('Attending');
  const [callNotes, setCallNotes] = useState('');
  const [callLogs, setCallLogs] = useState([]);
  const [callLoading, setCallLoading] = useState(false);
  const [callMessage, setCallMessage] = useState('');

  // Questions & Scoring
  const [questions, setQuestions] = useState([]);
  const [scores, setScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);
  const [scoreMessage, setScoreMessage] = useState('');

  // Official Decision
  const [decision, setDecision] = useState('approved');
  const [assignedWing, setAssignedWing] = useState('Youth Wing');
  const [assignedRole, setAssignedRole] = useState('District Coordinator');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [decisionMessage, setDecisionMessage] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    // Fetch queue to find applicant details
    const qRes = await getQueue();
    if (qRes.ok && qRes.data) {
      const list = Array.isArray(qRes.data.queue)
        ? qRes.data.queue
        : Array.isArray(qRes.data.applicants)
        ? qRes.data.applicants
        : Array.isArray(qRes.data.profiles)
        ? qRes.data.profiles
        : Array.isArray(qRes.data)
        ? qRes.data
        : [];
      const found = list.find(a => String(a.id) === String(id));
      if (found) {
        setApplicant(found);
        setAssignedWing(found.wing || 'Youth Wing');
      } else {
        setError('Applicant not found in verification queue.');
      }
    }

    // Fetch call logs, questions, and scores
    const [cRes, qResActive, sRes] = await Promise.all([
      getCallLogs(id),
      getQuestions(true),
      getScores(id)
    ]);

    if (cRes.ok && cRes.data) {
      setCallLogs(Array.isArray(cRes.data.call_logs) ? cRes.data.call_logs : Array.isArray(cRes.data.logs) ? cRes.data.logs : []);
    }
    if (qResActive.ok && qResActive.data) {
      setQuestions(Array.isArray(qResActive.data.questions) ? qResActive.data.questions : Array.isArray(qResActive.data) ? qResActive.data : []);
    }
    if (sRes.ok && sRes.data) {
      setScores((sRes.data && typeof sRes.data.scores === 'object') ? sRes.data.scores : {});
    }

    setLoading(false);
  };

  // Score calculations
  const totalScore = Object.values(scores).reduce((sum, val) => sum + (Number(val) || 0), 0);

  const getSuggestedRole = score => {
    if (score >= 80) return 'State Executive / District Lead';
    if (score >= 60) return 'Wing Secretary / Taluk Lead';
    if (score >= 40) return 'Active Field Volunteer';
    return 'General Volunteer / Supporter';
  };

  const handleRevealAadhaar = async e => {
    e.preventDefault();
    if (!masterKey.trim()) return;
    setAadhaarLoading(true);
    setAadhaarError('');

    const res = await revealAadhaar(id, masterKey.trim());
    setAadhaarLoading(false);
    if (res.ok && res.data?.aadhaar_number) {
      setRevealedAadhaar(res.data.aadhaar_number);
      setShowAadhaarModal(false);
      setMasterKey('');
    } else {
      setAadhaarError(res.data?.error || 'Invalid master key.');
    }
  };

  const handleLogCall = async e => {
    e.preventDefault();
    setCallLoading(true);
    setCallMessage('');

    const res = await logCall({
      profile_id: id,
      status: callOutcome,
      notes: callNotes.trim()
    });

    setCallLoading(false);
    if (res.ok) {
      setCallMessage(`Call log recorded successfully as: ${callOutcome}`);
      setCallNotes('');
      const cRes = await getCallLogs(id);
      if (cRes.ok && cRes.data) setCallLogs(cRes.data.call_logs || cRes.data.logs || []);
    }
  };

  const handleSaveScores = async () => {
    setSavingScores(true);
    setScoreMessage('');

    const res = await saveScores({
      profile_id: id,
      scores,
      total_score: totalScore,
      suggested_role: getSuggestedRole(totalScore)
    });

    setSavingScores(false);
    if (res.ok) {
      setScoreMessage(`Scores saved! Total: ${totalScore}/100 - ${getSuggestedRole(totalScore)}`);
    }
  };

  const handleApproveDecision = async e => {
    e.preventDefault();
    setApproving(true);
    setDecisionMessage('');

    const res = await approveApplicant({
      profile_id: id,
      decision,
      assigned_wing: assignedWing,
      assigned_role: assignedRole,
      notes: decisionNotes.trim()
    });

    setApproving(false);
    if (res.ok) {
      setDecisionMessage(`Applicant successfully ${decision}!`);
      setTimeout(() => {
        navigate('/admin');
      }, 1500);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-brand-green" />
      </div>
    );
  }

  if (error || !applicant) {
    return (
      <div className="bg-neutral-bg py-16 sm:py-24">
        <div className="container-page max-w-lg text-center">
          <h1 className="font-display text-2xl font-bold text-neutral-ink">Applicant Not Found</h1>
          <p className="mt-2 text-sm text-neutral-muted">{error}</p>
          <div className="mt-6">
            <Link to="/admin" className="btn-primary min-h-tap inline-flex items-center px-6">
              &larr; Back to Admin Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-bg py-10 sm:py-14">
      <div className="container-page max-w-6xl space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <Link to="/admin" className="text-sm font-semibold text-brand-green hover:underline">
            &larr; Back to Applicant Queue
          </Link>
          <span className="text-xs uppercase font-mono text-neutral-muted">Reviewing ID #{applicant.id}</span>
        </div>

        {/* Top Header Card */}
        <div className="rounded-xl border border-brand-green-tint bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <span className="inline-block rounded-full bg-brand-yellow-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-green-dark">
                Applicant Verification Dossier
              </span>
              <h1 className="mt-1 font-display text-2xl font-bold text-neutral-ink sm:text-3xl">
                {applicant.full_name}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-muted">
                @{applicant.username} &bull; +91 {applicant.phone || '-'} &bull; {applicant.district_name || 'Tamil Nadu'}
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${
                  applicant.status === 'approved'
                    ? 'bg-brand-green-tint text-brand-green'
                    : applicant.status === 'rejected'
                    ? 'bg-red-50 text-status-no-answer'
                    : 'bg-brand-yellow-tint text-brand-green-dark'
                }`}
              >
                {applicant.status === 'approved' ? 'Approved' : applicant.status === 'rejected' ? 'Rejected' : 'Under Review'}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Split: Left = Dossier & Call Logger, Right = 10-Question Score Sheet & Approval */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* LEFT COLUMN: Profile Dossier & Call Log History */}
          <div className="space-y-6">
            {/* 1. Dossier Details */}
            <div className="rounded-xl border border-neutral-muted/20 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-green-dark border-b border-brand-green-tint pb-2">
                Volunteer Background Details
              </h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-xs">
                <div>
                  <dt className="font-semibold text-neutral-muted">District & Area</dt>
                  <dd className="mt-0.5 text-neutral-ink font-medium">{applicant.district_name || '-'} ({applicant.district_area || 'Area not specified'})</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-muted">Pincode</dt>
                  <dd className="mt-0.5 font-mono text-neutral-ink">{applicant.pincode || '-'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-muted">Blood Group</dt>
                  <dd className="mt-0.5 font-bold text-brand-green-dark">{applicant.blood_group || '-'}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-neutral-muted">Work / Study Status</dt>
                  <dd className="mt-0.5 text-neutral-ink">{applicant.work_study_status || 'Employed'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-neutral-muted">Selected Wing & Dept</dt>
                  <dd className="mt-0.5 text-brand-green-dark font-semibold">
                    {applicant.wing || 'Youth Wing'} &mdash; {applicant.department || 'General Volunteer'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-semibold text-neutral-muted">Past Community Works</dt>
                  <dd className="mt-0.5 text-neutral-ink italic bg-neutral-bg p-2 rounded">
                    "{applicant.previous_works || 'Nil'}"
                  </dd>
                </div>
              </dl>

              {/* Aadhaar Reveal Area */}
              <div className="mt-6 border-t border-brand-green-tint pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-neutral-muted">Aadhaar Identity (AES-256)</span>
                    <span className="font-mono text-sm font-bold text-neutral-ink">
                      {revealedAadhaar ? (
                        <span className="text-brand-green font-extrabold">{revealedAadhaar}</span>
                      ) : (
                        `XXXX-XXXX-${applicant.aadhaar_last4 || '****'}`
                      )}
                    </span>
                  </div>
                  {!revealedAadhaar && (
                    <button
                      type="button"
                      onClick={() => setShowAadhaarModal(true)}
                      className="btn-outline min-h-tap px-3 py-1 text-xs font-semibold"
                    >
                      Reveal (Master Admin)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Telephone Call Logger */}
            <div className="rounded-xl border border-neutral-muted/20 bg-white p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-green-dark border-b border-brand-green-tint pb-2">
                Telephone Verification Call Logger
              </h2>

              {callMessage && (
                <div className="my-3 rounded-lg bg-brand-green-tint p-2.5 text-xs font-semibold text-brand-green">
                  {callMessage}
                </div>
              )}

              <form onSubmit={handleLogCall} className="mt-4 space-y-3">
                <div>
                  <label htmlFor="callOutcome" className="mb-1 block text-xs font-semibold text-neutral-ink">Call Screening Status *</label>
                  <select
                    id="callOutcome"
                    value={callOutcome}
                    onChange={e => setCallOutcome(e.target.value)}
                    className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs text-neutral-ink font-semibold"
                  >
                    <option value="Attending">Attending (Connected & Available)</option>
                    <option value="Not Attending">Not Attending (Declined or Withdrawn)</option>
                    <option value="Postponed">Postponed (Candidate Busy / Postponed)</option>
                    <option value="No Answer">No Answer (Ringing / Switched Off)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="callNotes" className="mb-1 block text-xs font-semibold text-neutral-ink">Call Discussion Notes</label>
                  <textarea
                    id="callNotes"
                    rows={2}
                    value={callNotes}
                    onChange={e => setCallNotes(e.target.value)}
                    placeholder="Enter key details discussed with the volunteer..."
                    className="block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs text-neutral-ink focus:border-brand-green focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={callLoading}
                  className="btn-primary min-h-tap w-full text-xs font-semibold shadow-sm"
                >
                  {callLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Record Call Attempt
                </button>
              </form>

              {/* Call History Timeline */}
              <div className="mt-6 border-t border-brand-green-tint pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-muted">Previous Call Attempts</h3>
                {callLogs.length === 0 ? (
                  <p className="mt-2 text-xs text-neutral-muted">No calls recorded yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {callLogs.map((log, idx) => (
                      <div key={idx} className="rounded-lg bg-neutral-bg p-2.5 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-brand-green-dark">{log.outcome}</span>
                          <span className="text-neutral-muted">{new Date(log.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {log.notes && <p className="mt-1 text-neutral-ink italic">"{log.notes}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 10-Question Bilingual Score Sheet & Official Decision */}
          <div className="space-y-6">
            {/* 1. Bilingual Interview Scoring Sheet */}
            <div className="rounded-xl border border-neutral-muted/20 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-brand-green-tint pb-3">
                <div>
                  <h2 className="font-display text-lg font-bold text-brand-green-dark">
                    Bilingual Interview Scoring (10 Questions)
                  </h2>
                  <p className="text-xs text-neutral-muted">Enter marks (0–10) per question to calculate role placement.</p>
                </div>
                <div className="rounded-lg bg-brand-green px-3 py-1.5 text-center text-white">
                  <span className="block text-[10px] uppercase font-bold tracking-wider">Total Score</span>
                  <span className="font-mono text-xl font-extrabold">{totalScore} / 100</span>
                </div>
              </div>

              {/* Suggested Role Pill */}
              <div className="my-3 rounded-lg border border-brand-yellow/40 bg-brand-yellow-tint/50 p-2.5 text-xs">
                <strong>Recommended Role Band: </strong>
                <span className="font-bold text-brand-green-dark">{getSuggestedRole(totalScore)}</span>
              </div>

              {scoreMessage && (
                <div className="my-3 rounded-lg bg-brand-green-tint p-2 text-xs font-semibold text-brand-green">
                  {scoreMessage}
                </div>
              )}

              {/* Questions List */}
              <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 divide-y divide-neutral-muted/10">
                {questions.map((q, idx) => (
                  <div key={q.id} className="pt-3 first:pt-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-xs font-bold text-neutral-ink">Q{idx + 1}. {q.text_en}</span>
                        {q.text_ta && (
                          <div className="text-xs text-brand-green-dark font-medium notranslate" translate="no">
                            {q.text_ta}
                          </div>
                        )}
                      </div>
                      <div className="w-16">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={scores[q.id] ?? ''}
                          onChange={e => {
                            const val = Math.min(10, Math.max(0, Number(e.target.value) || 0));
                            setScores(s => ({ ...s, [q.id]: val }));
                          }}
                          placeholder="0-10"
                          className="min-h-tap block w-full rounded border border-neutral-muted/40 text-center font-mono text-sm font-bold text-brand-green-dark focus:border-brand-green focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-brand-green-tint pt-3">
                <button
                  type="button"
                  onClick={handleSaveScores}
                  disabled={savingScores}
                  className="btn-outline min-h-tap w-full text-xs font-semibold"
                >
                  {savingScores ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Save Marks & Recommendations
                </button>
              </div>
            </div>

            {/* 2. Official Verification Decision */}
            <div className="rounded-xl border border-brand-green/30 bg-brand-green-tint/30 p-6 shadow-sm">
              <h2 className="font-display text-lg font-bold text-brand-green-dark border-b border-brand-green pb-2">
                Official Verification Decision & Appointment
              </h2>

              {decisionMessage && (
                <div className="my-3 rounded-lg bg-brand-green p-3 text-xs font-bold text-white">
                  {decisionMessage}
                </div>
              )}

              <form onSubmit={handleApproveDecision} className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="decisionSelect" className="mb-1 block text-xs font-semibold text-neutral-ink">Decision</label>
                    <select
                      id="decisionSelect"
                      value={decision}
                      onChange={e => setDecision(e.target.value)}
                      className="min-h-tap block w-full rounded-lg border border-brand-green/40 bg-white px-3 py-2 text-xs font-bold text-brand-green-dark"
                    >
                      <option value="approved">Approve & Issue Credentials</option>
                      <option value="rejected">Reject Application</option>
                      <option value="under_review">Hold / Need Follow-up</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="wingSelect" className="mb-1 block text-xs font-semibold text-neutral-ink">Assigned Wing</label>
                    <select
                      id="wingSelect"
                      value={assignedWing}
                      onChange={e => setAssignedWing(e.target.value)}
                      className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 bg-white px-3 py-2 text-xs text-neutral-ink"
                    >
                      <option value="Youth Wing">Youth Wing</option>
                      <option value="Women Wing">Women Wing</option>
                      <option value="Students Wing">Students Wing</option>
                      <option value="IT & Social Media Wing">IT & Social Media Wing</option>
                      <option value="Farmers Wing">Farmers Wing</option>
                      <option value="Lawyers Wing">Lawyers Wing</option>
                      <option value="Medical Wing">Medical Wing</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="roleInput" className="mb-1 block text-xs font-semibold text-neutral-ink">Official Assigned Role</label>
                  <input
                    id="roleInput"
                    type="text"
                    value={assignedRole}
                    onChange={e => setAssignedRole(e.target.value)}
                    placeholder="e.g. District Coordinator, Taluk Secretary"
                    className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 bg-white px-3 py-2 text-xs font-medium text-neutral-ink"
                  />
                </div>

                <div>
                  <label htmlFor="notesInput" className="mb-1 block text-xs font-semibold text-neutral-ink">Official Verification Notes</label>
                  <textarea
                    id="notesInput"
                    rows={2}
                    value={decisionNotes}
                    onChange={e => setDecisionNotes(e.target.value)}
                    placeholder="Enter approval rationale or reasons for rejection..."
                    className="block w-full rounded-lg border border-neutral-muted/40 bg-white px-3 py-2 text-xs text-neutral-ink"
                  />
                </div>

                <button
                  type="submit"
                  disabled={approving}
                  className="btn-register min-h-tap w-full text-sm font-bold shadow-md"
                >
                  {approving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  Submit Official Verification Decision &rarr;
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Master Admin Aadhaar Modal */}
        {showAadhaarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
              <h3 className="font-display text-lg font-bold text-neutral-ink">Master Admin Aadhaar Reveal</h3>
              <p className="mt-1 text-xs text-neutral-muted">
                Requires authorized Master Admin key. All decryptions are logged in audit tables.
              </p>

              {aadhaarError && (
                <div className="mt-3 text-xs font-semibold text-status-no-answer">{aadhaarError}</div>
              )}

              <form onSubmit={handleRevealAadhaar} className="mt-4 space-y-3">
                <input
                  type="password"
                  value={masterKey}
                  onChange={e => setMasterKey(e.target.value)}
                  placeholder="Enter Master Security Key"
                  className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs font-mono"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={aadhaarLoading}
                    className="btn-primary min-h-tap flex-1 text-xs font-semibold"
                  >
                    {aadhaarLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Decrypt & Reveal
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAadhaarModal(false)}
                    className="btn-outline min-h-tap px-3 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
