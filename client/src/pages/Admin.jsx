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
  setMemberBlocked,
  getCollabApplications,
  decideCollabApplication,
  getMyAdminAccess
} from '../lib/adminService.js';
import { api } from '../lib/api.js';
import { getToken } from '../lib/session.js';
import { getCurrentUser, logout } from '../lib/authService.js';
import REGISTRATION from '../data/registrationOptions.json';
import { CHENNAI_ZONES, zoneLabel } from '../data/chennaiZones.js';
import BirthdayWishes from '../components/admin/BirthdayWishes.jsx';
import SendMessage from '../components/admin/SendMessage.jsx';
import EmailStatus from '../components/admin/EmailStatus.jsx';
import AdminAccess from '../components/admin/AdminAccess.jsx';
import ProgrammeMembers from '../components/admin/ProgrammeMembers.jsx';
import { portfolioPath } from '../lib/portfolio.js';
import Spinner from '../components/Spinner.jsx';
import FieldWorkList from '../components/FieldWorkList.jsx';
import EventManager from '../components/admin/EventManager.jsx';
import TaskManager from '../components/admin/TaskManager.jsx';
import CertificateManager from '../components/CertificateManager.jsx';
import AdminCrowdfunding from '../components/admin/AdminCrowdfunding.jsx';
import AdminBeneficiaries from '../components/admin/AdminBeneficiaries.jsx';
import AdminCoordinatorDonations from '../components/admin/AdminCoordinatorDonations.jsx';
import AdminInKindDonations from '../components/admin/AdminInKindDonations.jsx';
import AdminAutoPay from '../components/admin/AdminAutoPay.jsx';


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
  visitorDonations: 'Visitor Donations & Public Giving',
  donationReceipts: '80G Donation Receipts',
  'members-pending': 'Pending Approval',
  'members-active': 'Active Members',
  'members-all': 'All Members',
  'members-blocked': 'Blocked Members',
  'members-ngo': 'Organisation Members',
  calls: 'Call Log Operations',
  payments: 'Payment Tracking',
  programmes: '₹365 Members: Food & Tree Planting',
  'collab-pending': 'Collaboration Partners: Pending',
  'collab-approved': 'Collaboration Partners: Approved',
  'collab-rejected': 'Collaboration Partners: Rejected',
  birthdays: 'Birthday Wishes',
  'messages-compose': 'Send Message',
  'messages-notices': 'Previous Notices',
  access: 'Admin Access',
  questions: 'Question Bank',
  events: 'Event Management',
  'events-all': 'Event Management: All Events',
  'events-published': 'Events: Published',
  'events-ongoing': 'Events: Ongoing',
  'events-draft': 'Events: Drafts',
  'events-completed': 'Events: Completed',
  'events-cancelled': 'Events: Cancelled',
  tasks: 'Task Coordination Roster',
  'tasks-all': 'Tasks: All Tasks',
  'tasks-todo': 'Tasks: To Do',
  'tasks-inprogress': 'Tasks: In Progress',
  'tasks-completed': 'Tasks: Completed',
  certificates: 'Certificate Management',
  'certificates-issue': 'Issue Certificate',
  'certificates-active': 'Active Certificates',
  crowdfunding: 'Crowdfunding & Causes Management',
  beneficiaries: 'Beneficiaries & Aid Distribution Register',
  coordinatorDonations: 'Coordinator Field Collections',
  otherDonations: 'In-Kind & Material Donations Registry',
  autoPay: 'Auto-Pay & Recurring Pledges Console'
};

// Member features from the reference dashboard that are not built yet: their menu
// entries open an honest "not set up yet" page instead of showing made-up data
const SOON_FEATURES = {
  // Members
  donations: { title: 'Member Donations', icon: 'rupee', text: 'Record donations from members, issue receipts and see which payments succeeded.' },
  designations: { title: 'Designations', icon: 'designation', text: 'Manage the list of designations, such as District Coordinator, and mark them active or inactive.' },
  // Operations
  visitorCertificates: { title: 'Visitor Certificate Management', icon: 'idcard', text: 'Issue participation certificates to visitors and event attendees.' },
  news: { title: 'News Management', icon: 'news', text: 'Publish news and announcements on the website.' },
  activities: { title: 'Activity Management', icon: 'photo', text: 'Post field activities with photos to the website.' },
  videos: { title: 'Video Management', icon: 'video', text: 'Add videos to the website gallery.' },
  complaints: { title: 'Complaints Management', icon: 'chat', text: 'Receive complaints from the public and track them until they are resolved.' },

  internships: { title: 'Internship Management', icon: 'academic', text: 'Take internship applications and issue internship certificates.' },
  expenses: { title: 'Expense Management', icon: 'cash', text: 'Record spending and see totals by month and category.' },
  jobs: { title: 'Job Management', icon: 'briefcase', text: 'Post job openings and collect applications.' },
  enquiries: { title: 'Enquiry Management', icon: 'mail', text: 'Collect enquiries from the website contact form and reply to them.' },
  projects: { title: 'Project Management', icon: 'project', text: 'Track projects, their tasks and progress.' },
  // System
  qrGenerator: { title: 'Website QR Generator', icon: 'qr', text: 'Make QR codes that link to pages of the website.' },
  managementBody: { title: 'Management Body', icon: 'users', text: 'List the trustees and office bearers shown on the website.' },
  coordinators: { title: 'Coordinator Management', icon: 'user', text: 'Manage district and wing coordinators and their logins.' },
  letterHead: { title: 'Letter Head', icon: 'document', text: 'Create letters on the TNV letter head.' },
  settings: { title: 'Setting', icon: 'cog', text: 'Organisation details, logo, payment and message settings.' },
  emailStatus: { title: 'Email Status', icon: 'mail', text: 'See every email the portal sends and whether it was delivered.' },
  content: { title: 'TNV Content & Social Media', icon: 'news', text: 'Edit the About, programmes, leadership, events and social media links shown on the website and in volunteer dashboards.' },
  softwareUpdate: { title: 'Software Update', icon: 'refresh', text: 'See what changed in each new version of the portal.' }
};

