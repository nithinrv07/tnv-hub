import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  getQueue,
  getQuestions,
  saveQuestion,
  setActiveQuestions,
  toggleQuestionActive,
  deleteQuestion,
  revealAadhaar,
  logCall,
  getCallLogs,
  getScores,
  saveScores,
  approveApplicant,
  setMemberBlocked
} from '../lib/adminService.js';
import { getCurrentUser, logout } from '../lib/authService.js';
import Spinner from '../components/Spinner.jsx';
import FieldWorkList from '../components/FieldWorkList.jsx';

// 38 Districts of Tamil Nadu for filter
const TN_DISTRICTS = [
  'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
  'Dindigul', 'Erode', 'Kallakurichi', 'Kanchipuram', 'Kanyakumari', 'Karur',
  'Krishnagiri', 'Madurai', 'Mayiladuthurai', 'Nagapattinam', 'Namakkal', 'Nilgiris',
  'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga',
  'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli',
  'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore',
  'Viluppuram', 'Virudhunagar'
];

const WINGS = [
  'Youth Wing',
  'Women Wing',
  'Students Wing',
  'Social Action Wing'
];

// Safe string & date formatting helpers to prevent runtime errors
const getShortWing = (wingStr, defaultWing = 'Youth Wing') => {
  if (!wingStr || typeof wingStr !== 'string') return defaultWing;
  return wingStr.split('—')[0].trim() || defaultWing;
};

const getAdminFirstName = (adminObj) => {
  if (!adminObj) return 'Administrator';
  if (adminObj.full_name && typeof adminObj.full_name === 'string') {
    return adminObj.full_name.split(' ')[0] || adminObj.full_name;
  }
  return adminObj.username || 'Administrator';
};

