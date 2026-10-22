import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getQuestions, saveQuestion, setActiveQuestions } from '../lib/adminService.js';
import { getCurrentUser } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';

export default function ManageQuestions() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [activeIds, setActiveIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add question form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [textEn, setTextEn] = useState('');
  const [textTa, setTextTa] = useState('');
  const [category, setCategory] = useState('Commitment & Values');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    const res = await getQuestions(false);
    if (res.ok && res.data) {
      const list = res.data.questions || res.data || [];
      setQuestions(list);
      const actives = new Set(list.filter(q => q.is_active).map(q => q.id));
      setActiveIds(actives);
    }
    setLoading(false);
  };

  const handleToggle = id => {
    const next = new Set(activeIds);
    if (next.has(id)) {
      next.delete(id);
      setError('');
    } else {
      if (next.size >= 10) {
        setError('Maximum limit of 10 active interview questions reached. Deselect one first.');
        return;
      }
      next.add(id);
      setError('');
    }
    setActiveIds(next);
  };

  const handleSaveActiveSet = async () => {
    if (activeIds.size !== 10) {
      setError(`Please select exactly 10 questions for the interview (Currently selected: ${activeIds.size}).`);
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const res = await setActiveQuestions(Array.from(activeIds));
    setSaving(false);

    if (res.ok) {
      setMessage('Active 10 interview questions updated successfully!');
      loadQuestions();
    } else {
      setError(res.data?.error || 'Failed to update active questions.');
    }
  };

  const handleAddQuestion = async e => {
    e.preventDefault();
    if (!textEn.trim()) return;

    setAdding(true);
    const res = await saveQuestion({
      text_en: textEn.trim(),
      text_ta: textTa.trim(),
      category,
      max_marks: 10
    });
    setAdding(false);

    if (res.ok) {
      setTextEn('');
      setTextTa('');
      setShowAddForm(false);
      loadQuestions();
    }
  };

  return (
    <div className="bg-neutral-bg py-10 sm:py-14">
      <div className="container-page max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-brand-green-tint bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <Link to="/admin" className="text-xs font-semibold text-brand-green hover:underline">
              &larr; Back to Admin Queue
            </Link>
            <h1 className="mt-1 font-display text-2xl font-bold text-neutral-ink sm:text-3xl">
              Bilingual Interview Question Bank
            </h1>
            <p className="mt-0.5 text-xs text-neutral-muted">
              Select exactly 10 questions to appear on the official volunteer telephone scoring sheet.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn-outline min-h-tap px-4 text-xs font-semibold"
            >
              {showAddForm ? 'Close Form' : '+ Add New Question'}
            </button>
            <button
              type="button"
              onClick={handleSaveActiveSet}
              disabled={saving}
              className="btn-register min-h-tap px-5 text-xs font-bold"
            >
              {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
              Save Active 10 Set
            </button>
          </div>
        </div>

        {/* Counter and Alert */}
        <div className="flex items-center justify-between rounded-lg border border-brand-green-tint bg-brand-green-tint/40 p-4">
          <div className="text-sm">
            <strong>Active Interview Questions: </strong>
            <span className={`font-mono font-bold ${activeIds.size === 10 ? 'text-brand-green' : 'text-status-no-answer'}`}>
              {activeIds.size} / 10
            </span>
          </div>
          {activeIds.size === 10 ? (
            <span className="text-xs font-semibold text-brand-green">✓ Valid 10-Question Limit Met</span>
          ) : (
            <span className="text-xs font-semibold text-neutral-muted">Select 10 questions</span>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-status-no-answer" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-brand-green-tint p-3 text-xs font-semibold text-brand-green">
            {message}
          </div>
        )}

        {/* Add Question Form Modal */}
        {showAddForm && (
          <div className="rounded-xl border border-brand-green-tint bg-white p-6 shadow-sm">
            <h2 className="font-display text-base font-bold text-brand-green-dark border-b border-brand-green-tint pb-2">
              Add New Question in Official Module Format
            </h2>
            <form onSubmit={handleAddQuestion} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-ink">English Text</label>
                <input
                  type="text"
                  required
                  value={textEn}
                  onChange={e => setTextEn(e.target.value)}
                  placeholder="e.g. Why are you interested in community leadership?"
                  className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-ink">Tamil Translation (தமிழ்)</label>
                <input
                  type="text"
                  value={textTa}
                  onChange={e => setTextTa(e.target.value)}
                  placeholder="e.g. சமூகத் தலைமைத்துவத்தில் உங்களுக்கு ஏன் ஆர்வம் உள்ளது?"
                  className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs font-display notranslate"
                  translate="no"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-ink">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="min-h-tap block w-full rounded-lg border border-neutral-muted/40 px-3 py-2 text-xs"
                  >
                    <option value="Commitment & Values">Commitment & Values</option>
                    <option value="Leadership & Teamwork">Leadership & Teamwork</option>
                    <option value="Disaster Response">Disaster Response</option>
                    <option value="Communication">Communication</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={adding}
                    className="btn-primary min-h-tap w-full text-xs font-semibold"
                  >
                    {adding ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Save to Question Bank
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Spinner className="h-6 w-6 text-brand-green" />
            </div>
          ) : (
            questions.map(q => {
              const isChecked = activeIds.has(q.id);
              return (
                <div
                  key={q.id}
                  onClick={() => handleToggle(q.id)}
                  className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all ${
                    isChecked
                      ? 'border-brand-green bg-white shadow-sm ring-1 ring-brand-green/30'
                      : 'border-neutral-muted/20 bg-white/70 opacity-80 hover:opacity-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(q.id)}
                    className="mt-1 h-5 w-5 rounded border-neutral-muted/40 text-brand-green focus:ring-brand-green"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-brand-green-tint px-2 py-0.5 text-[10px] font-bold uppercase text-brand-green-dark">
                        {q.category || 'General'}
                      </span>
                      <span className="text-xs text-neutral-muted font-mono">Max: 10 Marks</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-neutral-ink">{q.text_en}</p>
                    {q.text_ta && (
                      <p className="mt-0.5 text-xs text-brand-green-dark font-medium notranslate" translate="no">
                        {q.text_ta}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${isChecked ? 'text-brand-green' : 'text-neutral-muted'}`}>
                    {isChecked ? 'Active' : 'Inactive'}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
