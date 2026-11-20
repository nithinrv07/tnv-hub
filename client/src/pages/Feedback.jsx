import { useState } from 'react';
import { submitVisitorQuery, lookupVisitorQuery } from '../lib/supportService.js';
import Spinner from '../components/Spinner.jsx';

const STATUS_CONFIG = {
  new: { label: 'Pending Review', bg: 'bg-amber-50 text-amber-800 border-amber-200' },
  in_progress: { label: 'Under Review', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
  resolved: { label: 'Resolved', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
};

export default function Feedback() {
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'lookup'

  // Submit Form State
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Lookup Form State
  const [lookupName, setLookupName] = useState('');
  const [lookupMobile, setLookupMobile] = useState('');
  const [lookupTicket, setLookupTicket] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupResults, setLookupResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmittedTicket(null);

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
    if (cleanMobile.length !== 10) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    const res = await submitVisitorQuery({
      name: name.trim(),
      mobile: cleanMobile,
      email: email.trim(),
      subject: subject.trim(),
      message: message.trim()
    });
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(res.error || 'Failed to submit query. Please try again.');
      return;
    }

    setSubmittedTicket(res);
    // Reset form fields
    setName('');
    setMobile('');
    setEmail('');
    setSubject('');
    setMessage('');
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupResults(null);

    const cleanMobile = lookupMobile.replace(/\D/g, '').slice(-10);
    if (!lookupTicket.trim() && (!lookupName.trim() || cleanMobile.length !== 10)) {
      setLookupError('Please enter both your Name and 10-digit Mobile Number, or enter your Reference Ticket Code.');
      return;
    }

    setLookingUp(true);
    const res = await lookupVisitorQuery({
      name: lookupName.trim(),
      mobile: cleanMobile,
      ticket: lookupTicket.trim().toUpperCase()
    });
    setLookingUp(false);

    if (!res.ok) {
      setLookupError(res.error || 'Failed to search for queries.');
      return;
    }

    setLookupResults(res.items || []);
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-10 sm:py-14">
      <div className="container-page max-w-4xl">
        {/* Page Header */}
        <div className="text-center">
          <span className="font-display text-xs font-bold uppercase tracking-wider text-brand-green sm:text-sm">
            Public Helpdesk & Feedback
          </span>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-brand-green-dark sm:text-4xl">
            Visitor Feedback & Enquiries
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600 sm:text-base">
            Have questions about joining TNV, volunteering in your district, or partnering with us? 
            Submit your query below or check the answer to your previous inquiry.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl bg-neutral-200/80 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => { setActiveTab('submit'); setSubmitError(''); }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'submit'
                  ? 'bg-white text-brand-green-dark shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Submit an Enquiry</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('lookup'); setLookupError(''); }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all ${
                activeTab === 'lookup'
                  ? 'bg-white text-brand-green-dark shadow-sm'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Check Query Status & Replies</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Submit Form */}
        {activeTab === 'submit' && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-10">
            {submittedTicket && (
              <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-emerald-950">
                      Query Submitted Successfully!
                    </h2>
                    <p className="mt-1 text-sm text-emerald-800">
                      Your query has been registered with reference code:{' '}
                      <strong className="font-mono font-bold text-emerald-900">{submittedTicket.ticket_number}</strong>
                    </p>
                    <p className="mt-2 text-xs text-emerald-700">
                      We have dispatched a confirmation email to your address. You can also return to this page anytime, 
                      click <strong>"Check Query Status & Replies"</strong>, and enter your Mobile Number and Name to view our response.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {submitError && (
              <div className="mb-6 rounded-lg bg-rose-50 p-4 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-name" className="block text-sm font-semibold text-neutral-800">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="fb-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. S. Karthikeyan"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 transition-colors focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label htmlFor="fb-mobile" className="block text-sm font-semibold text-neutral-800">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="fb-mobile"
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="10-digit mobile number"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 transition-colors focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="fb-email" className="block text-sm font-semibold text-neutral-800">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 transition-colors focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                <div>
                  <label htmlFor="fb-subject" className="block text-sm font-semibold text-neutral-800">
                    Subject / Topic <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="fb-subject"
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Question about volunteering drives"
                    className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 transition-colors focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fb-message" className="block text-sm font-semibold text-neutral-800">
                  Your Message or Enquiry <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="fb-message"
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Please describe your enquiry in detail so our team can provide a precise response..."
                  className="mt-1.5 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 p-4 text-sm text-neutral-900 transition-colors focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full bg-brand-green-dark px-8 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Spinner className="h-4 w-4 text-white" />
                      <span>Sending Query...</span>
                    </>
                  ) : (
                    <span>Submit Enquiry</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Status & Reply Lookup */}
        {activeTab === 'lookup' && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5 sm:p-8">
              <h2 className="font-display text-lg font-bold text-neutral-900">
                Track Query Status & View Official Replies
              </h2>
              <p className="mt-1 text-sm text-neutral-600">
                Enter your Name and Mobile Number used during submission, or your Reference Ticket Code.
              </p>

              {lookupError && (
                <div className="mt-4 rounded-lg bg-rose-50 p-4 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                  {lookupError}
                </div>
              )}

              <form onSubmit={handleLookup} className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="lk-name" className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      Your Name
                    </label>
                    <input
                      id="lk-name"
                      type="text"
                      value={lookupName}
                      onChange={(e) => setLookupName(e.target.value)}
                      placeholder="Name as submitted"
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                  </div>

                  <div>
                    <label htmlFor="lk-mobile" className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      10-Digit Mobile Number
                    </label>
                    <input
                      id="lk-mobile"
                      type="tel"
                      maxLength={10}
                      value={lookupMobile}
                      onChange={(e) => setLookupMobile(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 9876543210"
                      className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm text-neutral-900 focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-neutral-400">
                  <div className="h-px flex-1 bg-neutral-200" />
                  <span>OR BY TICKET CODE</span>
                  <div className="h-px flex-1 bg-neutral-200" />
                </div>

                <div>
                  <label htmlFor="lk-ticket" className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Reference Ticket Code (Optional)
                  </label>
                  <input
                    id="lk-ticket"
                    type="text"
                    value={lookupTicket}
                    onChange={(e) => setLookupTicket(e.target.value)}
                    placeholder="e.g. TNV-QRY-2026-0001"
                    className="mt-1 w-full rounded-xl border border-neutral-300 bg-neutral-50/50 px-4 py-2.5 text-sm font-mono text-neutral-900 uppercase focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={lookingUp}
                    className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full bg-brand-green-dark px-7 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 disabled:opacity-60"
                  >
                    {lookingUp ? (
                      <>
                        <Spinner className="h-4 w-4 text-white" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <span>Search Queries</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Display */}
            {lookupResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-neutral-700">
                    Query Results ({lookupResults.length})
                  </h3>
                </div>

                {lookupResults.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
                    <p className="text-sm font-medium text-neutral-600">
                      No queries found matching the provided Name & Mobile number or Reference Code.
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Please double-check your entered mobile number or reference code and try again.
                    </p>
                  </div>
                ) : (
                  lookupResults.map((ticket) => {
                    const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.new;
                    const dateFormatted = ticket.created_at
                      ? new Date(ticket.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '';

                    return (
                      <div
                        key={ticket.id || ticket.ticket_number}
                        className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
                          <div>
                            <span className="font-mono text-xs font-bold text-brand-green-dark">
                              {ticket.ticket_number}
                            </span>
                            <span className="ml-2 text-xs text-neutral-400">Submitted on {dateFormatted}</span>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </div>

                        <div className="mt-4">
                          <h4 className="font-display text-base font-bold text-neutral-900">
                            {ticket.subject}
                          </h4>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                            {ticket.message}
                          </p>
                        </div>

                        {/* Admin Official Reply Section */}
                        {ticket.admin_reply ? (
                          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900">
                              <svg className="h-4 w-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <span>Official Response from TNV Support</span>
                              {ticket.replied_at && (
                                <span className="ml-auto font-normal text-emerald-700">
                                  {new Date(ticket.replied_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              )}
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-emerald-950 font-medium">
                              {ticket.admin_reply}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
                            Our team is currently reviewing your enquiry. Once an official response is issued, it will appear here.
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