const formatSafeTime = (dtStr) => {
  if (!dtStr) return 'Recently';
  try {
    const d = new Date(dtStr);
    return isNaN(d.getTime()) ? 'Recently' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (_e) {
    return 'Recently';
  }
};

const formatSafeDateTime = (dtStr) => {
  if (!dtStr) return '';
  try {
    const d = new Date(dtStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch (_e) {
    return '';
  }
};

// Admin and staff accounts are not members; keep them out of member lists and counts
const STAFF_ROLES = ['master_admin', 'admin', 'dept_admin'];
const isMemberRecord = (a) => Boolean(a) && !STAFF_ROLES.includes(a.role);

const MEMBERSHIP_FEE = 365;

const NAV_LABELS = {
  dashboard: 'Overview',
  'members-pending': 'Pending Approval',
  'members-active': 'Active Members',
  'members-all': 'All Members',
  'members-blocked': 'Blocked Members',
  calls: 'Call Log Operations',
  birthdays: 'Birthday Wishes',
  questions: 'Question Bank'
};

const STAT_ICONS = {
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636',
  rupee: 'M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z',
  userplus: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  phone: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  clipboard: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  pin: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
  cake: 'M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z'
};

const StatIcon = ({ name, className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={STAT_ICONS[name]} />
  </svg>
);

const memberStatus = (a) => {
  if (a.blocked) return { label: 'Blocked', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
  if (a.status === 'approved') return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return { label: 'Pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' };
};

// Date of birth is stored as text: YYYY-MM-DD from the form, but DD-MM-YYYY and DD/MM/YYYY are accepted too
const parseDob = (dob) => {
  if (!dob || typeof dob !== 'string') return null;
  let m = dob.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = dob.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return { year: +m[3], month: +m[2], day: +m[1] };
  return null;
};

// Days from today until the next birthday (0 = today). A 29 Feb birthday falls on 28 Feb in other years.
const daysUntilBirthday = (dob, today) => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const birthdayIn = (year) => {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const day = dob.month === 2 && dob.day === 29 && !leap ? 28 : dob.day;
    return new Date(year, dob.month - 1, day);
  };
  let next = birthdayIn(start.getFullYear());
  if (next < start) next = birthdayIn(start.getFullYear() + 1);
  return { days: Math.round((next - start) / 86400000), date: next };
};

const formatShortDate = (dtStr) => {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const timeAgo = (dtStr) => {
  const d = new Date(dtStr);
  if (!dtStr || isNaN(d.getTime())) return '';
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatShortDate(dtStr);
};

// WhatsApp chat with a ready-to-send birthday wish (10-digit Indian numbers get the 91 prefix)
const birthdayWishLink = (phone, name) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  const number = digits.length === 10 ? `91${digits}` : digits;
  const first = (name || '').split(' ')[0] || 'friend';
  const text = `Happy Birthday ${first}! Wishing you a wonderful year ahead from all of us at Tamil Nadu Volunteers.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
};

const ACTIVITY_DOT = {
  registered: 'bg-brand-green',
  paid: 'bg-brand-yellow',
  call: 'bg-sky-500',
  approved: 'bg-emerald-600',
  blocked: 'bg-rose-500'
};

export default function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [adminUser, setAdminUser] = useState(() => getCurrentUser());
  const [activeNav, setActiveNav] = useState('dashboard'); // see NAV_LABELS
  const [memberNotice, setMemberNotice] = useState(() =>
    location.state?.memberAdded ? `${location.state.memberAdded} was added and is waiting under Pending Approval.` : ''
  );
  const [blockingId, setBlockingId] = useState(null);
  const [birthdayTab, setBirthdayTab] = useState('today'); // 'today' | 'upcoming'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Main Data States
  const [applicants, setApplicants] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionIds, setActiveQuestionIds] = useState(new Set());
  const [allRecentCallLogs, setAllRecentCallLogs] = useState([]);

  // New dashboard date-filter state (separate from existing metrics)
  const [dashboardDateRange, setDashboardDateRange] = useState('7days');
  const [dashboardCustomStart, setDashboardCustomStart] = useState('');
  const [dashboardCustomEnd, setDashboardCustomEnd] = useState('');

  // Queue Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWing, setFilterWing] = useState('');
  const [filterCallStatus, setFilterCallStatus] = useState('');

  // ----------------------------------------------------
  // CALL LOG MODEL STATE (Dedicated Modal & Actions)
  // ----------------------------------------------------
  const [callModalApplicant, setCallModalApplicant] = useState(null);
  const [callModalLogs, setCallModalLogs] = useState([]);
  const [callModalLoadingLogs, setCallModalLoadingLogs] = useState(false);
  const [callStatus, setCallStatus] = useState('Attending'); // 'Attending' | 'Not Attending' | 'Postponed' | 'No Answer'
  const [callNotes, setCallNotes] = useState('');
  const [submittingCall, setSubmittingCall] = useState(false);
  const [callSuccessMessage, setCallSuccessMessage] = useState('');
  const [callErrorMessage, setCallErrorMessage] = useState('');

  // ----------------------------------------------------
  // DOSSIER & 10-QUESTION INTERVIEW SCORING MODAL
  // ----------------------------------------------------
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [modalTab, setModalTab] = useState('evaluation'); // 'evaluation' | 'dossier' | 'aadhaar' | 'appointment'
  const [applicantScores, setApplicantScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);
  const [scoreFeedback, setScoreFeedback] = useState('');

  // Aadhaar Passkey Reveal
  const [masterPasskey, setMasterPasskey] = useState('');
  const [revealedAadhaar, setRevealedAadhaar] = useState('');
  const [revealingAadhaar, setRevealingAadhaar] = useState(false);
  const [aadhaarError, setAadhaarError] = useState('');

  // Appointment & Approval
  const [assignedWing, setAssignedWing] = useState('Youth Wing');
  const [assignedRole, setAssignedRole] = useState('District Coordinator');
  const [approvalDecision, setApprovalDecision] = useState('approved');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState('');
  const [approvalSuccess, setApprovalSuccess] = useState('');

  // ----------------------------------------------------
  // QUESTION MANAGEMENT
  // ----------------------------------------------------
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [newQuestionEn, setNewQuestionEn] = useState('');
  const [newQuestionTa, setNewQuestionTa] = useState('');
  const [newQuestionHint, setNewQuestionHint] = useState('');
  const [savingQuestionSet, setSavingQuestionSet] = useState(false);
  const [questionSetFeedback, setQuestionSetFeedback] = useState('');
  const [questionFilterTab, setQuestionFilterTab] = useState('all'); // 'all' | 'active' | 'inactive'

  useEffect(() => {
    const user = getCurrentUser();
    const role = user?.role || user?.profile?.role;
    const isAdmin = role === 'admin' || role === 'master_admin' || role === 'dept_admin';
    if (!user || !isAdmin) {
      navigate('/login');
      return;
    }
    setAdminUser(user);
    loadPortalData();
    // Show the "member added" notice once, not again after a refresh
    if (location.state?.memberAdded) navigate(location.pathname, { replace: true, state: null });
  }, []);

  const loadPortalData = async () => {
    setLoading(true);
    try {
      const [qRes, questRes] = await Promise.all([
        getQueue(),
        getQuestions(false)
      ]);

      if (qRes.ok && qRes.data) {
        const rawApplicants = Array.isArray(qRes.data.queue)
          ? qRes.data.queue
          : Array.isArray(qRes.data.applicants)
          ? qRes.data.applicants
          : Array.isArray(qRes.data.profiles)
          ? qRes.data.profiles
          : Array.isArray(qRes.data)
          ? qRes.data
          : [];
        setApplicants(rawApplicants.filter(isMemberRecord));

        // Extract call logs if provided or synthesize recent call logs
        const aggregatedCalls = [];
        rawApplicants.filter(isMemberRecord).forEach(app => {
          if (app && app.latest_call_at) {
            aggregatedCalls.push({
              id: 'call_' + app.id,
              profile_id: app.id,
              candidate_name: app.full_name || app.username,
              candidate_phone: app.phone,
              district_name: app.district_name,
              status: app.call_status || 'Attending',
              notes: app.latest_call_note || 'Screening interview logged',
              created_at: app.latest_call_at,
              admin_id: app.latest_caller_id || 'admin'
            });
          }
        });
        aggregatedCalls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setAllRecentCallLogs(aggregatedCalls);
      } else {
        setApplicants([]);
      }

      if (questRes.ok && questRes.data) {
        const qList = Array.isArray(questRes.data.questions)
          ? questRes.data.questions
          : Array.isArray(questRes.data)
          ? questRes.data
          : [];
        setQuestions(qList);
        const activeIds = new Set(qList.filter(q => q && (q.active || q.is_active)).map(q => q.id));
        setActiveQuestionIds(activeIds);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // CALL LOG MODEL HANDLERS
  // ----------------------------------------------------
  const handleOpenCallModal = async (applicant) => {
    setCallModalApplicant(applicant);
    setCallStatus(applicant.call_status && applicant.call_status !== 'Not Called' ? applicant.call_status : 'Attending');
    setCallNotes('');
    setCallSuccessMessage('');
    setCallErrorMessage('');
    setCallModalLoadingLogs(true);

    try {
      const res = await getCallLogs(applicant.id);
      if (res.ok && res.data) {
        setCallModalLogs(res.data.logs || res.data.call_logs || []);
      } else {
        setCallModalLogs([]);
      }
    } catch (e) {
      setCallModalLogs([]);
    } finally {
      setCallModalLoadingLogs(false);
    }
  };

  const handleCloseCallModal = () => {
    setCallModalApplicant(null);
    setCallSuccessMessage('');
    setCallErrorMessage('');
  };

  const handleSubmitCallLog = async (e, proceedToScore = false) => {
    if (e) e.preventDefault();
    if (!callModalApplicant) return;

    setSubmittingCall(true);
    setCallErrorMessage('');
    setCallSuccessMessage('');

    try {
      const res = await logCall({
        profile_id: callModalApplicant.id,
        status: callStatus,
        notes: callNotes.trim()
      });

      if (res.ok) {
        setCallSuccessMessage(`Call successfully logged as: ${callStatus}`);
        setCallNotes('');

        // Refresh call history for this candidate
        const logsRes = await getCallLogs(callModalApplicant.id);
        if (logsRes.ok && logsRes.data) {
          setCallModalLogs(logsRes.data.logs || logsRes.data.call_logs || []);
        }

        // Update local applicant state immediately
        setApplicants(prev => (Array.isArray(prev) ? prev : []).map(a => {
          if (a.id === callModalApplicant.id) {
            return {
              ...a,
              call_status: callStatus,
              latest_call_at: new Date().toISOString(),
              latest_call_note: callNotes.trim(),
              total_call_attempts: (a.total_call_attempts || 0) + 1
            };
          }
          return a;
        }));

        // Refresh portal queue and follow-ups in background
        loadPortalData();

        if (proceedToScore) {
          setTimeout(() => {
            const currentApp = callModalApplicant;
            handleCloseCallModal();
            handleOpenEvaluation(currentApp);
          }, 600);
        }
      } else {
        setCallErrorMessage(res.data?.error || 'Failed to record call log. Please try again.');
      }
    } catch (err) {
      setCallErrorMessage(err.message || 'Network error logging call.');
    } finally {
      setSubmittingCall(false);
    }
  };

  // ----------------------------------------------------
  // DOSSIER & INTERVIEW SCORING HANDLERS
  // ----------------------------------------------------
  const handleOpenEvaluation = async (applicant) => {
    setSelectedApplicant(applicant);
    setModalTab('evaluation');
    setAssignedWing(getShortWing(applicant?.wing_to_join || applicant?.wing_name));
    setAssignedRole(applicant?.preferred_designation || 'District Coordinator');
    setRevealedAadhaar('');
    setScoreFeedback('');
    setApprovalError('');
    setApprovalSuccess('');

    // Load existing scores
    try {
      const sRes = await getScores(applicant.id);
      if (sRes.ok && sRes.data) {
        const loaded = {};
        const scoreArr = sRes.data.scores || [];
        scoreArr.forEach(s => {
          loaded[s.question_id] = s.score;
        });
        setApplicantScores(loaded);
      } else {
        setApplicantScores({});
      }
    } catch (_err) {
      setApplicantScores({});
    }
  };

  const handleCloseEvaluation = () => {
    setSelectedApplicant(null);
    setScoreFeedback('');
    setApprovalError('');
  };

  // Active Questions evaluated for candidate
  const activeQuestionsList = useMemo(() => {
    const qList = Array.isArray(questions) ? questions : [];
    return qList.filter(q => q && (activeQuestionIds.has(q.id) || q.active || q.is_active));
  }, [questions, activeQuestionIds]);

  const currentTotalScore = useMemo(() => {
    return Object.values(applicantScores).reduce((sum, val) => sum + (Number(val) || 0), 0);
  }, [applicantScores]);

  const getRecommendedRole = (score) => {
    if (score >= 8.5) return 'State Executive / District Coordinator';
    if (score >= 6.5) return 'Wing Secretary / Taluk Lead';
    if (score >= 4.5) return 'Active Field Volunteer';
    return 'General Volunteer / Supporter';
  };

  const handleScoreChange = (qId, val) => {
    setApplicantScores(prev => ({
      ...prev,
      [qId]: Number(val)
    }));
  };

  const handleSaveInterviewScores = async () => {
    if (!selectedApplicant) return;
    setSavingScores(true);
    setScoreFeedback('');

    try {
      const res = await saveScores({
        profile_id: selectedApplicant.id,
        scores: applicantScores,
        total_score: currentTotalScore,
        suggested_role: getRecommendedRole(currentTotalScore)
      });

      if (res.ok) {
        setScoreFeedback(`Saved! Total Score: ${currentTotalScore.toFixed(1)} / ${activeQuestionsList.length} — Recommended: ${getRecommendedRole(currentTotalScore)}`);
        // Update local applicant
        setApplicants(prev => (Array.isArray(prev) ? prev : []).map(a => {
          if (a.id === selectedApplicant.id) {
            return { ...a, total_score: currentTotalScore, interview_scored: true };
          }
          return a;
        }));
      } else {
        setScoreFeedback(res.data?.error || 'Failed to save scores. Ensure valid scores.');
      }
    } catch (err) {
      setScoreFeedback(err.message || 'Error saving interview scores.');
    } finally {
      setSavingScores(false);
    }
  };

  const handleRevealAadhaar = async (e) => {
    e.preventDefault();
    if (!masterPasskey.trim() || !selectedApplicant) return;
    setRevealingAadhaar(true);
    setAadhaarError('');

    try {
      const res = await revealAadhaar(selectedApplicant.id, masterPasskey.trim());
      if (res.ok && (res.data?.aadhaar || res.data?.aadhaar_number)) {
        setRevealedAadhaar(res.data.aadhaar || res.data.aadhaar_number);
        setMasterPasskey('');
      } else {
        setAadhaarError(res.data?.error || 'Master Admin authorization rejected.');
      }
    } catch (err) {
      setAadhaarError('Failed to verify passkey.');
    } finally {
      setRevealingAadhaar(false);
    }
  };

  const handleApproveApplicant = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    setApproving(true);
    setApprovalError('');
    setApprovalSuccess('');

    try {
      const res = await approveApplicant({
        profile_id: selectedApplicant.id,
        role: assignedRole,
        wing_id: assignedWing,
        decision: approvalDecision,
        notes: approvalNotes.trim()
      });

      if (res.ok) {
        const tnvId = res.data?.tnv_id || 'TNV-APPROVED';
        setApprovalSuccess(`Applicant approved! Generated Member ID: ${tnvId}`);
        // Update applicant in local state
        setApplicants(prev => (Array.isArray(prev) ? prev : []).map(a => {
          if (a.id === selectedApplicant.id) {
            return {
              ...a,
              status: 'approved',
              role: assignedRole,
              tnv_id: tnvId
            };
          }
          return a;
        }));
        loadPortalData();
      } else {
        setApprovalError(res.data?.error || 'Approval failed. Verify all 10 questions are scored.');
      }
    } catch (err) {
      setApprovalError(err.message || 'Approval request failed.');
    } finally {
      setApproving(false);
    }
  };

  // ----------------------------------------------------
  // QUESTION BANK MANAGEMENT HANDLERS
  // ----------------------------------------------------
  const handleToggleQuestionActive = (qId) => {
    setActiveQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(qId)) {
        next.delete(qId);
      } else {
        next.add(qId);
      }
      return next;
    });
  };

  const handleDeactivateQuestion = (qId) => {
    setActiveQuestionIds(prev => {
      const next = new Set(prev);
      next.delete(qId);
      return next;
    });
  };

  const handleActivateQuestion = (qId) => {
    setActiveQuestionIds(prev => {
      const next = new Set(prev);
      next.add(qId);
      return next;
    });
  };

  const handleSelectTop10 = () => {
    const top10 = questions.slice(0, 10).map(q => q.id);
    setActiveQuestionIds(new Set(top10));
    setQuestionSetFeedback('Selected top 10 questions. Click "Save Active Questions" to apply.');
  };

  const handleClearAllActive = () => {
    setActiveQuestionIds(new Set());
    setQuestionSetFeedback('All questions unchosen/deactivated. Select your desired questions and click Save.');
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to permanently delete this question from the Question Bank?')) return;
    try {
      const res = await deleteQuestion(qId);
      if (res && (res.ok || res.data?.success)) {
        setActiveQuestionIds(prev => {
          const next = new Set(prev);
          next.delete(qId);
          return next;
        });
        setQuestions(prev => prev.filter(q => q.id !== qId));
        setQuestionSetFeedback('Question successfully deleted from the Question Bank.');
      } else {
        alert(res?.data?.error || 'Failed to delete question');
      }
    } catch (err) {
      alert('Error deleting question: ' + err.message);
    }
  };

  const handleSaveActiveQuestions = async () => {
    if (activeQuestionIds.size === 0) {
      setQuestionSetFeedback('Please select at least 1 question for the active screening rubric.');
      return;
    }
    setSavingQuestionSet(true);
    setQuestionSetFeedback('');
    try {
      const activeIdsList = Array.from(activeQuestionIds).map(Number);
      const res = await setActiveQuestions(activeIdsList);
      if (res && (res.ok || res.data?.success)) {
        setQuestionSetFeedback(`✓ Success! ${activeIdsList.length} questions are now active and synchronized across all interviewer scorecards.`);
        // Reload questions to ensure backend and local states are 100% in sync
        const questRes = await getQuestions(false);
        if (questRes.ok && questRes.data) {
          const qs = questRes.data.questions || questRes.data || [];
          setQuestions(qs);
          const activeIds = new Set(qs.filter(q => q.active).map(q => q.id));
          setActiveQuestionIds(activeIds);
        }
      } else {
        setQuestionSetFeedback(res?.data?.error || 'Failed to save active questions.');
      }
    } catch (err) {
      setQuestionSetFeedback('Error updating question set: ' + err.message);
    } finally {
      setSavingQuestionSet(false);
    }
  };

  const handleCreateNewQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestionEn.trim()) return;

    try {
      const res = await saveQuestion({
        question_en: newQuestionEn.trim(),
        question_ta: newQuestionTa.trim(),
        hint: newQuestionHint.trim()
      });

      if (res.ok) {
        setShowAddQuestionModal(false);
        setNewQuestionEn('');
        setNewQuestionTa('');
        setNewQuestionHint('');
        setQuestionSetFeedback('New question successfully added to the Question Bank.');
        // Reload questions
        const questRes = await getQuestions(false);
        if (questRes.ok && questRes.data) {
          const qs = questRes.data.questions || questRes.data || [];
          setQuestions(qs);
        }
      } else {
        alert(res.data?.error || 'Failed to add question');
      }
    } catch (err) {
      alert('Network error adding question');
    }
  };

  // ----------------------------------------------------
  // COMPUTED METRICS (Matching Reference Dashboard Cards)
  // ----------------------------------------------------
  const metrics = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const callLogsList = Array.isArray(allRecentCallLogs) ? allRecentCallLogs : [];

    const totalApplicants = list.length;
    const paidApplicants = list.filter(a => a && a.membership_paid).length;
    const pendingReview = list.filter(a => a && a.status === 'pending').length;
    const approvedCount = list.filter(a => a && a.status === 'approved').length;
    const totalCalls = list.reduce((acc, a) => acc + (a?.total_call_attempts || (a?.call_status && a?.call_status !== 'Not Called' && a?.call_status !== 'not_called' ? 1 : 0)), 0);
    const totalMembershipFees = paidApplicants * MEMBERSHIP_FEE;
    const scoredCount = list.filter(a => a && (a.interview_scored || (a.total_score !== undefined && a.total_score !== null))).length;
    const attendedCount = list.filter(a => a && (a.call_status === 'Attending' || a.call_status === 'attended')).length;
    const postponedCount = list.filter(a => a && (a.call_status === 'Postponed' || a.call_status === 'postponed' || a.call_status === 'scheduled')).length;
    const noAnswerCount = list.filter(a => a && (a.call_status === 'No Answer' || a.call_status === 'no_answer')).length;
    const declinedCount = list.filter(a => a && (a.call_status === 'Not Attending' || a.call_status === 'declined')).length;
    const blockedCount = list.filter(a => a && a.blocked).length;
    const activeMembers = list.filter(a => a && a.status === 'approved' && !a.blocked).length;
    const pendingApproval = list.filter(a => a && a.status !== 'approved' && !a.blocked).length;

    return {
      totalApplicants,
      paidApplicants,
      pendingReview,
      approvedCount,
      totalCalls: Math.max(totalCalls, callLogsList.length),
      totalMembershipFees,
      scoredCount,
      attendedCount,
      postponedCount,
      noAnswerCount,
      declinedCount,
      blockedCount,
      activeMembers,
      pendingApproval
    };
  }, [applicants, allRecentCallLogs]);


  // Date range for new dashboard components only
  const dashboardDateBounds = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    if (dashboardDateRange === '7days') {
      start.setDate(start.getDate() - 6);
    } else if (dashboardDateRange === '30days') {
      start.setDate(start.getDate() - 29);
    } else if (dashboardDateRange === 'custom') {
      if (dashboardCustomStart) {
        start.setTime(new Date(`${dashboardCustomStart}T00:00:00`).getTime());
      }

      if (dashboardCustomEnd) {
        end.setTime(new Date(`${dashboardCustomEnd}T23:59:59.999`).getTime());
      }
    }

    return { start, end };
  }, [dashboardDateRange, dashboardCustomStart, dashboardCustomEnd]);

  // New dashboard insights: call activity within the selected date range
  const dashboardCallInsights = useMemo(() => {
    const logs = Array.isArray(allRecentCallLogs) ? allRecentCallLogs : [];
    const { start, end } = dashboardDateBounds;

    const filteredLogs = logs.filter(log => {
      if (!log?.created_at) return false;

      const timestamp = new Date(log.created_at);
      if (Number.isNaN(timestamp.getTime())) return false;

      return timestamp >= start && timestamp <= end;
    });

    return {
      totalCalls: filteredLogs.length,
      attending: filteredLogs.filter(log =>
        ['attending', 'attended'].includes(
          String(log.status || '').toLowerCase()
        )
      ).length,
      noAnswer: filteredLogs.filter(log =>
        ['no answer', 'no_answer'].includes(
          String(log.status || '').toLowerCase()
        )
      ).length,
      postponed: filteredLogs.filter(log =>
        ['postponed', 'scheduled'].includes(
          String(log.status || '').toLowerCase()
        )
      ).length,
      declined: filteredLogs.filter(log =>
        ['not attending', 'declined'].includes(
          String(log.status || '').toLowerCase()
        )
      ).length
    };
  }, [allRecentCallLogs, dashboardDateBounds]);

  
  // Call Activity Trend: group available call records by date
  const dashboardCallTrend = useMemo(() => {
    const logs = Array.isArray(allRecentCallLogs)
      ? allRecentCallLogs
      : [];

    const { start, end } = dashboardDateBounds;
    const startTime = start.getTime();
    const endTime = end.getTime();

    if (
      !Number.isFinite(startTime) ||
      !Number.isFinite(endTime) ||
      endTime < startTime
    ) {
      return [];
    }

    const totalDays = Math.max(
      1,
      Math.floor((endTime - startTime) / 86400000) + 1
    );

    // Keep the chart readable for longer custom date ranges.
    const bucketCount = Math.min(totalDays, 7);
    const bucketSize = (endTime - startTime + 1) / bucketCount;

    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = startTime + index * bucketSize;
      const bucketEnd = Math.min(
        endTime,
        startTime + (index + 1) * bucketSize - 1
      );

      return {
        label: new Date(bucketStart).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short'
        }),
        start: bucketStart,
        end: bucketEnd,
        total: 0,
        attending: 0,
        noAnswer: 0,
        postponed: 0,
        declined: 0
      };
    });

    logs.forEach(log => {
      if (!log?.created_at) return;

      const timestamp = new Date(log.created_at).getTime();
      if (
        !Number.isFinite(timestamp) ||
        timestamp < startTime ||
        timestamp > endTime
      ) {
        return;
      }

      const index = Math.min(
        bucketCount - 1,
        Math.floor((timestamp - startTime) / bucketSize)
      );
      const bucket = buckets[index];
      const status = String(log.status || '').toLowerCase();

      bucket.total += 1;

      if (['attending', 'attended'].includes(status)) {
        bucket.attending += 1;
      } else if (['no answer', 'no_answer'].includes(status)) {
        bucket.noAnswer += 1;
      } else if (['postponed', 'scheduled'].includes(status)) {
        bucket.postponed += 1;
      } else if (['not attending', 'declined'].includes(status)) {
        bucket.declined += 1;
      }
    });

    return buckets;
  }, [allRecentCallLogs, dashboardDateBounds]);


  // District Coverage: calculated from actual applicant data
const districtCoverage = useMemo(() => {
  const list = Array.isArray(applicants) ? applicants : [];

  const districtCounts = TN_DISTRICTS.map(district => {
    const name = typeof district === 'string'
      ? district
      : district.name;

    const count = list.filter(applicant =>
      applicant &&
      (applicant.district_name || '').trim().toLowerCase() ===
        name.trim().toLowerCase()
    ).length;

    return { name, count };
  });

  const activeDistricts = districtCounts.filter(
    district => district.count > 0
  ).length;

  return {
    districts: districtCounts,
    activeDistricts,
    totalDistricts: districtCounts.length,
    weakDistricts: districtCounts.filter(
      district => district.count <= 2
    )
  };
}, [applicants]);


  // New dashboard panel: applicants requiring attention
  const dashboardNeedsAttention = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];

    const pendingApplicants = list.filter(
      applicant => applicant && applicant.status === 'pending' && !applicant.blocked
    );

    return {
      total: pendingApplicants.length,
      applicants: pendingApplicants.slice(0, 5)
    };
  }, [applicants]);

  // Conversion Funnel
  const conversionFunnel = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];

    const stages = [
      { label: 'Registered', count: metrics.totalApplicants },
      { label: 'Paid', count: metrics.paidApplicants },
      {
        label: 'Called',
        count: list.filter(a =>
          a && (
            Number(a.total_call_attempts) > 0 ||
            (a.call_status &&
              !['Not Called', 'not_called'].includes(a.call_status))
          )
        ).length
      },
      { label: 'Scored', count: metrics.scoredCount },
      { label: 'Approved', count: metrics.approvedCount }
    ];

    return stages.map((stage, index) => ({
      ...stage,
      percentage: metrics.totalApplicants
        ? Math.round((stage.count / metrics.totalApplicants) * 100)
        : 0,
      dropOff: index === 0
        ? 0
        : Math.max(0, stages[index - 1].count - stage.count)
    }));
  }, [applicants, metrics]);


  // Quick Stats: today and this month, from the member records
  const quickStats = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const since = (field, from) => list.filter(a => {
      if (!a || !a[field]) return false;
      const t = new Date(a[field]).getTime();
      return Number.isFinite(t) && t >= from;
    }).length;
    const paidThisMonth = since('membership_paid_at', monthStart);
    return {
      joinedToday: since('created_at', dayStart),
      joinedThisMonth: since('created_at', monthStart),
      approvedThisMonth: since('approved_at', monthStart),
      paidThisMonth,
      feesThisMonth: paidThisMonth * MEMBERSHIP_FEE,
      calledToday: since('latest_call_at', dayStart)
    };
  }, [applicants]);

  // Registrations and approvals over the last 6 months
  const monthlyRegistrations = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString('en-IN', { month: 'short' }),
        registered: 0,
        approved: 0
      };
    });
    const monthIndex = (value) => {
      if (!value) return -1;
      const d = new Date(value);
      if (isNaN(d.getTime())) return -1;
      return months.findIndex(m => m.key === `${d.getFullYear()}-${d.getMonth()}`);
    };
    list.forEach(a => {
      const r = monthIndex(a?.created_at);
      if (r >= 0) months[r].registered += 1;
      const ap = monthIndex(a?.approved_at);
      if (ap >= 0) months[ap].approved += 1;
    });
    return months;
  }, [applicants]);

  const recentMembers = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    return list
      .filter(a => a && a.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
  }, [applicants]);

  // Recent Activity: registrations, payments, calls, approvals and blocks, newest first
  const recentActivity = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const events = [];
    list.forEach(a => {
      if (!a) return;
      const name = a.full_name || a.username || 'A volunteer';
      if (a.created_at) events.push({ at: a.created_at, kind: 'registered', text: `${name} registered`, sub: a.district_name });
      if (a.membership_paid_at) events.push({ at: a.membership_paid_at, kind: 'paid', text: `${name} paid the ₹${MEMBERSHIP_FEE} membership fee` });
      if (a.latest_call_at) events.push({ at: a.latest_call_at, kind: 'call', text: `Call with ${name}: ${a.call_status || 'logged'}` });
      if (a.approved_at) events.push({ at: a.approved_at, kind: 'approved', text: `${name} was approved`, sub: a.tnv_id });
      if (a.blocked && a.blocked_at) events.push({ at: a.blocked_at, kind: 'blocked', text: `${name} was blocked` });
    });
    return events
      .filter(e => !isNaN(new Date(e.at).getTime()))
      .sort((x, y) => new Date(y.at) - new Date(x.at))
      .slice(0, 8);
  }, [applicants]);

  // Birthday Wishes: today, and the next 30 days
  const birthdays = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const today = new Date();
    const withDates = list
      .filter(a => a && !a.blocked)
      .map(a => {
        const dob = parseDob(a.dob);
        if (!dob) return null;
        const next = daysUntilBirthday(dob, today);
        return { ...a, daysAway: next.days, nextBirthday: next.date, turning: next.date.getFullYear() - dob.year };
      })
      .filter(Boolean);
    return {
      today: withDates.filter(a => a.daysAway === 0),
      upcoming: withDates.filter(a => a.daysAway > 0 && a.daysAway <= 30).sort((a, b) => a.daysAway - b.daysAway)
    };
  }, [applicants]);

  const isMasterAdmin = (adminUser?.role || adminUser?.profile?.role) === 'master_admin';

  const handleToggleBlock = async (member) => {
    const blocking = !member.blocked;
    const name = member.full_name || member.username;
    let reason = '';
    if (blocking) {
      const input = window.prompt(`Block ${name}? They will not be able to sign in until you unblock them.\n\nReason (optional):`, '');
      if (input === null) return;
      reason = input.trim();
    } else if (!window.confirm(`Unblock ${name}? They will be able to sign in again.`)) {
      return;
    }
    setBlockingId(member.id);
    try {
      const res = await setMemberBlocked(member.id, blocking, reason || undefined);
      if (!res.ok) {
        alert(res.data?.error || 'Could not update this member. Please try again.');
        return;
      }
      const now = new Date().toISOString();
      setApplicants(list => list.map(a => (a.id === member.id ? { ...a, blocked: blocking, blocked_at: blocking ? now : null } : a)));
    } finally {
      setBlockingId(null);
    }
  };

  const openNav = (nav) => {
    setActiveNav(nav);
    setFilterStatus('');
    setSidebarOpen(false);
  };

  // Filtered Queue List (the member views narrow it first)
  const filteredApplicants = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    return list.filter(app => {
      if (!app) return false;
      if (activeNav === 'members-pending' && (app.status === 'approved' || app.blocked)) return false;
      if (activeNav === 'members-active' && (app.status !== 'approved' || app.blocked)) return false;
      if (activeNav === 'members-blocked' && !app.blocked) return false;
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (app.full_name || '').toLowerCase().includes(q);
        const userMatch = (app.username || '').toLowerCase().includes(q);
        const phoneMatch = (app.phone || '').includes(q);
        const emailMatch = (app.email || '').toLowerCase().includes(q);
        const idMatch = (app.tnv_id || '').toLowerCase().includes(q);
        if (!nameMatch && !userMatch && !phoneMatch && !emailMatch && !idMatch) return false;
      }
      // District filter
      if (filterDistrict && app.district_name !== filterDistrict) {
        return false;
      }
      // Status filter
      if (filterStatus && app.status !== filterStatus) {
        return false;
      }
      // Wing filter
      if (filterWing) {
        const wingText = (app.wing_to_join || app.wing_name || '').toLowerCase();
        if (!wingText.includes(filterWing.toLowerCase())) return false;
      }
      // Call Status filter
      if (filterCallStatus) {
        if (filterCallStatus === 'Not Called' && (app.call_status && app.call_status !== 'Not Called' && app.call_status !== 'not_called')) return false;
        if (filterCallStatus !== 'Not Called' && app.call_status !== filterCallStatus) return false;
      }
      return true;
    });
  }, [applicants, activeNav, searchQuery, filterDistrict, filterStatus, filterWing, filterCallStatus]);

  // Time-aware greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const statCards = [
    { label: 'Total Members', value: metrics.totalApplicants, note: 'Everyone who has registered', icon: 'users', tone: 'bg-brand-green-tint text-brand-green', accent: 'border-brand-green', nav: 'members-all' },
    { label: 'Active Members', value: metrics.activeMembers, note: 'Approved and not blocked', icon: 'check', tone: 'bg-emerald-50 text-emerald-700', accent: 'border-emerald-600', nav: 'members-active' },
    { label: 'Pending Approval', value: metrics.pendingApproval, note: 'Awaiting interview and approval', icon: 'clock', tone: 'bg-amber-50 text-amber-600', accent: 'border-amber-500', nav: 'members-pending' },
    { label: 'Blocked Members', value: metrics.blockedCount, note: 'Cannot sign in', icon: 'ban', tone: 'bg-rose-50 text-rose-600', accent: 'border-rose-500', nav: 'members-blocked' },
    { label: 'Membership Fees', value: `₹${metrics.totalMembershipFees.toLocaleString('en-IN')}`, note: `${metrics.paidApplicants} paid at ₹${MEMBERSHIP_FEE}`, icon: 'rupee', tone: 'bg-brand-yellow-tint text-amber-800', accent: 'border-brand-yellow' },
    { label: 'Joined This Month', value: quickStats.joinedThisMonth, note: `${quickStats.joinedToday} today`, icon: 'userplus', tone: 'bg-brand-green-tint text-brand-green', accent: 'border-brand-green', nav: 'members-all' },
    { label: 'Call Attempts', value: metrics.totalCalls, note: 'Telephone screenings logged', icon: 'phone', tone: 'bg-emerald-50 text-emerald-700', accent: 'border-emerald-600', nav: 'calls' },
    { label: 'Interviews Scored', value: metrics.scoredCount, note: '10-question rubric', icon: 'clipboard', tone: 'bg-brand-green-tint text-brand-green', accent: 'border-brand-green' },
    { label: 'Districts Covered', value: `${districtCoverage.activeDistricts} / ${districtCoverage.totalDistricts}`, note: 'With at least one member', icon: 'pin', tone: 'bg-brand-green-tint text-brand-green-dark', accent: 'border-brand-green-dark' },
    { label: 'Birthdays Today', value: birthdays.today.length, note: `${birthdays.upcoming.length} more in the next 30 days`, icon: 'cake', tone: 'bg-brand-yellow-tint text-amber-800', accent: 'border-brand-yellow', nav: 'birthdays' }
  ];

  const memberNav = [
    { id: 'members-pending', label: 'Pending Approval', icon: 'clock', count: metrics.pendingApproval },
    { id: 'members-active', label: 'Active Members', icon: 'check', count: metrics.activeMembers },
    { id: 'members-all', label: 'All Members', icon: 'users', count: metrics.totalApplicants },
    { id: 'members-blocked', label: 'Blocked Members', icon: 'ban', count: metrics.blockedCount }
  ];

  const navItemClass = (active) => `w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
    active
      ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
      : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
  }`;
  const navBadgeClass = (active) => `text-[10px] px-2 py-0.5 rounded-full font-extrabold ${active ? 'bg-brand-yellow text-neutral-900' : 'bg-emerald-500/20 text-emerald-200'}`;

  const monthlyMax = Math.max(1, ...monthlyRegistrations.map(m => Math.max(m.registered, m.approved)));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-neutral-bg text-neutral-ink flex flex-col md:flex-row antialiased font-sans">
      {/* ==================================================== */}
      {/* 1. LEFT SIDEBAR (TNV Civic Forest Green Style)       */}
      {/* ==================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0D381E] text-emerald-100 flex flex-col border-r border-emerald-900/60 transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-900/60 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white p-1 ring-2 ring-brand-yellow/40 shrink-0 flex items-center justify-center shadow-sm">
              <img src="/tnv-logo.png" alt="TNV Emblem" className="w-8 h-8 rounded-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-white tracking-wide text-sm leading-tight truncate font-display">
                Tamil Nadu Volunteers
              </div>
              <div className="text-[11px] text-brand-yellow font-semibold truncate font-display">
                தமிழ்நாடு தன்னார்வலர்கள்
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-emerald-200 hover:text-white p-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Search Menu Input */}
        <div className="px-4 py-3 border-b border-emerald-900/60">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#082814] text-emerald-100 text-xs rounded-xl pl-8 pr-3 py-2 border border-emerald-900/80 focus:outline-none focus:border-brand-yellow placeholder-emerald-400/40"
            />
            <svg
              className="w-3.5 h-3.5 text-emerald-400/60 absolute left-2.5 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Nav Items Categorized */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* MAIN SECTION */}
          <div>
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
              Main Operations
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => openNav('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeNav === 'dashboard'
                    ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  <span>Dashboard Overview</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeNav === 'dashboard' ? 'bg-brand-yellow text-neutral-900' : 'bg-white/15 text-emerald-200'}`}>
                  Live
                </span>
              </button>
            </div>
          </div>

          {/* MEMBERS MANAGEMENT */}
          <div>
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
              Members Management
            </div>
            <div className="space-y-1">
              <Link to="/register?admin=1" onClick={() => setSidebarOpen(false)} className={navItemClass(false)}>
                <div className="flex items-center gap-2.5">
                  <StatIcon name="userplus" className="w-4 h-4 text-brand-yellow" />
                  <span>Add Member</span>
                </div>
              </Link>
              {memberNav.map(item => (
                <button key={item.id} type="button" onClick={() => openNav(item.id)} className={navItemClass(activeNav === item.id)}>
                  <div className="flex items-center gap-2.5">
                    <StatIcon name={item.icon} className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span className={navBadgeClass(activeNav === item.id)}>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* OPERATIONS */}
          <div>
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
              Operations
            </div>
            <div className="space-y-1">
              <button type="button" onClick={() => openNav('calls')} className={navItemClass(activeNav === 'calls')}>
                <div className="flex items-center gap-2.5">
                  <StatIcon name="phone" className="w-4 h-4 text-brand-yellow" />
                  <span>Call Log Operations</span>
                </div>
                <span className={navBadgeClass(activeNav === 'calls')}>{metrics.totalCalls}</span>
              </button>
              <button type="button" onClick={() => openNav('birthdays')} className={navItemClass(activeNav === 'birthdays')}>
                <div className="flex items-center gap-2.5">
                  <StatIcon name="cake" className="w-4 h-4" />
                  <span>Birthday Wishes</span>
                </div>
                <span className={navBadgeClass(activeNav === 'birthdays')}>
                  {birthdays.today.length > 0 ? `${birthdays.today.length} today` : birthdays.upcoming.length}
                </span>
              </button>
            </div>
          </div>

          {/* EVALUATION & SETTINGS */}
          <div>
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
              Interview & Governance
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => openNav('questions')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeNav === 'questions'
                    ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Question Bank ({questions.length} Qs)</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeNav === 'questions' ? 'bg-brand-yellow text-neutral-900' : 'bg-white/15 text-emerald-200'}`}>
                  {activeQuestionIds.size} / 10 Active
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-4 border-t border-emerald-900/80 bg-[#082814]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-brand-green text-white font-bold text-xs flex items-center justify-center ring-2 ring-brand-yellow/40">
                  {adminUser?.full_name ? adminUser.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-yellow rounded-full ring-2 ring-[#082814]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate font-display">
                  {adminUser?.full_name || 'Administrator'}
                </div>
                <div className="text-[10px] text-emerald-300 truncate font-semibold">
                  {adminUser?.role === 'master_admin' ? 'Master Admin' : 'Admin Staff'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-rose-300 hover:text-white hover:bg-rose-500/20 rounded-lg transition-colors"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ==================================================== */}
      {/* 2. MAIN CONTENT AREA                                 */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-brand-green-tint px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-neutral-600 hover:bg-brand-green-tint rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <span>Dashboard</span>
                <span>/</span>
                <span className="font-semibold text-brand-green capitalize">
                  {NAV_LABELS[activeNav] || 'Overview'}
                </span>
              </div>
              <h1 className="text-lg font-extrabold text-brand-green-dark font-display tracking-tight">
                Admin Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Log Call Shortcut Button */}
            <button
              type="button"
              onClick={() => {
                if (applicants.length > 0) {
                  const candidate = applicants.find(a => a.status === 'pending') || applicants[0];
                  handleOpenCallModal(candidate);
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-brand-green text-white hover:bg-brand-green-dark shadow-sm transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Quick Log Call</span>
            </button>

            {/* Live Core Status */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-brand-green-tint text-brand-green rounded-full text-xs font-bold border border-brand-green/30">
              <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
              <span>TNV Core Live</span>
            </div>

            <button
              type="button"
              onClick={loadPortalData}
              title="Refresh Data"
              className="p-2 text-neutral-500 hover:text-brand-green-dark hover:bg-brand-green-tint rounded-lg transition-colors"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </header>

        {/* Dashboard Body Container */}
        <div className="p-4 sm:p-8 space-y-6">
          {/* Greeting Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-green-dark tracking-tight font-display">
                {greetingText}, {getAdminFirstName(adminUser)}
              </h2>
              <p className="text-sm text-neutral-muted mt-0.5">
                Here's what's happening across Tamil Nadu Volunteers verification and interview pipelines today.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-brand-green-tint text-brand-green-dark border border-brand-green-tint">
                <svg className="w-3.5 h-3.5 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                AES-256 Aadhaar Guard
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-yellow-tint text-amber-900 border border-brand-yellow/40">
                10-Point Score Rubric Active
              </span>
            </div>
          </div>

          {memberNotice && (
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-green/30 bg-brand-green-tint px-4 py-3 text-sm font-semibold text-brand-green-dark">
              <span>{memberNotice}</span>
              <button type="button" onClick={() => setMemberNotice('')} className="shrink-0 text-xs font-bold underline">
                Dismiss
              </button>
            </div>
          )}

          {activeNav === 'dashboard' && (
            <>
              {/* Stat cards: every number comes from the member records */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {statCards.map(card => {
                  const content = (
                    <>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${card.tone}`}>
                        <StatIcon name={card.icon} />
                      </div>
                      <div className="text-2xl font-black text-neutral-ink font-display">{card.value}</div>
                      <div className="text-xs font-bold text-neutral-700 mt-0.5">{card.label}</div>
                      <div className="text-[11px] text-neutral-muted mt-1 truncate">{card.note}</div>
                    </>
                  );
                  const cls = `min-w-0 bg-white rounded-2xl p-4 sm:p-5 border-t-4 ${card.accent} shadow-sm border border-brand-green-tint/80 text-left`;
                  return card.nav ? (
                    <button key={card.label} type="button" onClick={() => openNav(card.nav)} className={`${cls} hover:shadow-md transition-shadow`}>
                      {content}
                    </button>
                  ) : (
                    <div key={card.label} className={cls}>{content}</div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Quick Stats */}
                <section className="min-w-0 bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                  <h3 className="font-bold text-brand-green-dark text-sm font-display mb-3">Quick Stats</h3>
                  <dl className="space-y-1 text-xs">
                    {[
                      { label: 'Joined today', value: quickStats.joinedToday },
                      { label: 'Joined this month', value: quickStats.joinedThisMonth },
                      { label: 'Approved this month', value: quickStats.approvedThisMonth },
                      { label: 'Fees collected this month', value: `₹${quickStats.feesThisMonth.toLocaleString('en-IN')}` },
                      { label: 'Applicants called today', value: quickStats.calledToday },
                      { label: 'Birthdays in the next 7 days', value: birthdays.today.length + birthdays.upcoming.filter(b => b.daysAway <= 7).length }
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
                        <dt className="text-neutral-600">{row.label}</dt>
                        <dd className="font-bold text-neutral-900">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>

                {/* Recent Members */}
                <section className="min-w-0 bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-brand-green-dark text-sm font-display">Recent Members</h3>
                    <button type="button" onClick={() => openNav('members-all')} className="text-xs font-bold text-brand-green hover:underline">
                      View all
                    </button>
                  </div>
                  {recentMembers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">No members have registered yet.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {recentMembers.map(m => {
                        const st = memberStatus(m);
                        return (
                          <li key={m.id} className="flex items-center gap-3 py-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-green-tint text-brand-green-dark font-bold flex items-center justify-center text-xs shrink-0">
                              {(m.full_name || m.username || 'V').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-neutral-900 truncate">{m.full_name || m.username}</p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                {m.district_name || 'Tamil Nadu'} · {timeAgo(m.created_at)}
                              </p>
                            </div>
                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${st.cls}`}>{st.label}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {/* Recent Activity */}
                <section className="min-w-0 bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                  <h3 className="font-bold text-brand-green-dark text-sm font-display mb-3">Recent Activity</h3>
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">No activity yet.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recentActivity.map((e, idx) => (
                        <li key={idx} className="flex gap-3 text-xs">
                          <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${ACTIVITY_DOT[e.kind]}`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-neutral-800 break-words">{e.text}</p>
                            <p className="text-[11px] text-neutral-500">
                              {timeAgo(e.at)}{e.sub ? ` · ${e.sub}` : ''}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Monthly Registrations */}
                <section className="min-w-0 lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="font-bold text-brand-green-dark text-sm font-display">Monthly Registrations</h3>
                    <div className="flex items-center gap-4 text-[11px] text-neutral-500">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-green" />Registered</span>
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand-yellow" />Approved</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-2 sm:gap-4 h-40" role="img" aria-label="Registrations and approvals over the last six months">
                    {monthlyRegistrations.map(m => (
                      <div key={m.key} className="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">
                        <div className="w-full flex-1 flex items-end justify-center gap-1">
                          <div className="w-1/3 max-w-[18px] rounded-t bg-brand-green" style={{ height: `${(m.registered / monthlyMax) * 100}%` }} title={`${m.registered} registered`} />
                          <div className="w-1/3 max-w-[18px] rounded-t bg-brand-yellow" style={{ height: `${(m.approved / monthlyMax) * 100}%` }} title={`${m.approved} approved`} />
                        </div>
                        <span className="text-[10px] font-semibold text-neutral-600">{m.label}</span>
                        <span className="text-[10px] text-neutral-400">{m.registered}/{m.approved}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Birthdays */}
                <section className="min-w-0 bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="font-bold text-brand-green-dark text-sm font-display">Birthdays</h3>
                    <button type="button" onClick={() => openNav('birthdays')} className="text-xs font-bold text-brand-green hover:underline">
                      View all
                    </button>
                  </div>
                  {birthdays.today.length === 0 && birthdays.upcoming.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">No birthdays in the next 30 days.</p>
                  ) : (
                    <ul className="divide-y divide-neutral-100">
                      {[...birthdays.today, ...birthdays.upcoming].slice(0, 4).map(b => {
                        const wish = b.daysAway === 0 ? birthdayWishLink(b.phone, b.full_name) : null;
                        return (
                          <li key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-neutral-900 truncate">{b.full_name || b.username}</p>
                              <p className="text-[11px] text-neutral-500">
                                {b.daysAway === 0 ? 'Today' : b.daysAway === 1 ? 'Tomorrow' : `In ${b.daysAway} days`} · turns {b.turning}
                              </p>
                            </div>
                            {wish && (
                              <a href={wish} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700">
                                Wish
                              </a>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </div>
            </>
          )}

                    {/* NEW: Dashboard Date Filter */}
                    {activeNav === 'dashboard' && (
                    <section className="mt-6 rounded-2xl border border-brand-green-tint bg-white p-4 shadow-sm sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <h2 className="font-display text-lg font-bold text-neutral-ink">
                            Dashboard Overview
                          </h2>
                          <p className="mt-1 text-sm text-neutral-muted">
                            Choose a period for the new dashboard insights.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {[
                            { label: 'Today', value: 'today' },
                            { label: 'Last 7 Days', value: '7days' },
                            { label: 'Last 30 Days', value: '30days' },
                            { label: 'Custom', value: 'custom' }
                          ].map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setDashboardDateRange(option.value)}
                              className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                                dashboardDateRange === option.value
                                  ? 'border-brand-green bg-brand-green text-white'
                                  : 'border-brand-green-tint bg-white text-brand-green hover:bg-brand-green-tint'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {dashboardDateRange === 'custom' && (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:max-w-xl sm:grid-cols-2">
                          <label className="text-sm font-semibold text-neutral-ink">
                            Start date
                            <input
                              type="date"
                              value={dashboardCustomStart}
                              onChange={event => setDashboardCustomStart(event.target.value)}
                              max={dashboardCustomEnd || undefined}
                              className="mt-1 min-h-11 w-full rounded-lg border border-brand-green-tint bg-white px-3 text-sm"
                            />
                          </label>
                          <label className="text-sm font-semibold text-neutral-ink">
                            End date
                            <input
                              type="date"
                              value={dashboardCustomEnd}
                              min={dashboardCustomStart || undefined}
                              onChange={event => setDashboardCustomEnd(event.target.value)}
                              className="mt-1 min-h-11 w-full rounded-lg border border-brand-green-tint bg-white px-3 text-sm"
                            />
                          </label>
                        </div>
                      )}
                    </section>
                    )}

                    {/* NEW: Date-filtered call insights */}
                    {activeNav === 'dashboard' && (
                      <section className="mt-6">
                        <div className="mb-4">
                          <h2 className="font-display text-lg font-bold text-neutral-ink">
                            Call Activity Insights
                          </h2>
                          <p className="mt-1 text-sm text-neutral-muted">
                            Latest recorded call activity within your selected period.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                          {[
                            { label: 'Call Activities', value: dashboardCallInsights.totalCalls, description: 'Latest call records', color: 'text-brand-green' },
                            { label: 'Candidates Attended', value: dashboardCallInsights.attending, description: 'Marked as attending', color: 'text-brand-green' },
                            { label: 'No Answer', value: dashboardCallInsights.noAnswer, description: 'Unanswered attempts', color: 'text-status-no-answer' },
                            { label: 'Postponed', value: dashboardCallInsights.postponed, description: 'Postponed or scheduled', color: 'text-status-scheduled' },
                            { label: 'Declined', value: dashboardCallInsights.declined, description: 'Not attending', color: 'text-neutral-muted' }
                          ].map(card => (
                            <div
                              key={card.label}
                              className="rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm"
                            >
                              <p className="text-sm font-medium text-neutral-muted">{card.label}</p>
                              <p className={`mt-3 text-3xl font-bold ${card.color}`}>{card.value}</p>
                              <p className="mt-2 text-xs text-neutral-muted">{card.description}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    
                    {/* Call Activity Trend */}
                    {activeNav === 'dashboard' && (
                      <section className="mt-6 rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-6">
                          <h2 className="font-display text-lg font-bold text-neutral-ink">
                            Call Activity Trend
                          </h2>
                          <p className="mt-1 text-sm text-neutral-muted">
                            Latest recorded call outcomes across your selected date range.
                          </p>
                        </div>

                        {dashboardCallTrend.length === 0 ? (
                          <p className="py-8 text-center text-sm text-neutral-muted">
                            No call activity available for this period.
                          </p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-4 mb-5 text-xs text-neutral-muted">
                              {[
                                { label: 'Attending', color: 'bg-emerald-500' },
                                { label: 'No answer', color: 'bg-amber-500' },
                                { label: 'Postponed', color: 'bg-sky-500' },
                                { label: 'Declined', color: 'bg-rose-500' }
                              ].map(item => (
                                <div key={item.label} className="flex items-center gap-2">
                                  <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                                  {item.label}
                                </div>
                              ))}
                            </div>

                            <div className="space-y-5">
                              {dashboardCallTrend.map(bucket => {
                                const maxValue = Math.max(
                                  1,
                                  ...dashboardCallTrend.map(day => day.total)
                                );

                                return (
                                  <div key={bucket.start}>
                                    <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                      <span className="font-semibold text-neutral-700">
                                        {bucket.label}
                                      </span>
                                      <span className="text-neutral-muted">
                                        {bucket.total} record{bucket.total === 1 ? '' : 's'}
                                      </span>
                                    </div>

                                    <div
                                      className="flex h-5 w-full overflow-hidden rounded-md bg-neutral-100"
                                      role="img"
                                      aria-label={`${bucket.label}: ${bucket.total} call records`}
                                    >
                                      {[
                                        { value: bucket.attending, color: 'bg-emerald-500' },
                                        { value: bucket.noAnswer, color: 'bg-amber-500' },
                                        { value: bucket.postponed, color: 'bg-sky-500' },
                                        { value: bucket.declined, color: 'bg-rose-500' }
                                      ].map((segment, index) => (
                                        <div
                                          key={index}
                                          className={`${segment.color} h-full transition-all`}
                                          style={{
                                            width: `${(segment.value / maxValue) * 100}%`
                                          }}
                                          title={`${segment.value}`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <p className="mt-5 text-xs text-neutral-muted">
                              Each record represents the latest available call record for an applicant, not necessarily every call attempt.
                            </p>
                          </>
                        )}
                      </section>
                    )}


                    {/* Application Conversion Funnel */}
                    {activeNav === 'dashboard' && (
                      <section className="mt-6 mb-6 rounded-2xl border border-brand-green-tint bg-white p-5 shadow-sm sm:p-6">
                        <div className="mb-5">
                          <h2 className="font-display text-lg font-bold text-neutral-ink">
                            Application Conversion Funnel
                          </h2>
                          <p className="mt-1 text-sm text-neutral-muted">
                            Track applicants from registration through approval.
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                          {conversionFunnel.map((stage, index) => (
                            <div key={stage.label} className="rounded-xl border border-brand-green-tint bg-neutral-bg/50 p-4">
                              <div className="mb-3 flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-neutral-700">{stage.label}</span>
                                <span className="text-xs font-bold text-brand-green">{stage.percentage}%</span>
                              </div>
                              <div className="text-2xl font-black text-neutral-ink">{stage.count.toLocaleString()}</div>
                              <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                                <div
                                  className="h-full rounded-full bg-brand-green transition-all"
                                  style={{ width: `${Math.min(stage.percentage, 100)}%` }}
                                />
                              </div>
                              {index > 0 && (
                                <p className="mt-3 text-xs text-neutral-muted">
                                  {stage.dropOff} fewer than {conversionFunnel[index - 1].label}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

          {/* NEW: Needs Attention panel */}
          {activeNav === 'dashboard' && (
            <section className="mt-6 rounded-2xl border border-brand-yellow/40 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-neutral-ink">
                    Needs Attention
                  </h2>
                  <p className="mt-1 text-sm text-neutral-muted">
                    Applicants awaiting review.
                  </p>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-brand-yellow-tint px-3 py-1 text-sm font-bold text-neutral-ink">
                  {dashboardNeedsAttention.total} pending
                </span>
              </div>

              {dashboardNeedsAttention.total === 0 ? (
                <div className="mt-4 rounded-xl border border-brand-green-tint bg-neutral-bg p-4 text-sm text-neutral-muted">
                  No pending applicants found.
                </div>
              ) : (
                <div className="mt-4 divide-y divide-neutral-100">
                  {dashboardNeedsAttention.applicants.map(applicant => (
                    <div
                      key={applicant.id || applicant.tnv_id || applicant.username}
                      className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-ink">
                          {applicant.full_name || applicant.username || 'Unnamed applicant'}
                        </p>
                        <p className="mt-1 text-xs text-neutral-muted">
                          {applicant.district_name || 'District not specified'}
                          {' · '}
                          {applicant.wing_to_join || applicant.wing_name || 'Wing not specified'}
                        </p>
                      </div>

                      <span className="w-fit rounded-lg bg-brand-yellow-tint px-3 py-1 text-xs font-semibold text-neutral-ink">
                        Pending review
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ==================================================== */}
          {/* 4. MAIN OPERATIONAL WORKBENCH                        */}
          {/* ==================================================== */}
          {activeNav === 'questions' ? (
            /* Dedicated Question Bank Workbench */
            <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6 space-y-6">
              {/* Question Bank Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-neutral-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-green animate-pulse" />
                    <span className="text-[11px] font-bold text-brand-green uppercase tracking-wider font-display">
                      Interview Rubric Governance
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark font-display mt-1">
                    Interview Question Bank ({questions.length} Questions)
                  </h2>
                  <p className="text-xs text-neutral-muted mt-0.5">
                    Official bilingual screening rubric. Choose or unchoose questions to activate or deactivate them. Exactly 10 questions are used for candidate interview scoring.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Live Counter Pill */}
                  <div
                    className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-2 border transition-all ${
                      activeQuestionIds.size === 10
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs'
                        : 'bg-amber-50 text-amber-900 border-amber-300'
                    }`}
                  >
                    <span className="font-mono text-sm">{activeQuestionIds.size} / 10 Active</span>
                    <span>
                      {activeQuestionIds.size === 10
                        ? '✓ Standard Rubric (Ready to Save)'
                        : `(${activeQuestionIds.size < 10 ? `Select ${10 - activeQuestionIds.size} more` : `Unchoose ${activeQuestionIds.size - 10} questions`})`}
                    </span>
                  </div>

                  {/* Add New Question Button */}
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(true)}
                    className="px-4 py-2 rounded-xl bg-white border border-brand-green text-brand-green hover:bg-brand-green-tint font-bold text-xs transition-colors shadow-sm flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Question</span>
                  </button>

                  {/* Save Active Set Button */}
                  <button
                    type="button"
                    onClick={handleSaveActiveQuestions}
                    disabled={savingQuestionSet || activeQuestionIds.size === 0}
                    className="px-4 py-2 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-neutral-900 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingQuestionSet ? (
                      <span>Saving Active Set...</span>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>Save Active ({activeQuestionIds.size}) Questions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback Alert */}
              {questionSetFeedback && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    questionSetFeedback.includes('✓') || questionSetFeedback.includes('successfully') || questionSetFeedback.includes('updated')
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>{questionSetFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuestionSetFeedback('')}
                    className="text-neutral-500 hover:text-neutral-900 font-bold ml-3"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Filter Tabs & Quick Actions Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-50/80 rounded-xl border border-neutral-200/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setQuestionFilterTab('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      questionFilterTab === 'all'
                        ? 'bg-brand-green text-white shadow-2xs'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    All Questions ({questions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilterTab('active')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      questionFilterTab === 'active'
                        ? 'bg-brand-green text-white shadow-2xs'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Active ({activeQuestionIds.size})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuestionFilterTab('inactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                      questionFilterTab === 'inactive'
                        ? 'bg-brand-green text-white shadow-2xs'
                        : 'text-neutral-600 hover:bg-neutral-200/60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                    <span>Deactivated ({Math.max(0, questions.length - activeQuestionIds.size)})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectTop10}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-brand-green bg-white border border-brand-green/30 hover:bg-brand-green-tint transition-colors"
                  >
                    Select Top 10
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllActive}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-neutral-600 bg-white border border-neutral-300 hover:bg-neutral-100 transition-colors"
                  >
                    Deactivate All
                  </button>
                </div>
              </div>

              {/* Question Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions
                  .filter(q => {
                    if (questionFilterTab === 'active') return activeQuestionIds.has(q.id);
                    if (questionFilterTab === 'inactive') return !activeQuestionIds.has(q.id);
                    return true;
                  })
                  .map((q, idx) => {
                    const isActive = activeQuestionIds.has(q.id);
                    return (
                      <div
                        key={q.id || idx}
                        className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                          isActive
                            ? 'bg-white border-brand-green shadow-sm ring-2 ring-brand-green/20'
                            : 'bg-neutral-50/70 border-neutral-200/80 hover:border-neutral-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-800">
                                Q{q.position || idx + 1}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 border ${
                                  isActive
                                    ? 'bg-brand-green-tint text-brand-green-dark border-brand-green/30'
                                    : 'bg-neutral-200/80 text-neutral-600 border-neutral-300'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-brand-green animate-pulse' : 'bg-neutral-400'}`} />
                                <span>{isActive ? 'Active Rubric' : 'Deactivated'}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Direct Activate / Deactivate Toggle Button */}
                              {isActive ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeactivateQuestion(q.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
                                  title="Deactivate this question"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Deactivate</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleActivateQuestion(q.id)}
                                  className="px-3 py-1 rounded-lg text-xs font-bold text-white bg-brand-green hover:bg-brand-green-dark shadow-2xs transition-colors flex items-center gap-1"
                                  title="Activate this question"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Activate</span>
                                </button>
                              )}

                              {/* Delete Question Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(q.id)}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete from Question Bank"
                                aria-label={`Delete question ${q.id}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="font-bold text-neutral-900 text-sm leading-snug">
                              {q.question_en}
                            </div>
                            <div className="font-display font-semibold text-brand-green-dark text-sm leading-relaxed">
                              {q.question_ta}
                            </div>
                          </div>
                        </div>

                        {q.hint && (
                          <div className="mt-3.5 bg-brand-green-tint/40 border border-brand-green-tint rounded-xl p-2.5 text-xs text-neutral-700">
                            <span className="font-bold text-brand-green-dark">Evaluator Hint: </span>
                            <span className="italic">{q.hint}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : activeNav === 'birthdays' ? (
            <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-brand-green-dark text-base font-display">Birthday Wishes</h3>
                  <p className="text-xs text-neutral-muted mt-0.5">Send a WhatsApp wish to members on their birthday.</p>
                </div>
                <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-bold">
                  {[
                    { id: 'today', label: `Today (${birthdays.today.length})` },
                    { id: 'upcoming', label: `Upcoming (${birthdays.upcoming.length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setBirthdayTab(tab.id)}
                      className={`min-h-9 px-3 rounded-lg transition-colors ${birthdayTab === tab.id ? 'bg-white text-brand-green-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {(() => {
                const list = birthdayTab === 'today' ? birthdays.today : birthdays.upcoming;
                if (list.length === 0) {
                  return (
                    <p className="py-12 text-center text-sm text-neutral-500">
                      {birthdayTab === 'today' ? 'No member birthdays today.' : 'No member birthdays in the next 30 days.'}
                    </p>
                  );
                }
                return (
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {list.map(b => {
                      const wish = birthdayWishLink(b.phone, b.full_name);
                      return (
                        <li key={b.id} className="min-w-0 flex items-center gap-3 rounded-xl border border-neutral-200 p-3.5">
                          <div className="w-10 h-10 rounded-full bg-brand-yellow-tint text-amber-800 flex items-center justify-center shrink-0">
                            <StatIcon name="cake" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-neutral-900 truncate">{b.full_name || b.username}</p>
                            <p className="text-[11px] text-neutral-500 truncate">
                              {b.nextBirthday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              {' · '}turns {b.turning}
                              {b.daysAway > 0 ? ` · in ${b.daysAway} day${b.daysAway > 1 ? 's' : ''}` : ''}
                              {b.district_name ? ` · ${b.district_name}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            {b.phone && (
                              <a href={`tel:${b.phone}`} className="p-2 rounded-lg border border-brand-green-tint text-brand-green-dark hover:bg-brand-green-tint" title={`Call ${b.phone}`}>
                                <StatIcon name="phone" className="w-4 h-4" />
                              </a>
                            )}
                            {wish && (
                              <a href={wish} target="_blank" rel="noopener noreferrer" className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                );
              })()}
            </section>
          ) : activeNav === 'dashboard' ? null : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 8 Columns: Dynamic Workbenches */}
              <div className="lg:col-span-8 space-y-6">
                {/* Filter & Search Bar */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80 space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    {/* Search query */}
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search by full name, phone, email, username or TNV ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                      />
                      <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>

                    {/* Reset Filters */}
                    {(searchQuery || filterDistrict || filterStatus || filterWing || filterCallStatus) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterDistrict('');
                          setFilterStatus('');
                          setFilterWing('');
                          setFilterCallStatus('');
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-2 rounded-lg bg-rose-50"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>

                  {/* Filter Pills / Dropdowns */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-neutral-100">
                    {/* District Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        District
                      </label>
                      <select
                        value={filterDistrict}
                        onChange={(e) => setFilterDistrict(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                      >
                        <option value="">All 38 Districts</option>
                        {TN_DISTRICTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Verification Status */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Status
                      </label>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                      >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending Review</option>
                        <option value="approved">Approved</option>
                      </select>
                    </div>

                    {/* Wing Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Wing
                      </label>
                      <select
                        value={filterWing}
                        onChange={(e) => setFilterWing(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                      >
                        <option value="">All Wings</option>
                        {WINGS.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    {/* Call Status Dropdown */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Call Status
                      </label>
                      <select
                        value={filterCallStatus}
                        onChange={(e) => setFilterCallStatus(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                      >
                        <option value="">All Call States</option>
                        <option value="Attending">Attending</option>
                        <option value="Postponed">Postponed</option>
                        <option value="No Answer">No Answer</option>
                        <option value="Not Attending">Not Attending</option>
                        <option value="Not Called">Not Called</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Main Table: Applicant Queue */}
                <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint/80 overflow-hidden">
                  <div className="px-5 py-4 border-b border-brand-green-tint/80 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-brand-green-dark text-sm font-display">
                        {NAV_LABELS[activeNav] || 'Members'} ({filteredApplicants.length})
                      </h3>
                      <p className="text-xs text-neutral-muted">
                        Telephone screening, Aadhaar audit, 10-point evaluation, and role appointment
                      </p>
                    </div>

                    <Link
                      to="/register?admin=1"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
                    >
                      <StatIcon name="userplus" className="w-3.5 h-3.5" />
                      Add Member
                    </Link>
                  </div>

                {loading ? (
                  <div className="py-16 text-center">
                    <Spinner className="mx-auto" />
                    <p className="text-xs text-neutral-500 mt-2 font-medium">Loading applicant dossiers...</p>
                  </div>
                ) : filteredApplicants.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-neutral-800">
                      {activeNav === 'members-blocked' ? 'No blocked members' : 'No members found matching criteria'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">Try resetting search filters or add a new member.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F8FAFC] text-neutral-600 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200">
                        <tr>
                          <th className="py-3 px-4">Candidate</th>
                          <th className="py-3 px-4">Location & Wing</th>
                          <th className="py-3 px-4">Fee Status</th>
                          <th className="py-3 px-4">Call Screening</th>
                          <th className="py-3 px-4">Interview Score</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredApplicants.map((app) => {
                          const isApproved = app.status === 'approved';
                          const isPaid = app.membership_paid;
                          const callSt = app.call_status || 'Not Called';

                          return (
                            <tr key={app.id} className="hover:bg-blue-50/40 transition-colors">
                              {/* Candidate Info */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-neutral-300">
                                    {app.full_name ? app.full_name.charAt(0).toUpperCase() : 'V'}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-bold text-neutral-900 truncate">
                                      {app.full_name || app.username}
                                    </div>
                                    <div className="text-[11px] text-neutral-500 flex items-center gap-1">
                                      <a
                                        href={`tel:${app.phone}`}
                                        className="text-blue-600 hover:underline font-mono"
                                      >
                                        {app.phone}
                                      </a>
                                      <span>•</span>
                                      <span className="truncate">{app.username}</span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Location & Wing */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-neutral-800">
                                  {app.district_name || 'Tamil Nadu'}
                                </div>
                                <div className="text-[11px] text-neutral-500 truncate max-w-[140px]">
                                  {getShortWing(app.wing_to_join || app.wing_name)}
                                </div>
                              </td>

                              {/* Membership Fee */}
                              <td className="py-3.5 px-4">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    ₹365 Paid
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                    Pending Fee
                                  </span>
                                )}
                              </td>

                              {/* Call Screening Badge (CLICKABLE TO OPEN CALL MODAL) */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCallModal(app)}
                                  className="group flex flex-col items-start text-left focus:outline-none"
                                  title="Click to view call history or log new call"
                                >
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all group-hover:scale-105 ${
                                      callSt === 'Attending'
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : callSt === 'Postponed'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : callSt === 'No Answer'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : callSt === 'Not Attending'
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        callSt === 'Attending'
                                          ? 'bg-emerald-500'
                                          : callSt === 'Postponed'
                                          ? 'bg-amber-500'
                                          : callSt === 'No Answer'
                                          ? 'bg-blue-500'
                                          : callSt === 'Not Attending'
                                          ? 'bg-rose-500'
                                          : 'bg-neutral-400'
                                      }`}
                                    />
                                    <span>{callSt}</span>
                                  </span>
                                  {app.total_call_attempts ? (
                                    <span className="text-[10px] text-neutral-400 mt-0.5 group-hover:text-blue-600">
                                      {app.total_call_attempts} attempt{app.total_call_attempts > 1 ? 's' : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-blue-600 mt-0.5 underline">Log Call</span>
                                  )}
                                </button>
                              </td>

                              {/* Interview Score */}
                              <td className="py-3.5 px-4">
                                {app.total_score !== undefined && app.total_score !== null ? (
                                  <span className="font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-xs font-mono">
                                    {Number(app.total_score).toFixed(1)} / 10
                                  </span>
                                ) : (
                                  <span className="text-neutral-400 text-[11px] italic">Not scored</span>
                                )}
                              </td>

                              {/* Verification Status */}
                              <td className="py-3.5 px-4">
                                {app.blocked ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200" title={app.blocked_at ? `Blocked ${formatShortDate(app.blocked_at)}` : 'Blocked'}>
                                    Blocked
                                  </span>
                                ) : isApproved ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-mono text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                      {app.tnv_id || 'Approved'}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Pending Review
                                  </span>
                                )}
                              </td>

                              {/* Action Buttons */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Dedicated Log Call Modal Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCallModal(app)}
                                    className="p-1.5 rounded-lg text-brand-green-dark hover:bg-brand-green-tint bg-white border border-brand-green-tint transition-colors"
                                    title="Open Call Log Modal"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                  </button>

                                  {/* Deep Evaluation / Score Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvaluation(app)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-green hover:bg-brand-green-dark shadow-xs transition-colors"
                                  >
                                    Review & Score
                                  </button>

                                  {isMasterAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleBlock(app)}
                                      disabled={blockingId === app.id}
                                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                                        app.blocked
                                          ? 'text-brand-green-dark border-brand-green-tint bg-white hover:bg-brand-green-tint'
                                          : 'text-rose-700 border-rose-200 bg-white hover:bg-rose-50'
                                      }`}
                                    >
                                      {blockingId === app.id ? '…' : app.blocked ? 'Unblock' : 'Block'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right 4 Columns: Quick Stats & Telecall Desk */}
            <div className="lg:col-span-4 space-y-6">
              {/* Telecall Operations Desk Card */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-brand-green-dark text-sm font-display flex items-center gap-2">
                    <svg className="w-4 h-4 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Telecall Operations Desk</span>
                  </h3>
                  <span className="text-[10px] font-bold text-brand-green-dark bg-brand-green-tint px-2.5 py-0.5 rounded-full border border-brand-green/30">
                    {metrics.totalCalls} Calls
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">Postponed / Candidate Busy</span>
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      {metrics.postponedCount}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">Candidates Attended</span>
                    <span className="font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full border border-brand-green/20">
                      {metrics.attendedCount}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">Unanswered / Switch Off</span>
                    <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                      {metrics.noAnswerCount}
                    </span>
                  </div>

                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700">Declined / Not Attending</span>
                    <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                      {metrics.declinedCount}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={() => {
                      if (Array.isArray(applicants) && applicants.length > 0) handleOpenCallModal(applicants[0]);
                    }}
                    className="w-full py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Log Screening Call</span>
                  </button>
                </div>
              </div>

              {/* Recent Call Activity Feed */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-brand-green-dark text-sm font-display">
                    Recent Call Activity
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-semibold">Live Feed</span>
                </div>

                {allRecentCallLogs.length === 0 ? (
                  <p className="text-xs text-neutral-400 text-center py-6">
                    No recent call activity logged yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {allRecentCallLogs.slice(0, 5).map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs hover:border-brand-green-tint transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-neutral-900 truncate max-w-[140px]">
                            {log.candidate_name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'Attending'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'Postponed'
                                ? 'bg-amber-100 text-amber-800'
                                : log.status === 'No Answer'
                                ? 'bg-slate-200 text-slate-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                        <p className="text-neutral-500 text-[11px] mt-1 line-clamp-1 italic">
                          "{log.notes}"
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-1.5 pt-1 border-t border-neutral-100">
                          <span>{log.district_name || 'Tamil Nadu'}</span>
                          <span>{formatSafeTime(log.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Operational Stats */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-green-tint/80">
                <h3 className="font-bold text-brand-green-dark text-sm font-display mb-3">
                  Governance & Compliance
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-600">Aadhaar Encryption</span>
                    <span className="font-mono font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded border border-brand-green/20">
                      AES-256-GCM
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-600">Active Interview Rubric</span>
                    <span className="font-bold text-neutral-800 font-mono">
                      {activeQuestionIds.size} of {questions.length} active
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-600">Blocked members</span>
                    <span className="font-bold text-neutral-800">{metrics.blockedCount}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-600">Districts covered</span>
                    <span className="font-bold text-neutral-800">{districtCoverage.activeDistricts} of {districtCoverage.totalDistricts}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* ==================================================== */}
      {/* 5. THE CALL LOG MODEL (Dedicated Telephone Modal)    */}
      {/* ==================================================== */}
      {callModalApplicant && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 bg-brand-green-dark text-white flex items-center justify-between font-display">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-bold">
                  {callModalApplicant.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Telephone Interview Screening
                  </h3>
                  <p className="text-xs text-emerald-200">
                    Candidate: {callModalApplicant.full_name || callModalApplicant.username} • {callModalApplicant.district_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseCallModal}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Candidate Quick Contact Bar */}
            <div className="bg-brand-green-tint/60 px-6 py-3 border-b border-brand-green-tint flex flex-wrap items-center justify-between text-xs text-brand-green-dark">
              <div className="flex items-center gap-3 font-semibold">
                <span>Phone:</span>
                <a
                  href={`tel:${callModalApplicant.phone}`}
                  className="inline-flex items-center gap-1 font-mono font-bold text-brand-green-dark hover:underline bg-white px-2 py-1 rounded border border-brand-green-tint"
                >
                  <svg className="w-3.5 h-3.5 text-brand-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{callModalApplicant.phone}</span>
                </a>
              </div>
              <div>
                Wing: <strong className="text-brand-green-dark">{getShortWing(callModalApplicant?.wing_to_join)}</strong>
              </div>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Feedback messages */}
              {callSuccessMessage && (
                <div className="p-3 bg-brand-green-tint border border-brand-green text-brand-green-dark rounded-xl text-xs font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-green shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{callSuccessMessage}</span>
                </div>
              )}

              {callErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {callErrorMessage}
                </div>
              )}

              {/* Call History Timeline for Candidate */}
              <div>
                <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Previous Call Attempts</span>
                  <span className="text-neutral-400 font-normal lowercase">({callModalLogs.length} logged)</span>
                </h4>

                {callModalLoadingLogs ? (
                  <div className="py-4 text-center text-xs text-neutral-400">Loading call history...</div>
                ) : callModalLogs.length === 0 ? (
                  <div className="p-3 rounded-xl bg-neutral-50 text-neutral-500 text-xs italic border border-neutral-100">
                    No previous calls logged for this candidate. First screening call.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {callModalLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.status === 'Attending'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.status === 'Postponed'
                                ? 'bg-amber-100 text-amber-800'
                                : log.status === 'No Answer'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {log.status}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {formatSafeDateTime(log.created_at)}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-neutral-700 text-[11px] italic">
                            "{log.notes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form: New Call Entry */}
              <form onSubmit={(e) => handleSubmitCallLog(e, false)} className="space-y-4 pt-3 border-t border-neutral-200">
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-2">
                    Call Outcome Status (Select One) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Attending */}
                    <button
                      type="button"
                      onClick={() => setCallStatus('Attending')}
                      className={`p-3 rounded-xl border-2 text-left font-semibold text-xs flex items-center gap-2.5 transition-all ${
                        callStatus === 'Attending'
                          ? 'border-brand-green bg-brand-green-tint text-brand-green-dark ring-2 ring-brand-green/20'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-brand-green shrink-0" />
                      <div>
                        <div className="font-bold">Attending</div>
                        <div className="text-[10px] text-neutral-500 font-normal">Candidate connected & available</div>
                      </div>
                    </button>

                    {/* Postponed / Callback */}
                    <button
                      type="button"
                      onClick={() => setCallStatus('Postponed')}
                      className={`p-3 rounded-xl border-2 text-left font-semibold text-xs flex items-center gap-2.5 transition-all ${
                        callStatus === 'Postponed'
                          ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                      <div>
                        <div className="font-bold">Postponed</div>
                        <div className="text-[10px] text-neutral-500 font-normal">Call postponed / candidate busy</div>
                      </div>
                    </button>

                    {/* No Answer */}
                    <button
                      type="button"
                      onClick={() => setCallStatus('No Answer')}
                      className={`p-3 rounded-xl border-2 text-left font-semibold text-xs flex items-center gap-2.5 transition-all ${
                        callStatus === 'No Answer'
                          ? 'border-neutral-700 bg-neutral-100 text-neutral-900 ring-2 ring-neutral-400/20'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-neutral-500 shrink-0" />
                      <div>
                        <div className="font-bold">No Answer</div>
                        <div className="text-[10px] text-neutral-500 font-normal">Ringing / Switch off</div>
                      </div>
                    </button>

                    {/* Not Attending */}
                    <button
                      type="button"
                      onClick={() => setCallStatus('Not Attending')}
                      className={`p-3 rounded-xl border-2 text-left font-semibold text-xs flex items-center gap-2.5 transition-all ${
                        callStatus === 'Not Attending'
                          ? 'border-rose-600 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20'
                          : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                      <div>
                        <div className="font-bold">Not Attending</div>
                        <div className="text-[10px] text-neutral-500 font-normal">Declined or withdrawn</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Call Notes */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1">
                    Screening Observations & Notes
                  </label>
                  <textarea
                    rows="3"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={submittingCall}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                  >
                    {submittingCall ? 'Recording Call...' : 'Save Call Log'}
                  </button>

                  {callStatus === 'Attending' && (
                    <button
                      type="button"
                      onClick={() => handleSubmitCallLog(null, true)}
                      disabled={submittingCall}
                      className="py-2.5 px-4 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>Save & Open 10-Q Scoresheet</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. DOSSIER & 10-QUESTION INTERVIEW SCORING MODAL     */}
      {/* ==================================================== */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Top Bar */}
            <div className="px-6 py-4 bg-brand-green-dark text-white flex items-center justify-between border-b border-emerald-900/60 font-display">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-yellow text-neutral-900 font-black font-display text-sm flex items-center justify-center">
                  {selectedApplicant.full_name?.charAt(0) || 'V'}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Candidate Deep Evaluation Dossier
                  </h3>
                  <p className="text-xs text-emerald-200">
                    {selectedApplicant.full_name} • {selectedApplicant.district_name} • {selectedApplicant.phone}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEvaluation}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 text-xs font-bold text-neutral-600">
              <button
                type="button"
                onClick={() => setModalTab('evaluation')}
                className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
                  modalTab === 'evaluation'
                    ? 'border-brand-green text-brand-green-dark bg-white font-bold'
                    : 'border-transparent hover:text-neutral-900'
                }`}
              >
                10-Question Scoresheet ({currentTotalScore.toFixed(1)} / {activeQuestionsList.length})
              </button>
              <button
                type="button"
                onClick={() => setModalTab('dossier')}
                className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
                  modalTab === 'dossier'
                    ? 'border-brand-green text-brand-green-dark bg-white font-bold'
                    : 'border-transparent hover:text-neutral-900'
                }`}
              >
                Candidate Profile Details
              </button>
              <button
                type="button"
                onClick={() => setModalTab('aadhaar')}
                className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
                  modalTab === 'aadhaar'
                    ? 'border-brand-green text-brand-green-dark bg-white font-bold'
                    : 'border-transparent hover:text-neutral-900'
                }`}
              >
                Aadhaar Verification (Audit)
              </button>
              <button
                type="button"
                onClick={() => setModalTab('appointment')}
                className={`py-3 px-4 border-b-2 font-semibold transition-colors ${
                  modalTab === 'appointment'
                    ? 'border-brand-green text-brand-green-dark bg-white font-bold'
                    : 'border-transparent hover:text-neutral-900'
                }`}
              >
                Appointment & Approval
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: 10-QUESTION INTERVIEW SCORING */}
              {modalTab === 'evaluation' && (
                <div className="space-y-6">
                  {/* Score Summary Banner */}
                  <div className="p-4 rounded-xl bg-brand-green-tint/60 border border-brand-green-tint flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-brand-green-dark uppercase tracking-wider font-display">
                        Current Interview Evaluation
                      </div>
                      <div className="text-2xl font-black text-brand-green-dark font-display mt-0.5">
                        {currentTotalScore.toFixed(1)} <span className="text-sm font-semibold text-brand-green">/ {activeQuestionsList.length} marks</span>
                      </div>
                      <div className="text-xs text-brand-green-dark font-semibold mt-1">
                        Recommended Designation: <strong className="underline">{getRecommendedRole(currentTotalScore)}</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveInterviewScores}
                      disabled={savingScores}
                      className="px-5 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white font-bold text-xs shadow-sm transition-all"
                    >
                      {savingScores ? 'Saving Rubric...' : 'Save Scores'}
                    </button>
                  </div>

                  {scoreFeedback && (
                    <div className="p-3 bg-brand-green-tint border border-brand-green text-brand-green-dark rounded-xl text-xs font-semibold">
                      {scoreFeedback}
                    </div>
                  )}

                  {/* 10 Active Bilingual Questions */}
                  <div className="space-y-4">
                    {activeQuestionsList.map((q, idx) => {
                      const currentVal = applicantScores[q.id] !== undefined ? applicantScores[q.id] : '';

                      return (
                        <div
                          key={q.id}
                          className="p-4 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 transition-colors space-y-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="w-6 h-6 rounded-full bg-brand-green-tint text-brand-green-dark font-bold font-display text-xs flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <h5 className="font-bold text-neutral-900 text-sm leading-snug">
                                {q.question_en}
                              </h5>
                              {q.question_ta && (
                                <p className="text-xs text-brand-green-dark mt-1 font-medium font-display">
                                  {q.question_ta}
                                </p>
                              )}
                              {q.hint && (
                                <p className="text-[11px] text-neutral-500 mt-1.5 bg-neutral-50 p-2 rounded-lg border border-neutral-100 whitespace-pre-line flex items-start gap-1.5">
                                  <svg className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span><strong>Evaluator Hint:</strong> {q.hint}</span>
                                </p>
                              )}
                            </div>

                            {/* Strict 0 / 0.5 / 1 Marks Radio Pills */}
                            <div className="flex items-center gap-1.5 shrink-0 bg-neutral-100 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 0)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentVal === 0
                                    ? 'bg-rose-600 text-white shadow-sm'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                0.0 (Poor)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 0.5)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentVal === 0.5
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                0.5 (Average)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleScoreChange(q.id, 1)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentVal === 1
                                    ? 'bg-brand-green text-white shadow-sm'
                                    : 'text-neutral-600 hover:text-neutral-900'
                                }`}
                              >
                                1.0 (Excellent)
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CANDIDATE DOSSIER DETAILS */}
              {modalTab === 'dossier' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Username</div>
                      <div className="font-bold text-neutral-900 font-mono mt-0.5">{selectedApplicant.username}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">District & Taluk</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.district_name || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Assembly Constituency</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.assembly_constituency || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Requested Wing</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.wing_to_join || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Preferred Role</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.preferred_designation || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Mode of Work</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.mode_of_work || 'Not provided'}</div>
                    </div>
                  </div>

                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="text-neutral-500 text-[10px] uppercase font-bold mb-1">Prior Social & Field Work Experience</div>
                    <FieldWorkList record={selectedApplicant} />
                  </div>
                </div>
              )}

              {/* TAB 3: AADHAAR PASSKEY REVEAL (MASTER ADMIN ONLY) */}
              {modalTab === 'aadhaar' && (
                <div className="space-y-4 max-w-lg mx-auto py-6">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span>Restricted Master Admin Security Audit</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Decryption of 12-digit Aadhaar writes a permanent tamper-evident timestamp to <code className="bg-amber-100 px-1 rounded">audit_log</code>.
                    </p>
                  </div>

                  {revealedAadhaar ? (
                    <div className="p-5 rounded-2xl bg-brand-green-tint border border-brand-green text-center space-y-2">
                      <div className="text-xs text-brand-green-dark font-bold uppercase tracking-wider font-display">
                        Decrypted Aadhaar Number
                      </div>
                      <div className="text-3xl font-mono font-black text-brand-green-dark tracking-widest">
                        {revealedAadhaar.replace(/(\d{4})/g, '$1 ').trim()}
                      </div>
                      <p className="text-[10px] text-brand-green">
                        Verified matching candidate records. This view session is actively logged.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleRevealAadhaar} className="space-y-3">
                      {aadhaarError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                          {aadhaarError}
                        </div>
                      )}
                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Master Admin Passkey
                        </label>
                        <input
                          type="password"
                          required
                          placeholder="Enter Master Security Key"
                          value={masterPasskey}
                          onChange={(e) => setMasterPasskey(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-green font-mono"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={revealingAadhaar}
                        className="w-full py-2.5 rounded-xl bg-brand-green-dark hover:bg-neutral-900 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        {revealingAadhaar ? 'Decrypting Secure Key...' : 'Reveal Full 12-Digit Aadhaar'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 4: APPOINTMENT & APPROVAL */}
              {modalTab === 'appointment' && (
                <div className="space-y-5 max-w-xl mx-auto py-4">
                  {approvalSuccess ? (
                    <div className="p-6 rounded-2xl bg-brand-green-tint border border-brand-green text-center space-y-3">
                      <div className="w-12 h-12 bg-white text-brand-green rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-bold text-brand-green-dark font-display">
                        Official TNV Leader Verified!
                      </h4>
                      <p className="text-xs text-brand-green-dark">{approvalSuccess}</p>
                      <button
                        type="button"
                        onClick={handleCloseEvaluation}
                        className="px-6 py-2 rounded-xl bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold"
                      >
                        Return to Queue
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApproveApplicant} className="space-y-4">
                      {approvalError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                          {approvalError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-neutral-800 mb-1">
                            Assigned Wing *
                          </label>
                          <select
                            value={assignedWing}
                            onChange={(e) => setAssignedWing(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green font-semibold"
                          >
                            {WINGS.map(w => (
                              <option key={w} value={w}>{w}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-neutral-800 mb-1">
                            Designated Leadership Role *
                          </label>
                          <select
                            value={assignedRole}
                            onChange={(e) => setAssignedRole(e.target.value)}
                            className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green font-semibold"
                          >
                            <option value="District Coordinator">District Coordinator</option>
                            <option value="Taluk Lead">Taluk Lead</option>
                            <option value="Wing Secretary">Wing Secretary</option>
                            <option value="State Executive">State Executive</option>
                            <option value="Active Field Volunteer">Active Field Volunteer</option>
                            <option value="volunteer">General Volunteer</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-neutral-800 mb-1">
                          Appointment Remarks & Executive Note
                        </label>
                        <textarea
                          rows="3"
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                          className="w-full p-3 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-green"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={approving}
                        className="w-full py-3 rounded-xl bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 font-display"
                      >
                        {approving ? (
                          <span>Issuing TNV Member ID...</span>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span>Approve & Generate TNV ID</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 7. ADD NEW QUESTION MODAL                           */}
      {/* ==================================================== */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-brand-green-tint/80 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-8">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-brand-green-dark text-white flex items-center justify-between border-b border-brand-green">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-brand-yellow text-neutral-900 flex items-center justify-center font-black text-lg font-display shadow-sm">
                  +
                </span>
                <div>
                  <h3 className="font-extrabold text-lg font-display tracking-tight">Add Question to Question Bank</h3>
                  <p className="text-xs text-brand-green-tint/80 mt-0.5">
                    Craft a bilingual candidate screening question. New questions are saved to the bank and can be chosen for scorecards.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddQuestionModal(false)}
                className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateNewQuestion} className="p-6 sm:p-8 space-y-6">
              {/* Bilingual Inputs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* English Question */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">
                      Question in English *
                    </label>
                    <span className="text-[11px] text-neutral-400">Primary</span>
                  </div>
                  <textarea
                    required
                    rows="4"
                    value={newQuestionEn}
                    onChange={(e) => setNewQuestionEn(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-neutral-300 text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green leading-relaxed transition-all"
                  />
                  <p className="text-[11px] text-neutral-400">Clear and concise phrasing for telephone interviewers.</p>
                </div>

                {/* Tamil Question */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-brand-green-dark uppercase tracking-wider font-display">
                      கேள்வி (தமிழ்) *
                    </label>
                    <span className="text-[11px] text-brand-green font-semibold">Bilingual Rubric</span>
                  </div>
                  <textarea
                    rows="4"
                    value={newQuestionTa}
                    onChange={(e) => setNewQuestionTa(e.target.value)}
                    className="w-full p-3.5 rounded-2xl border border-neutral-300 text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green leading-relaxed font-display transition-all"
                  />
                  <p className="text-[11px] text-neutral-400 font-display">தமிழ் தன்னார்வலர்களுக்கான துல்லியமான கேள்வி விளக்கம்.</p>
                </div>
              </div>

              {/* Evaluator Hint / Rubric Guidelines */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">
                    Evaluator Scoring Rubric Hint / Guide (Optional)
                  </label>
                  <span className="text-[11px] text-neutral-400">Shown during evaluation</span>
                </div>
                <textarea
                  rows="3"
                  value={newQuestionHint}
                  onChange={(e) => setNewQuestionHint(e.target.value)}
                  className="w-full p-3.5 rounded-2xl border border-neutral-300 text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green leading-relaxed transition-all"
                />
              </div>

              {/* Live Preview Box */}
              {(newQuestionEn || newQuestionTa) && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-brand-green-tint">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-2 font-display">
                    Card Preview in Question Bank
                  </span>
                  <div className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded bg-neutral-100 text-neutral-800">
                        Q{questions.length + 1}
                      </span>
                      <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                        Inactive (New)
                      </span>
                    </div>
                    {newQuestionEn && <p className="text-sm font-bold text-neutral-900">{newQuestionEn}</p>}
                    {newQuestionTa && <p className="text-sm font-semibold text-brand-green-dark font-display">{newQuestionTa}</p>}
                    {newQuestionHint && (
                      <div className="bg-brand-green-tint/40 border border-brand-green-tint rounded-lg p-2 text-xs text-neutral-700 italic">
                        <span className="font-bold not-italic text-brand-green-dark">Evaluator Hint: </span>
                        {newQuestionHint}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-5 py-2.5 text-xs font-bold text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newQuestionEn.trim()}
                  className="px-6 py-2.5 text-xs font-extrabold text-neutral-900 bg-brand-yellow hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save to Question Bank</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