// The sidebar drop-down a view belongs to, so it opens when that view is shown
const menuForNav = (nav) => {
  if (nav.startsWith('members-')) return 'members';
  if (nav.startsWith('soon-')) return nav.split('-')[1];
  if (nav === 'birthdays') return 'birthdays';
  if (nav.startsWith('messages-')) return 'messages';
  if (nav === 'payments' || nav === 'programmes') return 'payments';
  if (nav.startsWith('collab-') || nav === 'members-ngo') return 'collab';
  if (nav.startsWith('events-') || nav === 'events') return 'events';
  if (nav.startsWith('tasks-') || nav === 'tasks') return 'tasks';
  return null;
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
  certificate: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  send: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8',
  designation: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  heart: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  receipt: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  bolt: 'M13 10V3L4 14h7v7l9-11h-7z',
  idcard: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2',
  news: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
  photo: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  academic: 'M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z',
  cash: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  briefcase: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  project: 'M8 7h8M8 7a2 2 0 11-4 0 2 2 0 014 0zm8 0a2 2 0 104 0 2 2 0 00-4 0zm-4 4v6m0 0a2 2 0 100 4 2 2 0 000-4z',
  qr: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  card: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  cog: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z',
  refresh: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  question: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
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
  const [activeNav, setActiveNav] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('nav') || params.get('tab') || location.state?.nav || 'dashboard';
  }); // see NAV_LABELS
  const [memberNotice, setMemberNotice] = useState(() =>
    location.state?.memberAdded ? `${location.state.memberAdded} was added and is waiting under Pending Approval.` : ''
  );

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetNav = params.get('nav') || params.get('tab') || location.state?.nav;
    if (targetNav && targetNav !== activeNav) {
      setActiveNav(targetNav);
    }
  }, [location.search, location.state]);
  const [blockingId, setBlockingId] = useState(null);
  const [birthdayTab, setBirthdayTab] = useState('today'); // 'today' | 'upcoming'
  const [paymentFilter, setPaymentFilter] = useState('all'); // 'all' | 'unpaid' | 'pending' | 'paid'
  const [collab, setCollab] = useState({ status: 'loading', items: [] }); // status: 'loading' | 'ok' | 'unavailable'
  const [collabRemarks, setCollabRemarks] = useState({});
  const [collabBusy, setCollabBusy] = useState(null);
  const [questionSet, setQuestionSet] = useState('volunteer'); // 'volunteer' | 'collaboration'
  const [openMenus, setOpenMenus] = useState({ members: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Main Data States
  const [applicants, setApplicants] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionIds, setActiveQuestionIds] = useState(new Set());
  const [allRecentCallLogs, setAllRecentCallLogs] = useState([]);
  const [viewingProofApplicant, setViewingProofApplicant] = useState(null);
  const [verifyingPaymentId, setVerifyingPaymentId] = useState(null);

  // Donations & 80G Receipts State
  const [donationsList, setDonationsList] = useState([]);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationSearchQuery, setDonationSearchQuery] = useState('');
  const [donationTab, setDonationTab] = useState('all'); // 'all' | 'pending' | 'verified' | 'pan'
  const [viewingDonationProof, setViewingDonationProof] = useState(null);
  const [verifyingDonationId, setVerifyingDonationId] = useState(null);
  const [showManualDonationModal, setShowManualDonationModal] = useState(false);
  const [manualDonationSubmitting, setManualDonationSubmitting] = useState(false);
  const [manualDonationForm, setManualDonationForm] = useState({
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    pan: '',
    amount: '',
    payment_channel: 'Direct Bank Transfer (HDFC)',
    utr: '',
    category: 'Civic Action & Community Relief'
  });

  const fetchDonations = async () => {
    try {
      setDonationsLoading(true);
      const res = await fetch('/api/donations');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.donations)) {
        setDonationsList(data.donations);
      }
    } catch (_e) {
    } finally {
      setDonationsLoading(false);
    }
  };

  const handleCreateManualDonation = async (e) => {
    e.preventDefault();
    if (!manualDonationForm.donor_name.trim() || !manualDonationForm.donor_phone.trim() || !manualDonationForm.amount) {
      alert('Donor name, phone number, and donation amount are required.');
      return;
    }
    setManualDonationSubmitting(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualDonationForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setShowManualDonationModal(false);
        setManualDonationForm({
          donor_name: '',
          donor_phone: '',
          donor_email: '',
          pan: '',
          amount: '',
          payment_channel: 'Direct Bank Transfer (HDFC)',
          utr: '',
          category: 'Civic Action & Community Relief'
        });
        await fetchDonations();
        if (data.receipt_no) {
          window.open(`/api/receipts/${data.receipt_no}.pdf`, '_blank');
        }
      } else {
        alert(data.error || 'Failed to record donation.');
      }
    } catch (err) {
      alert('Error recording donation: ' + err.message);
    } finally {
      setManualDonationSubmitting(false);
    }
  };

  const handleVerifyDonation = async (donationId, receiptNo, action = 'verify') => {
    setVerifyingDonationId(donationId);
    try {
      const res = await api('/api/admin/verify-donation', {
        method: 'POST',
        token: getToken(),
        body: { donation_id: donationId, receipt_no: receiptNo, action }
      });
      if (res.ok) {
        setDonationsList(prev => prev.map(d => {
          if (d.id === donationId || d.receipt_no === receiptNo) {
            return { ...d, status: action === 'verify' ? 'verified' : 'flagged' };
          }
          return d;
        }));
        if (viewingDonationProof && (viewingDonationProof.id === donationId || viewingDonationProof.receipt_no === receiptNo)) {
          setViewingDonationProof(prev => ({ ...prev, status: action === 'verify' ? 'verified' : 'flagged' }));
        }
      } else {
        alert(res.data?.error || 'Verification failed.');
      }
    } catch (err) {
      alert('Error verifying donation: ' + err.message);
    } finally {
      setVerifyingDonationId(null);
    }
  };

  const exportDonationsCSV = () => {
    if (!donationsList.length) {
      alert('No donations to export.');
      return;
    }
    const headers = ['Receipt No', 'Date', 'Donor Name', 'Phone', 'Email', 'PAN (80G)', 'Amount (INR)', 'Category / Tier', 'Payment Channel', 'UTR Reference', 'Status'];
    const rows = donationsList.map(d => [
      `"${d.receipt_no || ''}"`,
      `"${new Date(d.created_at || Date.now()).toLocaleDateString('en-IN')}"`,
      `"${(d.donor_name || 'Anonymous').replace(/"/g, '""')}"`,
      `"${d.donor_phone || ''}"`,
      `"${d.donor_email || ''}"`,
      `"${d.pan || d.pan_number || ''}"`,
      d.amount || 0,
      `"${(d.tier_label || 'Civic Contribution').replace(/"/g, '""')}"`,
      `"${(d.payment_channel || 'UPI').replace(/"/g, '""')}"`,
      `"${d.utr || ''}"`,
      `"${d.status || 'pending'}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TNV_Visitor_Donations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAdminVerifyPayment = async (applicantId, action = 'approve') => {
    setVerifyingPaymentId(applicantId);
    try {
      const res = await api('/api/admin/verify-payment', {
        method: 'POST',
        token: getToken(),
        body: { applicant_id: applicantId, action }
      });
      if (res.ok && res.data) {
        setApplicants(prev => prev.map(a => {
          if (a.id === applicantId) {
            return {
              ...a,
              membership_paid: action === 'approve',
              payment_status: action === 'approve' ? 'paid' : 'unpaid',
              receipt_no: res.data.receipt_no || a.receipt_no,
              membership_paid_at: action === 'approve' ? new Date().toISOString() : null,
              payment_screenshot: action === 'approve' ? a.payment_screenshot : null
            };
          }
          return a;
        }));
        if (viewingProofApplicant?.id === applicantId) {
          setViewingProofApplicant(null);
        }
      } else {
        alert(res.data?.error || 'Failed to update payment status');
      }
    } catch (err) {
      alert('Error updating payment: ' + err.message);
    } finally {
      setVerifyingPaymentId(null);
    }
  };

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
  const [filterConstituency, setFilterConstituency] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterFee, setFilterFee] = useState(''); // '' | 'unpaid' | 'proof' | 'paid'
  const [filterGender, setFilterGender] = useState('');
  const [filterBlood, setFilterBlood] = useState('');
  const [filterAffiliation, setFilterAffiliation] = useState('');
  const [filterNgo, setFilterNgo] = useState(''); // organisation id, or '__none'
  const [filterZone, setFilterZone] = useState('');
  const [filterProgramme, setFilterProgramme] = useState(''); // '' | 'food' | 'tree' | 'none'
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);
  // Sections and districts this admin may use (the Master Admin sees everything)
  const [myAccess, setMyAccess] = useState({ master: true, modules: null, districts: [] });

  // ----------------------------------------------------
  // CALL LOG MODEL STATE (Dedicated Modal & Actions)
  // ----------------------------------------------------
  const [callModalApplicant, setCallModalApplicant] = useState(null);
  const [callModalLogs, setCallModalLogs] = useState([]);
  const [callModalLoadingLogs, setCallModalLoadingLogs] = useState(false);
  const [callStatus, setCallStatus] = useState('Attending'); // 'Attending' | 'Not Attending' | 'Postponed' | 'No Answer'
  const [callNotes, setCallNotes] = useState('');
  const [callFollowUp, setCallFollowUp] = useState(''); // datetime-local, for Postponed / No Answer
  const [submittingCall, setSubmittingCall] = useState(false);
  const [callSuccessMessage, setCallSuccessMessage] = useState('');
  const [callErrorMessage, setCallErrorMessage] = useState('');

  // ----------------------------------------------------
  // DOSSIER & 10-QUESTION INTERVIEW SCORING MODAL
  // ----------------------------------------------------
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [modalTab, setModalTab] = useState('evaluation'); // 'evaluation' | 'dossier' | 'aadhaar' | 'appointment'
  const [applicantScores, setApplicantScores] = useState({});
  const [applicantNotes, setApplicantNotes] = useState({}); // question id -> answer summary and remarks
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

  const loadCollab = async () => {
    const res = await getCollabApplications();
    if (res.ok && res.data) {
      const items = Array.isArray(res.data.applications) ? res.data.applications : Array.isArray(res.data) ? res.data : [];
      setCollab({ status: 'ok', items });
    } else {
      setCollab({ status: 'unavailable', items: [] });
    }
  };

  const handleCollabDecision = async (app, decision) => {
    const remarks = (collabRemarks[app.id] || '').trim();
    if (decision === 'rejected' && !remarks) {
      alert('Add a remark explaining why the application is rejected.');
      return;
    }
    setCollabBusy(app.id);
    const res = await decideCollabApplication({ id: app.id, decision, remarks });
    setCollabBusy(null);
    if (!res.ok) {
      alert(res.data?.error || 'Could not save the decision. Please try again.');
      return;
    }
    setCollab(c => ({ ...c, items: c.items.map(x => (x.id === app.id ? { ...x, status: decision, remarks } : x)) }));
  };

  const loadMyAccess = async () => {
    const res = await getMyAdminAccess();
    if (res.ok && res.data) {
      setMyAccess({ master: Boolean(res.data.master), modules: res.data.modules || null, districts: res.data.districts || [] });
    }
  };

  const loadPortalData = async () => {
    setLoading(true);
    loadCollab();
    loadMyAccess();
    fetchDonations();
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
      const needsFollowUp = callStatus === 'Postponed' || callStatus === 'No Answer';
      const res = await logCall({
        profile_id: callModalApplicant.id,
        status: callStatus,
        notes: callNotes.trim(),
        callback_at: needsFollowUp && callFollowUp ? new Date(callFollowUp).toISOString() : undefined
      });

      if (res.ok) {
        setCallSuccessMessage(`Call successfully logged as: ${callStatus}`);
        setCallNotes('');
        setCallFollowUp('');

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
        const loadedNotes = {};
        const scoreArr = sRes.data.scores || [];
        scoreArr.forEach(s => {
          loaded[s.question_id] = s.score;
          if (s.note) loadedNotes[s.question_id] = s.note;
        });
        setApplicantScores(loaded);
        setApplicantNotes(loadedNotes);
      } else {
        setApplicantScores({});
        setApplicantNotes({});
      }
    } catch (_err) {
      setApplicantScores({});
      setApplicantNotes({});
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
        notes: applicantNotes,
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
  // Admins have an ID card and appointment letter once their own profile is approved
  const myDocumentId = adminUser?.profile?.status === 'approved' ? (adminUser.profile.id || adminUser.profile.username) : null;

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

  // The organisation whose members are shown under Collaboration Partners
  const [ngoView, setNgoView] = useState(null); // { id, name }

  const openNav = (nav) => {
    setActiveNav(nav);
    const menu = menuForNav(nav);
    if (menu) setOpenMenus(m => ({ ...m, [menu]: true }));
    setFilterStatus('');
    setPage(1);
    setSidebarOpen(false);
  };

  const openNgoMembers = (org) => {
    setNgoView({ id: org.id, name: org.organisation_name });
    openNav('members-ngo');
  };

  const clearMemberFilters = () => {
    setSearchQuery('');
    setFilterDistrict('');
    setFilterStatus('');
    setFilterWing('');
    setFilterCallStatus('');
    setFilterConstituency('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterFee('');
    setFilterGender('');
    setFilterBlood('');
    setFilterAffiliation('');
    setFilterNgo('');
    setFilterZone('');
    setFilterProgramme('');
  };

  const activeFilterCount = [
    filterDistrict, filterConstituency, filterStatus, filterFee, filterWing, filterCallStatus, filterDateFrom, filterDateTo,
    filterGender, filterBlood, filterAffiliation, filterNgo, filterZone, filterProgramme
  ].filter(Boolean).length;

  // Constituencies of the chosen district, or of all districts
  const constituencyOptions = useMemo(() => {
    const byDistrict = REGISTRATION.options.constituencies_by_district || {};
    if (filterDistrict) {
      const d = REGISTRATION.districts.find(x => x.name === filterDistrict);
      return d ? [...(byDistrict[d.id] || [])].sort() : [];
    }
    return Array.from(new Set(Object.values(byDistrict).flat())).sort();
  }, [filterDistrict]);

  // Call logs belong to screening: shown on Pending Approval and Call Log Operations only
  const showCallColumns = activeNav === 'members-pending' || activeNav === 'calls';

  // Filtered Queue List (the member views narrow it first)
  const filteredApplicants = useMemo(() => {
    const list = Array.isArray(applicants) ? applicants : [];
    const from = filterDateFrom ? new Date(`${filterDateFrom}T00:00:00`).getTime() : null;
    const to = filterDateTo ? new Date(`${filterDateTo}T23:59:59.999`).getTime() : null;
    return list.filter(app => {
      if (!app) return false;
      if (activeNav === 'members-pending' && (app.status === 'approved' || app.blocked)) return false;
      if (activeNav === 'members-active' && (app.status !== 'approved' || app.blocked)) return false;
      if (activeNav === 'members-blocked' && !app.blocked) return false;
      if (activeNav === 'members-ngo' && (!ngoView || app.ngo_id !== ngoView.id)) return false;
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fields = [app.full_name, app.username, app.phone, app.email, app.tnv_id, app.ngo_name, app.organization_name];
        if (!fields.some(v => String(v || '').toLowerCase().includes(q))) return false;
      }
      // District filter
      if (filterDistrict && app.district_name !== filterDistrict) {
        return false;
      }
      if (filterConstituency && app.assembly_constituency !== filterConstituency) return false;
      // Status filter
      if (filterStatus === 'blocked' && !app.blocked) return false;
      if (filterStatus === 'pending' && (app.status === 'approved' || app.blocked)) return false;
      if (filterStatus === 'approved' && (app.status !== 'approved' || app.blocked)) return false;
      // Registration date range
      if (from || to) {
        const t = new Date(app.created_at).getTime();
        if (!Number.isFinite(t) || (from && t < from) || (to && t > to)) return false;
      }
      if (filterFee) {
        const proof = !app.membership_paid && (app.payment_status === 'pending_verification' || Boolean(app.payment_screenshot));
        if (filterFee === 'paid' && !app.membership_paid) return false;
        if (filterFee === 'proof' && !proof) return false;
        if (filterFee === 'unpaid' && (app.membership_paid || proof)) return false;
      }
      if (filterGender && app.gender !== filterGender) return false;
      if (filterBlood && app.blood_group !== filterBlood) return false;
      if (filterAffiliation && (app.affiliation || app.category) !== filterAffiliation) return false;
      if (filterNgo === '__none' && app.ngo_id) return false;
      if (filterNgo && filterNgo !== '__none' && app.ngo_id !== filterNgo) return false;
      if (filterZone && String(app.zone || '') !== filterZone) return false;
      if (filterProgramme === 'none' && app.programme) return false;
      if (filterProgramme && filterProgramme !== 'none' && app.programme !== filterProgramme) return false;
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
  }, [
    applicants, activeNav, ngoView, searchQuery, filterDistrict, filterConstituency, filterStatus, filterWing, filterCallStatus,
    filterDateFrom, filterDateTo, filterFee, filterGender, filterBlood, filterAffiliation, filterNgo, filterZone, filterProgramme
  ]);

  // Back to the first page whenever the list changes shape
  useEffect(() => {
    setPage(1);
  }, [
    activeNav, ngoView, searchQuery, filterDistrict, filterConstituency, filterStatus, filterWing, filterCallStatus,
    filterDateFrom, filterDateTo, filterFee, filterGender, filterBlood, filterAffiliation, filterNgo, filterZone, filterProgramme, pageSize
  ]);

  const pageCount = Math.max(1, Math.ceil(filteredApplicants.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pagedApplicants = filteredApplicants.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Organisations members are linked to, for the Organisation filter
  const ngoOptions = useMemo(() => {
    const map = new Map();
    collab.items.forEach(o => map.set(o.id, o.organisation_name));
    (Array.isArray(applicants) ? applicants : []).forEach(a => {
      if (a && a.ngo_id && !map.has(a.ngo_id)) map.set(a.ngo_id, a.ngo_name || 'Organisation');
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [collab.items, applicants]);

  // Time-aware greeting
  const greetingText = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const statCards = [
    { label: 'Total Members', icon: 'users', value: metrics.totalApplicants, note: 'Everyone who has registered', nav: 'members-all' },
    { label: 'Active Members', icon: 'check', value: metrics.activeMembers, note: 'Approved and not blocked', nav: 'members-active' },
    { label: 'Pending Approval', icon: 'clock', value: metrics.pendingApproval, attention: metrics.pendingApproval > 0 ? 'amber' : null, note: 'Awaiting interview and approval', nav: 'members-pending' },
    { label: 'Blocked Members', icon: 'ban', value: metrics.blockedCount, attention: metrics.blockedCount > 0 ? 'rose' : null, note: 'Cannot sign in', nav: 'members-blocked' },
    { label: 'Membership Fees', icon: 'rupee', value: `₹${metrics.totalMembershipFees.toLocaleString('en-IN')}`, note: `${metrics.paidApplicants} paid at ₹${MEMBERSHIP_FEE}` },
    { label: 'Joined This Month', icon: 'userplus', value: quickStats.joinedThisMonth, note: `${quickStats.joinedToday} today`, nav: 'members-all' },
    { label: 'Call Attempts', icon: 'phone', value: metrics.totalCalls, note: 'Telephone screenings logged', nav: 'calls' },
    { label: 'Interviews Scored', icon: 'clipboard', value: metrics.scoredCount, note: '10-question rubric' },
    { label: 'Districts Covered', icon: 'pin', value: `${districtCoverage.activeDistricts} / ${districtCoverage.totalDistricts}`, note: 'With at least one member' },
    { label: 'Birthdays Today', icon: 'cake', value: birthdays.today.length, attention: birthdays.today.length > 0 ? 'amber' : null, note: `${birthdays.upcoming.length} more in the next 30 days`, nav: 'birthdays' }
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

  const soonKey = activeNav.startsWith('soon-') ? activeNav.split('-')[1] : null;
  const navLabel = activeNav === 'members-ngo' && ngoView
    ? `Members of ${ngoView.name}`
    : NAV_LABELS[activeNav] || SOON_FEATURES[soonKey]?.title || 'Overview';

  // A menu either drops down to its sub-pages (items) or opens one view directly (nav).
  // Features that are not built yet come from SOON_FEATURES and open the "Not set up yet" page.
  const soonMenu = (key, items) => ({
    id: key,
    label: SOON_FEATURES[key].title,
    icon: SOON_FEATURES[key].icon,
    ...(items ? { items: items.map(([sub, label]) => ({ id: `soon-${key}-${sub}`, label })) } : { nav: `soon-${key}-home` })
  });

  // Which admin-panel section a menu belongs to. District admins only see the sections
  // the Master Admin gave them; menus without a section are for the Master Admin.
  const canOpen = (module) => myAccess.master || (module && (!myAccess.modules || myAccess.modules.includes(module)));
  const collabCount = (status) => collab.items.filter(a => (a.status || 'pending') === status).length;

  const sidebarSections = [
    {
      title: 'Members',
      menus: [
        {
          id: 'members', module: 'members', label: 'Members Management', icon: 'users', badge: metrics.totalApplicants,
          items: [{ label: 'Add Member', to: '/register?admin=1' }, ...memberNav]
        },
        {
          id: 'collab', module: 'collab', label: 'Collaboration Partners', icon: 'briefcase',
          badge: collabCount('pending') || null,
          items: [
            { id: 'collab-pending', label: 'Pending', count: collabCount('pending') },
            { id: 'collab-approved', label: 'Approved Partners', count: collabCount('approved') },
            { id: 'collab-rejected', label: 'Rejected', count: collabCount('rejected') }
          ]
        },
        {
          id: 'payments', module: 'payments', label: 'Payments & ₹365 Members', icon: 'rupee', badge: `${metrics.paidApplicants}/${metrics.totalApplicants}`,
          items: [
            { id: 'payments', label: 'Payment Tracking' },
            { id: 'programmes', label: 'Food & Tree Planting', count: metrics.paidApplicants }
          ]
        },
        {
          id: 'birthdays', module: 'birthdays', label: 'Birthday Wishes', icon: 'cake', badge: birthdays.today.length + birthdays.upcoming.length,
          items: [
            { id: 'birthdays', tab: 'upcoming', label: 'Upcoming Birthdays', count: birthdays.upcoming.length },
            { id: 'birthdays', tab: 'today', label: 'Today Birthday', count: birthdays.today.length }
          ]
        },
        {
          id: 'messages', module: 'messages', label: 'Send Message', icon: 'send',
          items: [
            { id: 'messages-compose', label: 'New Message' },
            { id: 'messages-notices', label: 'Previous Notices' }
          ]
        },
        {
          id: 'certificates',
          module: 'certificates',
          label: 'Certificate Management',
          icon: 'certificate',
          items: [
            { id: 'certificates-issue', label: 'Issue Certificate' },
            { id: 'certificates-active', label: 'Active Certificates' }
          ]
        },
        { ...soonMenu('donations', [['all', 'All Donations'], ['paid', 'Paid / Success']]), module: 'donations' },
        soonMenu('designations', [['all', 'All Designations'], ['active', 'Active'], ['inactive', 'Inactive']])
      ]
    },
    {
      title: 'Donations',
      menus: [
        { id: 'visitorDonations', label: 'Visitor Donations', icon: 'heart', nav: 'visitorDonations', badge: donationsList.length ? `${donationsList.length}` : undefined },
        { id: 'donationReceipts', label: '80G Tax Receipts', icon: 'receipt', nav: 'donationReceipts', badge: donationsList.length || undefined },
        { id: 'crowdfunding', label: 'Crowdfunding Campaigns', icon: 'bolt', nav: 'crowdfunding' },
        { id: 'beneficiaries', label: 'Beneficiaries Register', icon: 'users', nav: 'beneficiaries' },
        { id: 'coordinatorDonations', label: 'Coordinator Collections', icon: 'heart', nav: 'coordinatorDonations' },
        { id: 'otherDonations', label: 'In-Kind / Material Gifts', icon: 'heart', nav: 'otherDonations' },
        { id: 'autoPay', label: 'Auto-Pay & Pledges', icon: 'card', nav: 'autoPay' }
      ].map(m => ({ ...m, module: 'donations' }))
    },
    {
      title: 'Operations',
      menus: [
        { id: 'calls', module: 'calls', label: 'Call Log Operations', icon: 'phone', nav: 'calls', badge: metrics.totalCalls },
        { id: 'events', module: 'events', label: 'Event Management', icon: 'calendar', nav: 'events' },
        { id: 'tasks', module: 'tasks', label: 'Task Coordination', icon: 'clipboard', nav: 'tasks' },
        ...['visitorCertificates', 'news', 'activities', 'videos', 'complaints', 'internships', 'expenses', 'jobs', 'enquiries', 'projects'].map(k => soonMenu(k))
      ]
    },
    {
      title: 'Interview & Governance',
      menus: [{ id: 'questions', module: 'questions', label: `Question Bank (${questions.length} Qs)`, icon: 'question', nav: 'questions', badge: `${activeQuestionIds.size} / 10` }]
    },
    {
      title: 'System',
      menus: [
        ...(isMasterAdmin ? [{ id: 'access', label: 'Admin Access', icon: 'user', nav: 'access' }] : []),
        ...['emailStatus', 'content', 'qrGenerator', 'managementBody', 'coordinators', 'letterHead', 'settings', 'softwareUpdate'].map(k => soonMenu(k))
      ]
    }
  ]
    .map(section => ({ ...section, menus: section.menus.filter(m => canOpen(m.module)) }))
    .filter(section => section.menus.length > 0);

  const monthlyMax = Math.max(1, ...monthlyRegistrations.map(m => Math.max(m.registered, m.approved)));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen bg-neutral-bg text-neutral-ink flex flex-col md:flex-row antialiased font-sans overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* ==================================================== */}
      {/* 1. LEFT SIDEBAR (TNV Civic Forest Green Style)       */}
      {/* ==================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 h-full bg-brand-green-dark text-slate-200 flex flex-col border-r border-emerald-950/60 transition-transform duration-300 md:relative md:translate-x-0 shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-0 max-md:-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-emerald-950/60 flex items-center justify-between shrink-0">
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
        <div className="px-4 py-3 border-b border-emerald-950/60 shrink-0">
          <div className="relative">
            <input
              type="text"
              placeholder="Search menu... (Ctrl+K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/20 text-emerald-100 text-xs rounded-xl pl-8 pr-3 py-2 border border-emerald-950/80 focus:outline-none focus:border-brand-yellow placeholder-emerald-400/40"
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
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 overscroll-contain no-scrollbar">
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
              </button>
            </div>
          </div>

          {/* Sections of drop-down menus */}
          {sidebarSections.map(section => (
            <div key={section.title}>
              <div className="px-3 text-[10px] font-bold tracking-wider uppercase text-emerald-400 font-display mb-2">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.menus.map(menu => {
                  if (menu.nav) {
                    const active = activeNav === menu.nav;
                    return (
                      <button key={menu.id} type="button" onClick={() => openNav(menu.nav)} className={navItemClass(active)}>
                        <span className="flex items-center gap-2.5 min-w-0">
                          <StatIcon name={menu.icon} className="w-4 h-4 shrink-0" />
                          <span className="truncate text-left">{menu.label}</span>
                        </span>
                        {menu.badge !== undefined && <span className={`shrink-0 ${navBadgeClass(active)}`}>{menu.badge}</span>}
                      </button>
                    );
                  }
                  const open = Boolean(openMenus[menu.id]);
                  const holdsActive = menu.items.some(i => i.id && i.id === activeNav);
                  return (
                    <div key={menu.id}>
                      <button
                        type="button"
                        onClick={() => setOpenMenus(m => ({ ...m, [menu.id]: !m[menu.id] }))}
                        aria-expanded={open}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          holdsActive ? 'bg-white/10 text-white' : 'text-emerald-100/80 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <StatIcon name={menu.icon} className="w-4 h-4 shrink-0" />
                          <span className="truncate text-left">{menu.label}</span>
                        </span>
                        <span className="flex items-center gap-1.5 shrink-0">
                          {menu.badge ? <span className={navBadgeClass(false)}>{menu.badge}</span> : null}
                          <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </button>

                      {open && (
                        <div className="mt-1 mb-2 ml-5 pl-3 border-l border-emerald-800/80 space-y-0.5">
                          {menu.items.map(item => {
                            const active = item.id === activeNav && (!item.tab || item.tab === birthdayTab);
                            const cls = `w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                              active ? 'bg-brand-green text-white font-bold shadow-sm' : 'text-emerald-100/70 hover:bg-white/10 hover:text-white'
                            }`;
                            const label = (
                              <span className="flex items-center gap-2.5 min-w-0">
                                <span className="w-1 h-1 rounded-full bg-current opacity-60 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </span>
                            );
                            return item.to ? (
                              <Link key={item.label} to={item.to} onClick={() => setSidebarOpen(false)} className={cls}>
                                {label}
                              </Link>
                            ) : (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  if (item.tab) setBirthdayTab(item.tab);
                                  openNav(item.id);
                                }}
                                className={cls}
                              >
                                {label}
                                {item.count !== undefined && (
                                  <span className={`text-[10px] px-1.5 rounded-full font-extrabold ${active ? 'bg-brand-yellow text-neutral-900' : 'text-emerald-300'}`}>{item.count}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="p-4 border-t border-emerald-950/60 bg-black/20 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-brand-green text-white font-bold text-xs flex items-center justify-center ring-2 ring-brand-yellow/40">
                  {adminUser?.full_name ? adminUser.full_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-brand-yellow rounded-full ring-2 ring-emerald-950" />
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
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto overscroll-contain">
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
                  {navLabel}
                </span>
              </div>
              <h1 className="text-lg font-extrabold text-brand-green-dark font-display tracking-tight">
                Admin Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Log Call: only where screening calls happen */}
            {(activeNav === 'dashboard' || showCallColumns) && (
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
            )}

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

            <div className="flex flex-wrap items-center gap-2">
              {/* The admin's own ID card and appointment letter (Master Admin included) */}
              {myDocumentId && (
                <>
                  <a
                    href={`/api/id-card/${encodeURIComponent(myDocumentId)}.pdf?t=${encodeURIComponent(getToken() || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-brand-green-dark border border-brand-green/40 hover:bg-brand-green-tint"
                  >
                    <StatIcon name="idcard" className="w-3.5 h-3.5" />
                    My ID Card
                  </a>
                  <a
                    href={`/api/appointment/${encodeURIComponent(myDocumentId)}.pdf?t=${encodeURIComponent(getToken() || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white text-brand-green-dark border border-brand-green/40 hover:bg-brand-green-tint"
                  >
                    <StatIcon name="document" className="w-3.5 h-3.5" />
                    Appointment Letter
                  </a>
                </>
              )}
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
              {/* Key figures: every number comes from the member records */}
              <dl className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5" aria-label="Key figures">
                {statCards.map(card => {
                  const content = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <dt className="text-[13px] font-semibold leading-snug text-neutral-600">{card.label}</dt>
                        <StatIcon
                          name={card.icon}
                          className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400 transition-colors duration-150 group-hover:text-brand-green"
                        />
                      </div>
                      <dd className="mt-3 font-display text-[28px] font-bold leading-none tabular-nums text-neutral-ink">{card.value}</dd>
                      <dd className="mt-auto flex min-w-0 items-start gap-1.5 pt-2.5 text-xs leading-snug text-neutral-muted">
                        {card.attention && (
                          <span
                            aria-hidden="true"
                            className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${card.attention === 'rose' ? 'bg-rose-500' : 'bg-amber-500'}`}
                          />
                        )}
                        <span className="line-clamp-2">{card.note}</span>
                      </dd>
                    </>
                  );
                  const cls = 'group flex h-full min-w-0 flex-col rounded-xl border border-neutral-200 bg-white p-4 text-left';
                  return card.nav ? (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => openNav(card.nav)}
                      className={`${cls} transition-[border-color,box-shadow] duration-150 hover:border-brand-green/40 hover:shadow-[0_4px_14px_-8px_rgba(18,77,41,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div key={card.label} className={cls}>{content}</div>
                  );
                })}
              </dl>

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

                        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 sm:grid-cols-3 xl:grid-cols-5">
                          {[
                            { label: 'Call Activities', value: dashboardCallInsights.totalCalls, description: 'Latest call records', color: 'text-brand-green' },
                            { label: 'Candidates Attended', value: dashboardCallInsights.attending, description: 'Marked as attending', color: 'text-brand-green' },
                            { label: 'No Answer', value: dashboardCallInsights.noAnswer, description: 'Unanswered attempts', color: 'text-status-no-answer' },
                            { label: 'Postponed', value: dashboardCallInsights.postponed, description: 'Postponed or scheduled', color: 'text-status-scheduled' },
                            { label: 'Declined', value: dashboardCallInsights.declined, description: 'Not attending', color: 'text-neutral-muted' }
                          ].map(card => (
                            <div key={card.label} className="min-w-0 bg-white px-4 py-4 sm:px-5">
                              <dt className="text-xs font-semibold text-neutral-600">{card.label}</dt>
                              <dd className={`mt-1 font-display text-2xl font-bold ${card.color}`}>{card.value}</dd>
                              <dd className="mt-0.5 text-[11px] text-neutral-muted">{card.description}</dd>
                            </div>
                          ))}
                        </dl>
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

          {/* Telecall desk, recent call activity and governance: main dashboard only */}
          {activeNav === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
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
          )}

          {/* ==================================================== */}
          {/* 4. MAIN OPERATIONAL WORKBENCH                        */}
          {/* ==================================================== */}
          {activeNav === 'questions' ? (
            /* Dedicated Question Bank Workbench */
            <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6 space-y-6">
              {/* Separate question sets: volunteer interviews and collaboration evaluations */}
              <div className="flex w-fit max-w-full rounded-xl bg-neutral-100 p-1 text-xs font-bold">
                {[
                  { id: 'volunteer', label: 'Volunteer interview' },
                  { id: 'collaboration', label: 'Collaboration evaluation' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setQuestionSet(tab.id)}
                    className={`min-h-9 px-3 rounded-lg transition-colors ${questionSet === tab.id ? 'bg-white text-brand-green-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {questionSet === 'collaboration' && (
                <div className="rounded-xl border border-brand-yellow/50 bg-brand-yellow-tint/50 p-5 text-sm text-neutral-800">
                  <p className="font-bold">Collaboration evaluation questions</p>
                  <p className="mt-1 text-xs">
                    This set is kept separate from the volunteer interview questions. Adding questions here needs the server to store which set each question belongs to, which isn't set up yet.
                    Until then, questions you add go to the volunteer interview set.
                  </p>
                </div>
              )}

              <div className={questionSet === 'collaboration' ? 'hidden' : 'space-y-6'}>
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
            </div>
          ) : (activeNav === 'crowdfunding' || activeNav.startsWith('crowdfunding') || soonKey === 'crowdfunding') ? (
            <AdminCrowdfunding />
          ) : (activeNav === 'beneficiaries' || activeNav.startsWith('beneficiaries') || soonKey === 'beneficiaries') ? (
            <AdminBeneficiaries />
          ) : (activeNav === 'coordinatorDonations' || activeNav.startsWith('coordinatorDonations') || soonKey === 'coordinatorDonations') ? (
            <AdminCoordinatorDonations />
          ) : (activeNav === 'otherDonations' || activeNav.startsWith('otherDonations') || soonKey === 'otherDonations') ? (
            <AdminInKindDonations />
          ) : (activeNav === 'autoPay' || activeNav.startsWith('autoPay') || soonKey === 'autoPay') ? (
            <AdminAutoPay />
          ) : activeNav.startsWith('messages-') ? (
            <SendMessage members={applicants} initialTab={activeNav === 'messages-notices' ? 'notices' : 'compose'} />
          ) : activeNav === 'programmes' ? (
            <ProgrammeMembers
              members={applicants}
              onUpdate={(id, programme) => setApplicants(list => list.map(a => (a.id === id ? { ...a, programme } : a)))}
            />
          ) : activeNav === 'access' ? (
            isMasterAdmin ? (
              <AdminAccess members={applicants} districts={TN_DISTRICTS} onChanged={loadPortalData} />
            ) : (
              <p className="bg-white rounded-2xl border border-brand-green-tint p-8 text-center text-sm text-neutral-600">Only the Master Admin can manage admin access.</p>
            )
          ) : soonKey === 'emailStatus' ? (
            <EmailStatus adminEmail={getCurrentUser()?.email || ''} />
          ) : soonKey && SOON_FEATURES[soonKey] ? (
            <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint px-6 py-12 sm:py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-brand-green-tint text-brand-green mx-auto flex items-center justify-center mb-4">
                <StatIcon name={SOON_FEATURES[soonKey].icon} className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-brand-green-dark text-lg font-display">{SOON_FEATURES[soonKey].title}</h3>
              <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold bg-brand-yellow-tint text-amber-900 border border-brand-yellow/40">
                Not set up yet
              </span>
              <p className="mt-4 text-sm text-neutral-muted max-w-md mx-auto">{SOON_FEATURES[soonKey].text}</p>
            </section>
          ) : (activeNav === 'events' || activeNav.startsWith('events-')) ? (
            <EventManager
              initialStatusFilter={
                activeNav === 'events' || activeNav === 'events-all'
                  ? 'all'
                  : activeNav.replace('events-', '')
              }
            />
          ) : (activeNav === 'tasks' || activeNav.startsWith('tasks-')) ? (
            <TaskManager />
          ) : (activeNav === 'certificates' || activeNav.startsWith('certificates-') || activeNav.startsWith('soon-certificates-')) ? (
            <CertificateManager initialTab={activeNav.includes('active') ? 'active' : 'issue'} />
          ) : activeNav.startsWith('collab-') ? (
            <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6">
              <div className="mb-5">
                <h3 className="font-bold text-brand-green-dark text-base font-display">{NAV_LABELS[activeNav]}</h3>
                <p className="text-xs text-neutral-muted mt-0.5">
                  Institutions, NGOs and organisations. Review each application, call the point of contact, then approve or reject. Open "View members" to see the volunteers who registered under an organisation.
                </p>
              </div>

              {collab.status === 'loading' ? (
                <div className="py-12 text-center"><Spinner className="mx-auto" /></div>
              ) : collab.status === 'unavailable' ? (
                <div className="rounded-xl border border-brand-yellow/50 bg-brand-yellow-tint/50 p-5 text-sm text-neutral-800">
                  <p className="font-bold">Collaboration applications couldn't be loaded.</p>
                  <p className="mt-1 text-xs">Check your connection and use the refresh button at the top.</p>
                </div>
              ) : (() => {
                const wanted = activeNav.replace('collab-', '');
                const list = collab.items.filter(a => (a.status || 'pending') === wanted);
                if (list.length === 0) return <p className="py-12 text-center text-sm text-neutral-500">No {wanted} applications.</p>;
                return (
                  <ul className="space-y-4">
                    {list.map(app => (
                      <li key={app.id} className="rounded-xl border border-neutral-200 p-4 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-12 h-12 shrink-0 rounded-xl border border-neutral-200 bg-white overflow-hidden grid place-items-center">
                              {app.logo
                                ? <img src={app.logo} alt="" className="w-full h-full object-contain p-0.5" />
                                : <StatIcon name="briefcase" className="w-5 h-5 text-neutral-400" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-neutral-900">{app.organisation_name || app.contact_name}</p>
                              <p className="text-[11px] text-neutral-500">
                                {[
                                  app.category || 'Organisation',
                                  app.district_name,
                                  app.zone ? `Zone ${app.zone}${app.ward ? `, Ward ${app.ward}` : ''}` : '',
                                  app.reg_number ? `Reg. ${app.reg_number}` : '',
                                  app.created_at ? `applied ${timeAgo(app.created_at)}` : ''
                                ].filter(Boolean).join(' · ')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openNgoMembers(app)}
                            className="shrink-0 w-fit inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-green-tint text-brand-green-dark text-xs font-bold hover:bg-brand-green-tint"
                          >
                            <StatIcon name="users" className="w-3.5 h-3.5" />
                            View members ({app.member_count || 0})
                          </button>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-neutral-bg p-3 text-xs">
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Organisation contact</dt>
                            <dd className="flex flex-wrap gap-x-3">
                              {(app.org_phone || app.phone) && <a href={`tel:${app.org_phone || app.phone}`} className="font-semibold text-blue-600 hover:underline">{app.org_phone || app.phone}</a>}
                              {app.org_email && <a href={`mailto:${app.org_email}`} className="font-semibold text-blue-600 hover:underline break-all">{app.org_email}</a>}
                              {app.website && <a href={app.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline break-all">{app.website}</a>}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Point of contact</dt>
                            <dd>
                              <span className="font-semibold text-neutral-900">{app.poc_name || app.contact_name}</span>
                              {(app.poc_designation || app.designation) && <span className="text-neutral-600">, {app.poc_designation || app.designation}</span>}
                              <span className="flex flex-wrap gap-x-3">
                                {app.poc_phone && <a href={`tel:${app.poc_phone}`} className="font-semibold text-blue-600 hover:underline">{app.poc_phone}</a>}
                                {app.poc_email && <a href={`mailto:${app.poc_email}`} className="font-semibold text-blue-600 hover:underline break-all">{app.poc_email}</a>}
                              </span>
                            </dd>
                          </div>
                        </dl>
                        {Array.isArray(app.interests) && app.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {app.interests.map(i => <span key={i} className="rounded-full bg-brand-green-tint px-2 py-0.5 text-[10px] font-semibold text-brand-green-dark">{i}</span>)}
                          </div>
                        )}
                        {app.proposal && <p className="text-xs text-neutral-700 whitespace-pre-line">{app.proposal}</p>}
                        {(app.status || 'pending') === 'pending' ? (
                          <div className="space-y-2 border-t border-neutral-100 pt-3">
                            <textarea
                              rows="2"
                              value={collabRemarks[app.id] || ''}
                              onChange={(e) => setCollabRemarks(r => ({ ...r, [app.id]: e.target.value }))}
                              placeholder="Evaluation remarks (required to reject)"
                              className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                            />
                            <div className="flex flex-wrap gap-2">
                              <button type="button" disabled={collabBusy === app.id} onClick={() => handleCollabDecision(app, 'approved')} className="px-3 py-2 rounded-lg bg-brand-green text-white text-xs font-bold hover:bg-brand-green-dark disabled:opacity-50">
                                Approve
                              </button>
                              <button type="button" disabled={collabBusy === app.id} onClick={() => handleCollabDecision(app, 'rejected')} className="px-3 py-2 rounded-lg border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 disabled:opacity-50">
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          app.remarks && <p className="border-t border-neutral-100 pt-3 text-xs text-neutral-600"><strong>Remarks:</strong> {app.remarks}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </section>
          ) : activeNav === 'payments' ? (
            <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-brand-green-dark text-base font-display">Payment Tracking & Proof Verification</h3>
                  <p className="text-xs text-neutral-muted mt-0.5">₹{MEMBERSHIP_FEE} annual fee. Review candidate screenshots, verify bank credits, and issue receipts.</p>
                </div>
                <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-bold flex-wrap gap-1">
                  {[
                    { id: 'all', label: `All (${applicants.length})` },
                    { id: 'unpaid', label: `1. Unpaid (${applicants.filter(a => !a.membership_paid && a.payment_status !== 'pending_verification').length})` },
                    { id: 'pending', label: `2. Paid Not Verified (${applicants.filter(a => a.payment_status === 'pending_verification' || (!a.membership_paid && a.payment_screenshot)).length})` },
                    { id: 'paid', label: `3. Paid Verified (${applicants.filter(a => a.membership_paid).length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPaymentFilter(tab.id)}
                      className={`min-h-9 px-3 rounded-lg transition-colors ${paymentFilter === tab.id ? 'bg-white text-brand-green-dark shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Collected', value: `₹${metrics.totalMembershipFees.toLocaleString('en-IN')}` },
                  { label: 'Collected this month', value: `₹${quickStats.feesThisMonth.toLocaleString('en-IN')}` },
                  { label: 'Awaiting payment', value: metrics.totalApplicants - metrics.paidApplicants }
                ].map(c => (
                  <div key={c.label} className="rounded-xl bg-neutral-bg p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{c.label}</p>
                    <p className="mt-1 font-display text-xl font-black text-neutral-900">{c.value}</p>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-neutral-600 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="py-3 px-3">Member</th>
                      <th className="py-3 px-3">Registered</th>
                      <th className="py-3 px-3">Fee Status</th>
                      <th className="py-3 px-3">Proof / UTR</th>
                      <th className="py-3 px-3">Action</th>
                      <th className="py-3 px-3">Paid Date & Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {applicants
                      .filter(a => {
                        const isPending = a.payment_status === 'pending_verification' || (!a.membership_paid && Boolean(a.payment_screenshot));
                        if (paymentFilter === 'all') return true;
                        if (paymentFilter === 'unpaid') return !a.membership_paid && !isPending;
                        if (paymentFilter === 'pending') return isPending;
                        if (paymentFilter === 'paid') return Boolean(a.membership_paid);
                        return true;
                      })
                      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                      .map(a => {
                        const isPending = a.payment_status === 'pending_verification' || (!a.membership_paid && Boolean(a.payment_screenshot));
                        return (
                          <tr key={a.id} className="hover:bg-neutral-50/60 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-neutral-900">{a.full_name || a.username}</div>
                              <div className="text-[11px] text-neutral-500">{a.phone} · {a.district_name || 'Tamil Nadu'}</div>
                            </td>
                            <td className="py-3 px-3 text-neutral-600">{formatShortDate(a.created_at)}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                a.membership_paid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPending
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-50 text-rose-700'
                              }`}>
                                {a.membership_paid ? '✓ Paid & Verified' : isPending ? '⏳ Proof Submitted (Pending)' : 'Unpaid (Incomplete)'}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              {a.payment_screenshot ? (
                                <button
                                  type="button"
                                  onClick={() => setViewingProofApplicant(a)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  <span>View Screenshot</span>
                                </button>
                              ) : a.gateway_ref ? (
                                <span className="font-mono text-[11px] text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded">
                                  {a.gateway_ref}
                                </span>
                              ) : (
                                <span className="text-[11px] text-neutral-400 italic">No proof yet</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {isPending ? (
                                <button
                                  type="button"
                                  disabled={verifyingPaymentId === a.id}
                                  onClick={() => handleAdminVerifyPayment(a.id, 'approve')}
                                  className="px-3 py-1 rounded-lg bg-brand-green hover:bg-brand-green-dark text-white font-bold text-[11px] shadow-xs transition-colors"
                                >
                                  {verifyingPaymentId === a.id ? 'Verifying...' : '✓ Verify & Issue Receipt'}
                                </button>
                              ) : a.membership_paid ? (
                                <span className="text-[11px] text-emerald-700 font-bold">Verified</span>
                              ) : (
                                <span className="text-[11px] text-neutral-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-neutral-600">
                              {a.membership_paid ? (
                                <div>
                                  {a.receipt_no ? (
                                    <a
                                      href={`/api/receipts/${a.receipt_no}.pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold text-brand-green-dark hover:underline inline-flex items-center gap-1 text-[11px]"
                                    >
                                      <span>{a.receipt_no}</span>
                                      <svg className="w-3 h-3 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </a>
                                  ) : (
                                    <div className="font-bold text-neutral-800">Verified</div>
                                  )}
                                  <div className="text-[10px] text-neutral-400">{formatShortDate(a.membership_paid_at) || 'Recorded'}</div>
                                </div>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {applicants.length === 0 && <p className="py-10 text-center text-sm text-neutral-500">No members yet.</p>}
              </div>
            </section>
          ) : (activeNav === 'visitorDonations' || activeNav === 'donationReceipts') ? (
            <section className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6 space-y-6">
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-bold text-brand-green-dark text-lg font-display">
                        Visitor Donations &amp; Public Civic Giving
                      </h3>
                      <p className="text-xs text-neutral-muted mt-0.5">
                        Direct public donations collected via UPI QR, mobile apps, and bank transfer on the public portal. Review payment screenshots, verify credits, and issue 80G tax receipts.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowManualDonationModal(true)}
                    className="px-3.5 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Record Walk-in / Direct Donation</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportDonationsCSV}
                    className="px-3.5 py-2 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
                  >
                    <svg className="w-4 h-4 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Export CA Ledger (CSV)</span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchDonations}
                    disabled={donationsLoading}
                    className="p-2 border border-neutral-300 hover:bg-neutral-50 rounded-xl text-neutral-700 transition-colors"
                    title="Refresh Donations"
                  >
                    <svg className={`w-4 h-4 ${donationsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Top 4 Performance Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 shadow-xs">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Total Public Contributions</div>
                  <div className="text-2xl font-black font-display text-brand-green-dark mt-1">
                    ₹{donationsList.reduce((sum, d) => sum + (Number(d.amount) || 0), 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">HDFC Bank Depository &bull; Direct Credits</div>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Total Donors Registered</div>
                  <div className="text-2xl font-black font-display text-neutral-900 mt-1">
                    {donationsList.length}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-1">Citizens &bull; Philanthropists &bull; Patrons</div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200 shadow-xs">
                  <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Needs Bank Verification</div>
                  <div className="text-2xl font-black font-display text-amber-700 mt-1">
                    {donationsList.filter(d => d.status === 'pending_verification').length}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-1">Screenshot proofs awaiting confirmation</div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/60 to-white border border-blue-200 shadow-xs">
                  <div className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">80G Tax Certificates</div>
                  <div className="text-2xl font-black font-display text-blue-700 mt-1">
                    {donationsList.filter(d => Boolean(d.pan || d.pan_number)).length}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-1">Valid PAN provided for 50% tax deduction</div>
                </div>
              </div>

              {/* Filter Tabs & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-2.5 rounded-2xl border border-neutral-200">
                <div className="flex rounded-xl bg-white p-1 text-xs font-bold border border-neutral-200 flex-wrap gap-1 shadow-xs">
                  {[
                    { id: 'all', label: `All (${donationsList.length})` },
                    { id: 'pending', label: `Needs Verification (${donationsList.filter(d => d.status === 'pending_verification').length})` },
                    { id: 'verified', label: `Verified & Cleared (${donationsList.filter(d => d.status === 'verified').length})` },
                    { id: 'pan', label: `80G with PAN (${donationsList.filter(d => Boolean(d.pan || d.pan_number)).length})` }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setDonationTab(tab.id)}
                      className={`min-h-8 px-3 rounded-lg transition-colors ${donationTab === tab.id ? 'bg-brand-green text-white shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-80">
                  <input
                    type="text"
                    placeholder="Search donor name, phone, PAN, or UTR..."
                    value={donationSearchQuery}
                    onChange={(e) => setDonationSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                  <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8FAFC] text-neutral-600 font-bold uppercase tracking-wider text-[10px] border-b border-neutral-200">
                    <tr>
                      <th className="py-3 px-3">Receipt No</th>
                      <th className="py-3 px-3">Donor Particulars</th>
                      <th className="py-3 px-3">Amount & Cause</th>
                      <th className="py-3 px-3">Payment Channel & Proof</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Credit Verification</th>
                      <th className="py-3 px-3 text-right">80G Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {donationsList.filter(d => {
                      if (donationTab === 'pending' && d.status !== 'pending_verification') return false;
                      if (donationTab === 'verified' && d.status !== 'verified') return false;
                      if (donationTab === 'pan' && !(d.pan || d.pan_number)) return false;
                      if (!donationSearchQuery.trim()) return true;
                      const q = donationSearchQuery.toLowerCase();
                      return (
                        (d.donor_name || '').toLowerCase().includes(q) ||
                        (d.receipt_no || '').toLowerCase().includes(q) ||
                        (d.donor_phone || '').includes(q) ||
                        (d.donor_email || '').toLowerCase().includes(q) ||
                        (d.pan || d.pan_number || '').toLowerCase().includes(q) ||
                        (d.utr || '').toLowerCase().includes(q)
                      );
                    }).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center">
                          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-2">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <p className="text-sm font-bold text-neutral-800">No visitor donations matching filter</p>
                          <p className="text-xs text-neutral-500 mt-0.5">Donations recorded via the /donate page or walk-in desk will appear here.</p>
                        </td>
                      </tr>
                    ) : (
                      donationsList
                        .filter(d => {
                          if (donationTab === 'pending' && d.status !== 'pending_verification') return false;
                          if (donationTab === 'verified' && d.status !== 'verified') return false;
                          if (donationTab === 'pan' && !(d.pan || d.pan_number)) return false;
                          if (!donationSearchQuery.trim()) return true;
                          const q = donationSearchQuery.toLowerCase();
                          return (
                            (d.donor_name || '').toLowerCase().includes(q) ||
                            (d.receipt_no || '').toLowerCase().includes(q) ||
                            (d.donor_phone || '').includes(q) ||
                            (d.donor_email || '').toLowerCase().includes(q) ||
                            (d.pan || d.pan_number || '').toLowerCase().includes(q) ||
                            (d.utr || '').toLowerCase().includes(q)
                          );
                        })
                        .map((d, idx) => (
                          <tr key={d.id || idx} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3.5 px-3 font-mono font-bold text-neutral-900">
                              <span className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded text-[11px] inline-block font-mono">
                                {d.receipt_no}
                              </span>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-bold text-neutral-900">
                                {d.donor_name || 'Anonymous Civic Supporter'}
                              </div>
                              <div className="text-[11px] text-neutral-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                {d.donor_phone && <span>{d.donor_phone}</span>}
                                {d.donor_email && <span>&bull; {d.donor_email}</span>}
                                {(d.pan || d.pan_number) ? (
                                  <span className="font-mono bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded text-[10px] font-bold">
                                    PAN: {d.pan || d.pan_number} (80G)
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-neutral-400">No PAN</span>
                                )}
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <span className="font-mono font-extrabold text-sm text-brand-green-dark">
                                ₹{(Number(d.amount) || 0).toLocaleString('en-IN')}
                              </span>
                              <div className="text-[10px] text-neutral-500 truncate max-w-[140px] font-medium mt-0.5">
                                {d.tier_label || 'Civic Support'}
                              </div>
                            </td>

                            <td className="py-3.5 px-3">
                              <div className="font-medium text-neutral-800">{d.payment_channel || 'UPI / QR'}</div>
                              <div className="text-[10px] font-mono text-neutral-500 truncate max-w-[150px]">
                                UTR: {d.utr || 'DIRECT-VERIFIED'}
                              </div>
                              {d.screenshot && (
                                <button
                                  type="button"
                                  onClick={() => setViewingDonationProof(d)}
                                  className="mt-1 text-[10px] font-bold text-brand-green hover:underline inline-flex items-center gap-1"
                                >
                                  <span>📷 View Proof Screenshot</span>
                                </button>
                              )}
                            </td>

                            <td className="py-3.5 px-3 text-neutral-600 text-[11px]">
                              <div>{new Date(d.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              <div className="text-[10px] text-neutral-400">{new Date(d.created_at || Date.now()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                            </td>

                            <td className="py-3.5 px-3">
                              {d.status === 'verified' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <svg className="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  <span>Verified Credit</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={verifyingDonationId === d.id}
                                  onClick={() => handleVerifyDonation(d.id, d.receipt_no, 'verify')}
                                  className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors inline-flex items-center gap-1"
                                >
                                  {verifyingDonationId === d.id ? 'Verifying...' : '✓ Verify Credit'}
                                </button>
                              )}
                            </td>

                            <td className="py-3.5 px-3 text-right">
                              <a
                                href={`/api/receipts/${d.receipt_no}.pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-brand-green text-white hover:bg-brand-green-dark shadow-xs inline-flex items-center gap-1.5 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>80G PDF</span>
                              </a>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : activeNav === 'birthdays' ? (
            <BirthdayWishes key={birthdayTab} members={applicants} initialRange={birthdayTab === 'today' ? 'today' : 'month30'} />
          ) : activeNav === 'dashboard' ? null : (
            <div className="space-y-5">
              {/* Filters */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-brand-green-tint/80 space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search by name, phone, email, organisation or TNV ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search members"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-neutral-300 text-xs sm:text-sm focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                    />
                    <svg className="w-4 h-4 text-neutral-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMoreFilters(v => !v)}
                      aria-expanded={showMoreFilters}
                      className="text-xs font-bold px-3 py-2 rounded-lg border border-brand-green-tint text-brand-green-dark hover:bg-brand-green-tint"
                    >
                      {showMoreFilters ? 'Fewer filters' : 'More filters'}{activeFilterCount ? ` (${activeFilterCount})` : ''}
                    </button>
                    {(searchQuery || activeFilterCount > 0) && (
                      <button
                        type="button"
                        onClick={clearMemberFilters}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold px-3 py-2 rounded-lg bg-rose-50"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-2 border-t border-neutral-100">
                  {[
                    {
                      label: 'District', value: filterDistrict, set: (v) => { setFilterDistrict(v); setFilterConstituency(''); setFilterZone(''); },
                      options: [['', 'All 38 districts'], ...TN_DISTRICTS.map(d => [d, d])]
                    },
                    {
                      label: 'Constituency', value: filterConstituency, set: setFilterConstituency,
                      options: [['', filterDistrict ? `All in ${filterDistrict}` : 'All constituencies'], ...constituencyOptions.map(c => [c, c])]
                    },
                    {
                      label: 'Status', value: filterStatus, set: setFilterStatus, hidden: activeNav !== 'members-all' && activeNav !== 'members-ngo',
                      options: [['', 'All statuses'], ['pending', 'Pending'], ['approved', 'Active (approved)'], ['blocked', 'Blocked']]
                    },
                    {
                      label: 'Fee', value: filterFee, set: setFilterFee,
                      options: [['', 'Any fee status'], ['unpaid', 'Fee pending'], ['proof', 'Proof submitted'], ['paid', 'Paid ₹365']]
                    },
                    {
                      label: 'Wing', value: filterWing, set: setFilterWing,
                      options: [['', 'All wings'], ...WINGS.map(w => [w, w])]
                    },
                    {
                      label: 'Call status', value: filterCallStatus, set: setFilterCallStatus, hidden: !showCallColumns,
                      options: [['', 'All call states'], ['Attending', 'Attending'], ['Postponed', 'Postponed'], ['No Answer', 'No Answer'], ['Not Attending', 'Not Attending'], ['Not Called', 'Not Called']]
                    }
                  ].filter(f => !f.hidden).map(f => (
                    <label key={f.label} className="min-w-0">
                      <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">{f.label}</span>
                      <select
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                      >
                        {f.options.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
                      </select>
                    </label>
                  ))}
                  <label className="min-w-0">
                    <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Registered from</span>
                    <input type="date" value={filterDateFrom} max={filterDateTo || undefined} onChange={(e) => setFilterDateFrom(e.target.value)} className="w-full py-1 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green" />
                  </label>
                  <label className="min-w-0">
                    <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">Registered to</span>
                    <input type="date" value={filterDateTo} min={filterDateFrom || undefined} onChange={(e) => setFilterDateTo(e.target.value)} className="w-full py-1 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green" />
                  </label>
                </div>

                {showMoreFilters && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 pt-2 border-t border-neutral-100">
                    {[
                      { label: 'Gender', value: filterGender, set: setFilterGender, options: [['', 'Any gender'], ['Male', 'Male'], ['Female', 'Female'], ['Other', 'Other']] },
                      { label: 'Blood group', value: filterBlood, set: setFilterBlood, options: [['', 'Any blood group'], ...['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => [b, b])] },
                      { label: 'Affiliation', value: filterAffiliation, set: setFilterAffiliation, options: [['', 'Any affiliation'], ...REGISTRATION.options.affiliations.filter(a => !/type manually/i.test(a)).map(a => [a, a])] },
                      { label: 'Organisation', value: filterNgo, set: setFilterNgo, hidden: activeNav === 'members-ngo', options: [['', 'Any organisation'], ['__none', 'Not linked to one'], ...ngoOptions.map(o => [o.id, o.name])] },
                      { label: 'Chennai zone', value: filterZone, set: setFilterZone, hidden: filterDistrict && filterDistrict !== 'Chennai', options: [['', 'Any zone'], ...CHENNAI_ZONES.map(z => [String(z.no), zoneLabel(z)])] },
                      { label: 'Programme', value: filterProgramme, set: setFilterProgramme, options: [['', 'Any programme'], ['food', 'Food distribution'], ['tree', 'Tree planting'], ['none', 'Not assigned']] }
                    ].filter(f => !f.hidden).map(f => (
                      <label key={f.label} className="min-w-0">
                        <span className="block text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-1">{f.label}</span>
                        <select
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          className="w-full py-1.5 px-2 rounded-lg border border-neutral-300 text-xs bg-white focus:ring-1 focus:ring-brand-green"
                        >
                          {f.options.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Member list */}
              <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint/80 overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-brand-green-tint/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-brand-green-dark text-sm font-display">
                      {navLabel} ({filteredApplicants.length})
                    </h3>
                    <p className="text-xs text-neutral-muted">
                      Click a member to open their full review: questions, profile, Aadhaar and approval.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeNav === 'members-ngo' && (
                      <button type="button" onClick={() => openNav('collab-approved')} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand-green-tint text-brand-green-dark hover:bg-brand-green-tint">
                        Back to partners
                      </button>
                    )}
                    <Link
                      to="/register?admin=1"
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-brand-green text-white rounded-lg hover:bg-brand-green-dark"
                    >
                      <StatIcon name="userplus" className="w-3.5 h-3.5" />
                      Add Member
                    </Link>
                  </div>
                </div>

                {loading ? (
                  <div className="py-16 text-center">
                    <Spinner className="mx-auto" />
                    <p className="text-xs text-neutral-500 mt-2 font-medium">Loading members...</p>
                  </div>
                ) : filteredApplicants.length === 0 ? (
                  <div className="py-16 text-center px-4">
                    <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 mx-auto flex items-center justify-center mb-3">
                      <StatIcon name="users" className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-neutral-800">
                      {activeNav === 'members-blocked' ? 'No blocked members' : activeNav === 'members-ngo' ? 'No members have joined through this organisation yet' : 'No members match these filters'}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">Try clearing the filters or add a new member.</p>
                  </div>
                ) : (
                  <>
                    <ul className="divide-y divide-neutral-100">
                      {pagedApplicants.map((app) => {
                        const isApproved = app.status === 'approved';
                        const isPaid = app.membership_paid;
                        const proofSent = !isPaid && (app.payment_status === 'pending_verification' || Boolean(app.payment_screenshot));
                        const callSt = !app.call_status || app.call_status === 'not_called' ? 'Not Called' : app.call_status;
                        const where = [
                          app.district_name || 'Tamil Nadu',
                          app.zone ? `Zone ${app.zone}${app.ward ? ` · Ward ${app.ward}` : ''}` : app.assembly_constituency
                        ].filter(Boolean).join(' · ');
                        return (
                          <li key={app.id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleOpenEvaluation(app)}
                              onKeyDown={(e) => {
                                if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  handleOpenEvaluation(app);
                                }
                              }}
                              className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 sm:px-5 py-3 cursor-pointer hover:bg-brand-green-tint/40 focus:outline-none focus-visible:bg-brand-green-tint/60 transition-colors"
                            >
                              {/* Member */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center justify-center text-xs shrink-0 ring-1 ring-neutral-300 overflow-hidden">
                                  {app.photo_path || app.photo_url ? (
                                    <img src={app.photo_path || app.photo_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    (app.full_name || 'V').charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-neutral-900 text-sm truncate">{app.full_name || app.username}</div>
                                  <div className="text-[11px] text-neutral-500 truncate">
                                    {app.phone}{app.email ? ` · ${app.email}` : ''}
                                  </div>
                                  <div className="text-[11px] text-neutral-500 truncate lg:hidden">{where}</div>
                                </div>
                              </div>

                              {/* Status (small screens sit beside the name) */}
                              <div className="lg:hidden justify-self-end">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${memberStatus(app).cls}`}>{memberStatus(app).label}</span>
                              </div>

                              {/* Location, organisation */}
                              <div className="hidden lg:block min-w-0 text-xs">
                                <div className="font-semibold text-neutral-800 truncate">{where}</div>
                                <div className="text-[11px] text-neutral-500 truncate">
                                  {app.ngo_name || app.organization_name || getShortWing(app.wing_to_join || app.wing_name)}
                                </div>
                              </div>

                              {/* Fee */}
                              <div className="hidden lg:block min-w-0">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : proofSent ? 'bg-amber-100 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>
                                  {isPaid ? '₹365 paid' : proofSent ? 'Proof sent' : 'Fee pending'}
                                </span>
                                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">Joined {formatShortDate(app.created_at)}</div>
                              </div>

                              {/* Call screening (pending and call views) or approval details */}
                              <div className="hidden lg:block min-w-0">
                                {showCallColumns ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleOpenCallModal(app); }}
                                    className="text-left"
                                    title="Call history and new call"
                                  >
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      callSt === 'Attending' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : callSt === 'Postponed' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : callSt === 'No Answer' ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : callSt === 'Not Attending' ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-neutral-100 text-neutral-600 border-neutral-200'
                                    }`}>
                                      {callSt}
                                    </span>
                                    <span className="block text-[10px] text-blue-600 mt-0.5 underline">
                                      {app.total_call_attempts ? `${app.total_call_attempts} call${app.total_call_attempts > 1 ? 's' : ''}` : 'Log call'}
                                    </span>
                                  </button>
                                ) : (
                                  <>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${memberStatus(app).cls}`}>{memberStatus(app).label}</span>
                                    <div className="text-[10px] text-neutral-500 mt-0.5 truncate font-mono">
                                      {isApproved ? (app.tnv_id || 'Approved') : app.total_score != null ? `Score ${Number(app.total_score).toFixed(1)}` : 'Not scored'}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                {showCallColumns && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenCallModal(app)}
                                    className="p-1.5 rounded-lg text-brand-green-dark hover:bg-brand-green-tint bg-white border border-brand-green-tint transition-colors"
                                    title="Log a call"
                                    aria-label={`Log a call with ${app.full_name || 'member'}`}
                                  >
                                    <StatIcon name="phone" className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isApproved && app.tnv_id && !app.blocked && (
                                  <a
                                    href={portfolioPath(app.full_name, app.tnv_id)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-brand-green-tint text-brand-green-dark bg-white hover:bg-brand-green-tint"
                                    title="Open the public portfolio"
                                  >
                                    Portfolio
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvaluation(app)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-green hover:bg-brand-green-dark shadow-xs transition-colors"
                                >
                                  {isApproved ? 'Open' : 'Review'}
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
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    {/* Paging: 20 or 50 a page */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-neutral-100 text-xs">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <span>Show</span>
                        {[20, 50].map(n => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPageSize(n)}
                            aria-pressed={pageSize === n}
                            className={`min-w-9 px-2.5 py-1 rounded-lg font-bold border ${pageSize === n ? 'bg-brand-green text-white border-brand-green' : 'border-neutral-300 hover:bg-neutral-50'}`}
                          >
                            {n}
                          </button>
                        ))}
                        <span>per page</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-600">
                          {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filteredApplicants.length)} of {filteredApplicants.length}
                        </span>
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="px-2.5 py-1 rounded-lg border border-neutral-300 font-bold disabled:opacity-40">
                          Previous
                        </button>
                        <button type="button" disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} className="px-2.5 py-1 rounded-lg border border-neutral-300 font-bold disabled:opacity-40">
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                )}
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
                        {log.callback_at && (
                          <p className="text-[11px] font-semibold text-amber-800">
                            Follow-up: {formatSafeDateTime(log.callback_at)}
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

                {/* Follow-up for calls that need another attempt */}
                {(callStatus === 'Postponed' || callStatus === 'No Answer') && (
                  <div>
                    <label htmlFor="callFollowUp" className="block text-xs font-bold text-neutral-800 mb-1">
                      Follow-up date and time
                    </label>
                    <input
                      id="callFollowUp"
                      type="datetime-local"
                      value={callFollowUp}
                      onChange={(e) => setCallFollowUp(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">When to call again. The call's own date and time are recorded automatically.</p>
                  </div>
                )}

                {/* Call Notes */}
                <div>
                  <label className="block text-xs font-bold text-neutral-800 mb-1">
                    Remarks
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
        <div className="fixed inset-0 z-50 bg-white" role="dialog" aria-modal="true" aria-label={`Evaluation: ${selectedApplicant.full_name || 'member'}`}>
          <div className="h-full w-full flex flex-col overflow-hidden">
            {/* Modal Top Bar */}
            <div className="px-4 sm:px-8 py-4 bg-brand-green-dark text-white flex items-center justify-between gap-3 border-b border-emerald-900/60 font-display">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-brand-yellow text-neutral-900 font-black font-display text-sm flex items-center justify-center overflow-hidden shadow-xs ring-2 ring-white/20">
                  {selectedApplicant.photo_path || selectedApplicant.photo_url ? (
                    <img src={selectedApplicant.photo_path || selectedApplicant.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    selectedApplicant.full_name?.charAt(0) || 'V'
                  )}
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
                className="shrink-0 inline-flex items-center gap-1.5 text-emerald-100 hover:text-white hover:bg-white/10 px-3 py-2 rounded-lg text-xs font-bold"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to list
              </button>
            </div>

            {/* Sub-Navigation Tabs */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-neutral-200 bg-neutral-50 px-4 sm:px-8 text-xs font-bold text-neutral-600 [&>button]:shrink-0">
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
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 w-full max-w-6xl mx-auto">
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

                          <label className="block">
                            <span className="sr-only">Answer and remarks for question {idx + 1}</span>
                            <textarea
                              rows="2"
                              value={applicantNotes[q.id] || ''}
                              onChange={(e) => setApplicantNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                              placeholder="Candidate's answer and your remarks"
                              className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs focus:ring-2 focus:ring-brand-green focus:border-brand-green"
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: CANDIDATE DOSSIER DETAILS */}
              {modalTab === 'dossier' && (
                <div className="space-y-4 text-xs">
                  {/* Candidate Portrait Hero Card */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-2xl bg-gradient-to-r from-emerald-50/70 via-white to-neutral-50 border border-brand-green-tint/80 shadow-xs">
                    {/* Portrait Photo Container */}
                    <div className="relative shrink-0 w-28 h-36 rounded-2xl overflow-hidden border-2 border-emerald-400/80 bg-white shadow-sm flex items-center justify-center">
                      {selectedApplicant.photo_path || selectedApplicant.photo_url ? (
                        <img
                          src={selectedApplicant.photo_path || selectedApplicant.photo_url}
                          alt={selectedApplicant.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-emerald-700 w-full h-full bg-gradient-to-b from-emerald-100 to-emerald-200">
                          <span className="font-display text-3xl font-black">
                            {selectedApplicant.full_name?.charAt(0) || 'V'}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider mt-1 text-emerald-800/80">No Photo</span>
                        </div>
                      )}
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-brand-green text-white shadow-xs">
                        {selectedApplicant.status || 'Pending'}
                      </span>
                    </div>

                    {/* Candidate Primary Info & Badges */}
                    <div className="flex-1 min-w-0 text-center sm:text-left space-y-2">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h4 className="font-display text-lg font-black text-brand-green-dark">
                          {selectedApplicant.full_name}
                        </h4>
                        <span className="font-mono text-xs font-bold text-brand-green bg-brand-green-tint px-2 py-0.5 rounded-md border border-brand-green/30">
                          @{selectedApplicant.username}
                        </span>
                        {selectedApplicant.tnv_id && (
                          <span className="font-mono text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                            {selectedApplicant.tnv_id}
                          </span>
                        )}
                      </div>

                      {/* Contact & Demographics Badges */}
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-[11px]">
                        <a
                          href={`tel:${selectedApplicant.phone}`}
                          className="inline-flex items-center gap-1 font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-brand-green hover:text-brand-green shadow-xs transition-colors"
                        >
                          <svg className="w-3.5 h-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {selectedApplicant.phone}
                        </a>
                        {selectedApplicant.email && (
                          <a
                            href={`mailto:${selectedApplicant.email}`}
                            className="inline-flex items-center gap-1 font-medium text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-brand-green hover:text-brand-green shadow-xs transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {selectedApplicant.email}
                          </a>
                        )}
                        <span className="font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          Blood: {selectedApplicant.blood_group || 'O+'}
                        </span>
                        {selectedApplicant.gender && (
                          <span className="font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                            {selectedApplicant.gender}
                          </span>
                        )}
                        {selectedApplicant.dob && (
                          <span className="font-semibold text-neutral-700 bg-white px-2.5 py-1 rounded-lg border border-neutral-200">
                            DOB: {selectedApplicant.dob}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-neutral-600">
                        <strong>Native Jurisdiction:</strong> {selectedApplicant.district_name || 'Tamil Nadu'}
                        {selectedApplicant.assembly_constituency ? ` • ${selectedApplicant.assembly_constituency} AC` : ''}
                        {selectedApplicant.pincode ? ` (${selectedApplicant.pincode})` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Comprehensive 3x3 Details Grid (No empty spaces) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Requested Wing</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.wing_to_join || selectedApplicant.wing_name || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Department</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.department || 'General Administration'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Preferred Role</div>
                      <div className="font-bold text-brand-green-dark mt-0.5">{selectedApplicant.preferred_designation || 'Volunteer Member'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Mode of Work</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.mode_of_work || 'On-Field / Offline'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Work / Study Status</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.work_study_status || 'Employed / Student'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Employer / College</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.employer_name || selectedApplicant.organization_name || selectedApplicant.company_area || 'Individual'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">District & Taluk</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.district_name || 'Not provided'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Assembly Constituency</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.assembly_constituency || 'General'}</div>
                    </div>
                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Panchayat / Ward</div>
                      <div className="font-bold text-neutral-900 mt-0.5">{selectedApplicant.panchayat || 'Urban / Not specified'}</div>
                    </div>
                  </div>

                  {/* Residential Address Card */}
                  {selectedApplicant.address && (
                    <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
                      <div className="text-neutral-500 text-[10px] uppercase font-bold">Residential Address</div>
                      <div className="font-semibold text-neutral-800 mt-0.5 leading-relaxed">
                        {selectedApplicant.address} {selectedApplicant.pincode ? `- ${selectedApplicant.pincode}` : ''}
                      </div>
                    </div>
                  )}

                  {/* Prior Field Work Experience Card */}
                  <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="text-neutral-500 text-[10px] uppercase font-bold mb-1.5">Prior Social & Field Work Experience</div>
                    <FieldWorkList record={selectedApplicant} />
                  </div>

                  {/* Official Credentials & Download Receipt Options */}
                  <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-brand-green-dark text-[10px] uppercase font-bold">
                        Official Credentials & Receipts
                      </div>
                      <span className="text-[10px] font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 font-bold">
                        Sovereign Precision PDF
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <a
                        href={`/api/receipts/${selectedApplicant.receipt_no || 'TNV-R-2026-0001'}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 text-xs">Fee Receipt</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{selectedApplicant.receipt_no || 'TNV-R-2026-0001'}</div>
                        </div>
                        <span className="text-xs font-bold text-brand-green group-hover:underline">Download</span>
                      </a>
                      <a
                        href={`/api/id-card/${selectedApplicant.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 text-xs">ID Card</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">Portrait & QR</div>
                        </div>
                        <span className="text-xs font-bold text-brand-green group-hover:underline">Download</span>
                      </a>
                      <a
                        href={`/api/appointment-letter/${selectedApplicant.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 rounded-xl bg-white border border-emerald-200 hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between group"
                      >
                        <div>
                          <div className="font-bold text-neutral-900 text-xs">Appointment</div>
                          <div className="text-[10px] text-neutral-500 mt-0.5">Official Order</div>
                        </div>
                        <span className="text-xs font-bold text-brand-green group-hover:underline">Download</span>
                      </a>
                    </div>
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

      {/* Payment Proof Screenshot Lightbox Modal */}
      {viewingProofApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Payment Proof: {viewingProofApplicant.full_name || viewingProofApplicant.username}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {viewingProofApplicant.phone} · {viewingProofApplicant.district_name || 'Tamil Nadu'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingProofApplicant(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-neutral-100 flex items-center justify-center max-h-[65vh] overflow-auto">
              <img
                src={viewingProofApplicant.payment_screenshot}
                alt="Payment Screenshot"
                className="max-h-[60vh] w-auto rounded-lg shadow-md object-contain"
              />
            </div>
            <div className="p-4 border-t border-neutral-200 bg-white flex items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-500 flex items-center gap-2">
                <span>Receipt: <strong className="text-neutral-800">{viewingProofApplicant.receipt_no || 'Pending Verification'}</strong></span>
                {viewingProofApplicant.receipt_no && (
                  <a
                    href={`/api/receipts/${viewingProofApplicant.receipt_no}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand-green font-bold hover:underline inline-flex items-center gap-1 ml-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download PDF</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!viewingProofApplicant.membership_paid && (
                  <button
                    type="button"
                    disabled={verifyingPaymentId === viewingProofApplicant.id}
                    onClick={() => handleAdminVerifyPayment(viewingProofApplicant.id, 'approve')}
                    className="px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                  >
                    {verifyingPaymentId === viewingProofApplicant.id ? 'Verifying...' : '✓ Approve & Issue Receipt'}
                  </button>
                )}
                {viewingProofApplicant.receipt_no && (
                  <a
                    href={`/api/receipts/${viewingProofApplicant.receipt_no}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Download Receipt ({viewingProofApplicant.receipt_no})</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingProofApplicant(null)}
                  className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Issue New 80G Donation Receipt */}
      {showManualDonationModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-neutral-200 animate-in fade-in">
            <div className="p-4 border-b border-neutral-200 bg-brand-green-dark text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm font-display">Record & Issue 80G Donation Receipt</h3>
                <p className="text-[11px] text-emerald-200 mt-0.5">Generates official PDF with TNV emblem, barcode & 80G tax clearance</p>
              </div>
              <button
                type="button"
                onClick={() => setShowManualDonationModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateManualDonation} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Donor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={manualDonationForm.donor_name}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, donor_name: e.target.value })}
                    placeholder="e.g. Anand Kumar"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contact Phone (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    value={manualDonationForm.donor_phone}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, donor_phone: e.target.value })}
                    placeholder="9840123456"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Contribution Amount (INR ₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={manualDonationForm.amount}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, amount: e.target.value })}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none font-bold text-brand-green-dark"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Donor PAN (for 80G claim)</label>
                  <input
                    type="text"
                    value={manualDonationForm.pan}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, pan: e.target.value.toUpperCase() })}
                    placeholder="ABCDE1234F"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">Email Address (for receipt dispatch)</label>
                <input
                  type="email"
                  value={manualDonationForm.donor_email}
                  onChange={e => setManualDonationForm({ ...manualDonationForm, donor_email: e.target.value })}
                  placeholder="donor@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">Payment Method</label>
                  <select
                    value={manualDonationForm.payment_channel}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, payment_channel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none"
                  >
                    <option value="Direct Bank Transfer (HDFC)">Direct Bank Transfer (HDFC)</option>
                    <option value="Direct UPI / QR Transfer">Direct UPI / QR Transfer</option>
                    <option value="Cheque / Demand Draft">Cheque / Demand Draft</option>
                    <option value="Cash Counter Contribution">Cash Counter Contribution</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">UTR / Cheque / Bank Ref</label>
                  <input
                    type="text"
                    value={manualDonationForm.utr}
                    onChange={e => setManualDonationForm({ ...manualDonationForm, utr: e.target.value })}
                    placeholder="e.g. 531209876543"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs bg-white focus:ring-2 focus:ring-brand-green outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualDonationModal(false)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={manualDonationSubmitting}
                  className="px-5 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold rounded-xl shadow-sm inline-flex items-center gap-1.5"
                >
                  {manualDonationSubmitting ? 'Issuing...' : '✓ Issue & Download 80G Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visitor Donation Payment Proof Modal */}
      {viewingDonationProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-neutral-200">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
              <div>
                <h3 className="font-bold text-sm text-neutral-900">
                  Donation Proof: {viewingDonationProof.donor_name || 'Anonymous Civic Donor'}
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {viewingDonationProof.donor_phone || 'No phone'} {viewingDonationProof.donor_email ? `· ${viewingDonationProof.donor_email}` : ''}
                  {viewingDonationProof.utr ? ` · UTR: ${viewingDonationProof.utr}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDonationProof(null)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 bg-neutral-100 flex items-center justify-center max-h-[60vh] overflow-auto">
              {viewingDonationProof.screenshot ? (
                <img
                  src={viewingDonationProof.screenshot}
                  alt="Donation UPI Proof"
                  className="max-h-[55vh] w-auto rounded-lg shadow-md object-contain"
                />
              ) : (
                <div className="p-8 text-center text-xs text-neutral-500 font-semibold">
                  No payment screenshot image attached for this record. UTR: {viewingDonationProof.utr || 'Direct Clearing'}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-neutral-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] text-neutral-600">
                <div>Contribution: <strong className="text-emerald-700 text-xs">₹{(Number(viewingDonationProof.amount) || 0).toLocaleString('en-IN')}</strong> ({viewingDonationProof.tier_label || 'Civic Support'})</div>
                <div>Receipt: <strong className="font-mono text-neutral-800">{viewingDonationProof.receipt_no}</strong> {viewingDonationProof.status === 'verified' && <span className="text-emerald-600 font-bold ml-1">✓ Verified</span>}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {viewingDonationProof.status !== 'verified' && (
                  <button
                    type="button"
                    disabled={verifyingDonationId === viewingDonationProof.id}
                    onClick={() => handleVerifyDonation(viewingDonationProof.id, viewingDonationProof.receipt_no, 'verify')}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    {verifyingDonationId === viewingDonationProof.id ? 'Verifying...' : '✓ Confirm Bank Credit'}
                  </button>
                )}
                {viewingDonationProof.receipt_no && (
                  <a
                    href={`/api/receipts/${viewingDonationProof.receipt_no}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 bg-brand-green hover:bg-brand-green-dark text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>80G Receipt</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setViewingDonationProof(null)}
                  className="px-3 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-xl shadow-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
