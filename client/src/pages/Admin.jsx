import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  approveApplicant
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

export default function Admin() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(() => getCurrentUser());
  const [activeNav, setActiveNav] = useState('dashboard'); // 'dashboard' | 'queue' | 'calls' | 'questions' | 'approved'
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
        setApplicants(rawApplicants);

        // Extract call logs if provided or synthesize recent call logs
        const aggregatedCalls = [];
        rawApplicants.forEach(app => {
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
    const totalMembershipFees = paidApplicants * 365;
    const scoredCount = list.filter(a => a && (a.interview_scored || (a.total_score !== undefined && a.total_score !== null))).length;
    const attendedCount = list.filter(a => a && (a.call_status === 'Attending' || a.call_status === 'attended')).length;
    const postponedCount = list.filter(a => a && (a.call_status === 'Postponed' || a.call_status === 'postponed' || a.call_status === 'scheduled')).length;
    const noAnswerCount = list.filter(a => a && (a.call_status === 'No Answer' || a.call_status === 'no_answer')).length;
    const declinedCount = list.filter(a => a && (a.call_status === 'Not Attending' || a.call_status === 'declined')).length;

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
      activeWingsCount: 4,
      totalDistrictsCount: 38
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
      applicant => applicant && applicant.status === 'pending'
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


  // Filtered Queue List
  const filteredApplicants = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    return list.filter(app => {
      if (!app) return false;
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
  }, [applicants, searchQuery, filterDistrict, filterStatus, filterWing, filterCallStatus]);

  // Time-aware greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

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
                onClick={() => { setActiveNav('dashboard'); setSidebarOpen(false); }}
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

          {/* MEMBERS SECTION */}
          <div>
            <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
              Applicants & Calls
            </div>
            <div className="space-y-1">
              {/* Applicant Queue */}
              <button
                type="button"
                onClick={() => { setActiveNav('queue'); setFilterStatus(''); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeNav === 'queue'
                    ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Applicant Review Queue</span>
                </div>
                {metrics.pendingReview > 0 && (
                  <span className="text-[10px] bg-brand-yellow text-neutral-900 px-2 py-0.5 rounded-full font-extrabold">
                    {metrics.pendingReview}
                  </span>
                )}
              </button>

              {/* Dedicated Call Operations Desk */}
              <button
                type="button"
                onClick={() => { setActiveNav('calls'); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeNav === 'calls'
                    ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Call Log Operations</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeNav === 'calls' ? 'bg-brand-yellow text-neutral-900' : 'bg-emerald-500/20 text-emerald-200'}`}>
                  {metrics.totalCalls}
                </span>
              </button>

              {/* Approved Members */}
              <button
                type="button"
                onClick={() => { setActiveNav('approved'); setFilterStatus('approved'); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeNav === 'approved'
                    ? 'bg-brand-green text-white shadow-md ring-1 ring-brand-yellow/30 font-bold'
                    : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Approved Leaders</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${activeNav === 'approved' ? 'bg-brand-yellow text-neutral-900' : 'bg-emerald-500/20 text-emerald-200'}`}>
                  {metrics.approvedCount}
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
                onClick={() => { setActiveNav('questions'); setSidebarOpen(false); }}
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
                  {activeNav === 'dashboard' ? 'Overview' : activeNav.replace('-', ' ')}
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

          {/* ==================================================== */}
          {/* 3. 10-METRIC EXECUTIVE KPI GRID                      */}
          {/* (TNV Civic Palette with Distinct Status Borders)     */}
          {/* ==================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {/* 1. Total Members */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-green shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-green-tint text-brand-green flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full">
                  +{metrics.totalApplicants} Total
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.totalApplicants}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Total Members</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Statewide volunteer pool</div>
            </div>

            {/* 2. Membership Fees Collected */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-yellow shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-yellow-tint text-amber-800 flex items-center justify-center font-bold font-display text-lg">
                  ₹
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-brand-yellow-tint px-2 py-0.5 rounded-full">
                  ₹365/member
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                ₹{metrics.totalMembershipFees.toLocaleString('en-IN')}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Membership Fees</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">{metrics.paidApplicants} verified paid</div>
            </div>

            {/* 3. Pending Review Queue */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-amber-500 shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  Action Needed
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.pendingReview}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Pending Review</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Awaiting interview & score</div>
            </div>

            {/* 4. Confirmed Attendance */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-green shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-green-tint text-brand-green flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full">
                  Attending
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.attendedCount}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Attending Candidates</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Confirmed screening attendance</div>
            </div>

            {/* 5. Active Wings */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-green-dark shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-green-tint text-brand-green-dark flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-brand-green-dark bg-brand-green-tint px-2 py-0.5 rounded-full">
                  4 Wings
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.activeWingsCount}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Active Wings</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Youth, Women, Students, Social</div>
            </div>

            {/* 6. Total Call Attempts Logged */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-emerald-600 shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Live Logged
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.totalCalls}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Call Attempts</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Tele-interview screenings</div>
            </div>

            {/* 7. Interviews Scored */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-green shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-green-tint text-brand-green flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-full">
                  10 Questions
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.scoredCount}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Interviews Scored</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">0 / 0.5 / 1 point rubric</div>
            </div>

            {/* 8. Approved State Leaders */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-yellow shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-yellow-tint text-amber-800 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-amber-900 bg-brand-yellow-tint px-2 py-0.5 rounded-full">
                  TNV Issued
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                {metrics.approvedCount}
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Approved Leaders</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">ID card & letter enabled</div>
            </div>

            {/* 9. Public Donations */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-emerald-500 shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Crowdfund
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                ₹6,012
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Public Donations</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">80G certified contributions</div>
            </div>

            {/* 10. District Coverage */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border-t-4 border-brand-green-dark shadow-sm border border-brand-green-tint/80 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-brand-green-tint text-brand-green-dark flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold text-brand-green-dark bg-brand-green-tint px-2 py-0.5 rounded-full">
                  100% State
                </span>
              </div>
              <div className="text-2xl font-black text-neutral-ink font-display">
                38 / 38
              </div>
              <div className="text-xs font-bold text-neutral-700 mt-0.5">Districts Active</div>
              <div className="text-[11px] text-neutral-muted mt-1 truncate">Tamil Nadu statewide reach</div>
            </div>
          </div>


                    {/* NEW: Dashboard Date Filter */}
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
          ) : (
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
                  <div className="px-5 py-4 border-b border-brand-green-tint/80 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-brand-green-dark text-sm font-display">
                        {activeNav === 'approved' ? 'Verified Leaders Dossiers' : 'Applicant Dossiers & Call Operations'} ({filteredApplicants.length})
                      </h3>
                      <p className="text-xs text-neutral-muted">
                        Telephone screening, Aadhaar audit, 10-point evaluation, and role appointment
                      </p>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 bg-brand-green-tint text-brand-green-dark rounded-lg border border-brand-green/30">
                      Phase 1 Pipeline
                    </span>
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
                    <h4 className="text-sm font-bold text-neutral-800">No applicants found matching criteria</h4>
                    <p className="text-xs text-neutral-500 mt-1">Try resetting search filters or register a new volunteer.</p>
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
                                {isApproved ? (
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
                      10 Questions Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-neutral-100">
                    <span className="text-neutral-600">Row-Level Security (RLS)</span>
                    <span className="font-bold text-brand-green">Enforced</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-neutral-600">District Quotas</span>
                    <span className="font-bold text-neutral-800">38 Districts Open</span>
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
