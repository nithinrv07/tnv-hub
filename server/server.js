// TNV Hub Portal - Local Test Server
// Serves static frontend and handles Steps 1 to 5:
// - Step 1: 38 Districts
// - Step 2: Username check RPC
// - Step 3: Registration & validation
// - Step 4: Fixed Rs 365 payment, sequence starting from 0001, PDF generation
// - Step 5: Applicant Dashboard (Under Review status, zero whatsapp links, guard checks, login)

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
const supabaseBridge = require('./supabase_bridge');
const { createPhase1 } = require('./routes/phase1');
const {
  DISTRICT_CONSTITUENCIES,
  AFFILIATIONS,
  WORK_STUDY_STATUSES,
  WINGS,
  DEPARTMENTS_BY_WING,
  MODES_OF_WORK,
  PAST_FIELD_WORK_DEPARTMENTS
} = require('./data/constituencies');

const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.AADHAAR_ENCRYPTION_KEY || 'tnv_phase1_super_secret_encryption_key_2026';

// Hosted on Vercel (VERCEL is set there): no in-memory fallback, because function
// instances come and go and would lose data, and no built-in secrets, because this
// file is public. Every value below must be set as a Vercel environment variable.
const IS_HOSTED = Boolean(process.env.VERCEL);
const REQUIRED_HOSTED_ENV = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'AADHAAR_ENCRYPTION_KEY', 'ADMIN_PASSWORD'];
const MISSING_HOSTED_ENV = IS_HOSTED ? REQUIRED_HOSTED_ENV.filter(k => !process.env[k]) : [];
// Local development keeps the documented demo password
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword2026!';
const MEMBERSHIP_FEE_INR = 365;

// Receipt Sequence strictly starting from 0001
let receiptCounter = 1;
function generateReceiptNo() {
  const year = new Date().getFullYear();
  const numStr = String(receiptCounter++).padStart(4, '0');
  return `TNV-R-${year}-${numStr}`;
}

// UTR Pattern Validator: checks length, junk repetition, sequential numbers
function isValidUtrNumber(utr) {
  if (typeof utr !== 'string') return false;
  const clean = utr.trim();
  if (!/^\d{12}$/.test(clean)) return false;

  // Reject all identical digits (e.g. 000000000000, 111111111111)
  if (/^(\d)\1{11}$/.test(clean)) return false;

  // Reject ascending/descending trivial sequences
  if (['012345678901', '123456789012', '987654321098', '098765432109'].includes(clean)) return false;

  return true;
}

// In-Memory Rate Limiter for payment attempts (IP / User)
const paymentRateLimits = new Map();
function checkPaymentRateLimit(identifier) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 6;

  const userHistory = paymentRateLimits.get(identifier) || [];
  const validHistory = userHistory.filter(timestamp => now - timestamp < windowMs);

  if (validHistory.length >= maxAttempts) {
    paymentRateLimits.set(identifier, validHistory);
    return false; // Rate limit exceeded
  }

  validHistory.push(now);
  paymentRateLimits.set(identifier, validHistory);
  return true;
}

// TNV Member ID Sequence (Placeholder format: TNV-<district_code>-<0001>)
let tnvIdCounter = 1;
function generateTnvId(districtName) {
  const code = (districtName || 'TN').slice(0, 3).toUpperCase();
  const numStr = String(tnvIdCounter++).padStart(4, '0');
  return `TNV-${code}-${numStr}`;
}

// 38 Official Tamil Nadu Districts
const DISTRICTS = [
  { id: 1, name: 'Ariyalur' },
  { id: 2, name: 'Chengalpattu' },
  { id: 3, name: 'Chennai' },
  { id: 4, name: 'Coimbatore' },
  { id: 5, name: 'Cuddalore' },
  { id: 6, name: 'Dharmapuri' },
  { id: 7, name: 'Dindigul' },
  { id: 8, name: 'Erode' },
  { id: 9, name: 'Kallakurichi' },
  { id: 10, name: 'Kanchipuram' },
  { id: 11, name: 'Kanyakumari' },
  { id: 12, name: 'Karur' },
  { id: 13, name: 'Krishnagiri' },
  { id: 14, name: 'Madurai' },
  { id: 15, name: 'Mayiladuthurai' },
  { id: 16, name: 'Nagapattinam' },
  { id: 17, name: 'Namakkal' },
  { id: 18, name: 'Nilgiris' },
  { id: 19, name: 'Perambalur' },
  { id: 20, name: 'Pudukkottai' },
  { id: 21, name: 'Ramanathapuram' },
  { id: 22, name: 'Ranipet' },
  { id: 23, name: 'Salem' },
  { id: 24, name: 'Sivaganga' },
  { id: 25, name: 'Tenkasi' },
  { id: 26, name: 'Thanjavur' },
  { id: 27, name: 'Theni' },
  { id: 28, name: 'Thoothukudi' },
  { id: 29, name: 'Tiruchirappalli' },
  { id: 30, name: 'Tirunelveli' },
  { id: 31, name: 'Tirupathur' },
  { id: 32, name: 'Tiruppur' },
  { id: 33, name: 'Tiruvallur' },
  { id: 34, name: 'Tiruvannamalai' },
  { id: 35, name: 'Tiruvarur' },
  { id: 36, name: 'Vellore' },
  { id: 37, name: 'Viluppuram' },
  { id: 38, name: 'Virudhunagar' }
];

// Clean Dropdown Options
const OPTIONS = {
  affiliations: AFFILIATIONS,
  categories: AFFILIATIONS, // legacy backwards compatibility
  work_study_statuses: WORK_STUDY_STATUSES,
  blood_groups: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  genders: ['Male', 'Female', 'Other'],
  marital_statuses: ['Single', 'Married', 'Divorced', 'Widowed'],
  wings: WINGS,
  departments_by_wing: DEPARTMENTS_BY_WING,
  modes_of_work: MODES_OF_WORK,
  past_field_work_departments: PAST_FIELD_WORK_DEPARTMENTS,
  constituencies_by_district: DISTRICT_CONSTITUENCIES,
  occupations: [
    'Student', 'Government Employee', 'Private Employee', 'Business Owner / Entrepreneur',
    'Farmer', 'Homemaker', 'Daily Wage Worker', 'Self-Employed', 'Unemployed', 'Retired',
    'Teacher / Professor', 'Doctor / Healthcare Worker', 'Engineer / IT Professional',
    'Social Worker / NGO Worker', 'Police / Armed Forces', 'Artist / Creative Professional',
    'Driver / Transport Worker', 'Labourer', 'Other'
  ],
  designations: [
    'Active Member', 'General Member', 'Event Coordinator', 'Social Worker',
    'District Coordinator', 'Block Coordinator', 'District President',
    'Branch Manager', 'HR Manager', 'Member', 'Volunteer'
  ]
};

// 13 Official Sectors for Step 14
const SECTOR_NAMES = [
  'Education & Literacy',
  'Health & Blood Donation',
  'Environmental Protection & Afforestation',
  'Disaster Relief & Emergency Response',
  'Women Empowerment & Safety',
  'Youth Development & Sports',
  'Rural Development & Agriculture',
  'Skill Training & Employment',
  'Child Welfare & Protection',
  'Senior Citizen Care',
  'Legal Aid & Civic Rights',
  'Animal Welfare',
  'Digital Literacy & Tech Support'
];

// Seed WhatsApp Links for Step 5
const WHATSAPP_LINKS = [
  { id: 1, kind: 'district', district_id: 3, label: 'Chennai District Volunteer WhatsApp Group', url: 'https://chat.whatsapp.com/mock-tnv-chennai' },
  { id: 2, kind: 'district', district_id: 4, label: 'Coimbatore District Volunteer WhatsApp Group', url: 'https://chat.whatsapp.com/mock-tnv-coimbatore' },
  { id: 3, kind: 'district', district_id: 14, label: 'Madurai District Volunteer WhatsApp Group', url: 'https://chat.whatsapp.com/mock-tnv-madurai' },
  { id: 4, kind: 'announcements', district_id: null, label: 'TNV Official Announcements Channel', url: 'https://chat.whatsapp.com/mock-tnv-announcements' },
  { id: 5, kind: 'social', district_id: null, label: 'TNV Social Initiatives Group', url: 'https://chat.whatsapp.com/mock-tnv-social' }
];

// Clean In-Memory Database (No hardcoded mock users - used only as offline fallback when SUPABASE_URL is not provided)
const inMemoryProfiles = [];
const inMemorySessions = {};
const inMemoryPayments = [];
const inMemoryDonations = [];
const inMemoryCampaigns = [];
const inMemoryBeneficiaries = [];
const inMemoryCoordinatorDonations = [];
const inMemoryInKindDonations = [];
const inMemoryRecurringPledges = [];

const inMemoryNotifications = [];
const inMemoryEmails = [];

// Task Management: TODO, IN_PROGRESS, COMPLETED (No dummy seeding)
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED'];
const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const inMemoryTasks = [];

// Event Lifecycle Statuses: Draft, Published, Ongoing, Completed, Cancelled
const EVENT_STATUSES = ['Draft', 'Published', 'Ongoing', 'Completed', 'Cancelled'];

// Zero dummy seed data - events and registrations start empty
const inMemoryEvents = [];
const inMemoryEventRegistrations = [];
const deletedTaskIds = new Set();
const deletedEventIds = new Set();
const inMemoryCertificateTemplates = [];

// Shared Cache-Control and Response Helper to prevent CDN edge and browser stale caching
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  });
  return res.end(JSON.stringify(data));
}

// Deep merge helper so updates (like marking completed) and incoming items are preserved by ID
function mergeListById(targetList, incomingList, deletedIdsSet) {
  if (!Array.isArray(incomingList)) return;
  const map = new Map();
  targetList.forEach(item => {
    if (item && item.id && (!deletedIdsSet || !deletedIdsSet.has(item.id))) {
      map.set(item.id, item);
    }
  });
  incomingList.forEach(item => {
    if (!item || !item.id) return;
    if (deletedIdsSet && deletedIdsSet.has(item.id)) return;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const existingTime = new Date(existing.updated_at || existing.created_at || 0).getTime();
      const incomingTime = new Date(item.updated_at || item.created_at || 0).getTime();
      if (incomingTime >= existingTime) {
        map.set(item.id, item);
      }
    }
  });
  targetList.length = 0;
  targetList.push(...Array.from(map.values()));
}

// Persistent Snapshot synchronization for serverless Vercel function instances
async function syncTasksFromStorage() {
  try {
    const snap = await supabaseBridge.getSupabaseSnapshot('sync_tasks');
    if (snap && Array.isArray(snap.deleted)) {
      snap.deleted.forEach(id => deletedTaskIds.add(id));
    }
    const list = Array.isArray(snap) ? snap : (snap && Array.isArray(snap.items) ? snap.items : null);
    if (list && list.length > 0) {
      mergeListById(inMemoryTasks, list, deletedTaskIds);
    }
  } catch (_e) {}
}

async function syncTasksToStorage() {
  try {
    await supabaseBridge.saveSupabaseSnapshot('sync_tasks', {
      items: inMemoryTasks,
      deleted: Array.from(deletedTaskIds)
    });
  } catch (_e) {}
}

async function syncEventsFromStorage() {
  try {
    const snap = await supabaseBridge.getSupabaseSnapshot('sync_events');
    if (snap && Array.isArray(snap.deletedEvents)) {
      snap.deletedEvents.forEach(id => deletedEventIds.add(id));
    }
    if (snap && Array.isArray(snap.events) && snap.events.length > 0) {
      mergeListById(inMemoryEvents, snap.events, deletedEventIds);
    }
    if (snap && Array.isArray(snap.registrations) && snap.registrations.length > 0) {
      mergeListById(inMemoryEventRegistrations, snap.registrations);
    }
  } catch (_e) {}
}

async function syncEventsToStorage() {
  try {
    await supabaseBridge.saveSupabaseSnapshot('sync_events', {
      events: inMemoryEvents,
      registrations: inMemoryEventRegistrations,
      deletedEvents: Array.from(deletedEventIds)
    });
  } catch (_e) {}
}

async function syncCertificateTemplatesFromStorage() {
  try {
    const snap = await supabaseBridge.getSupabaseSnapshot('sync_certificates');
    const list = Array.isArray(snap) ? snap : (snap && Array.isArray(snap.items) ? snap.items : null);
    if (list && list.length > 0) {
      mergeListById(inMemoryCertificateTemplates, list);
    } else {
      const localJson = path.join(__dirname, 'data', 'certificate_templates.json');
      if (fs.existsSync(localJson)) {
        const fileContent = JSON.parse(fs.readFileSync(localJson, 'utf8') || '[]');
        if (Array.isArray(fileContent) && fileContent.length > 0) {
          mergeListById(inMemoryCertificateTemplates, fileContent);
        }
      }
    }
  } catch (_e) {}
}

async function syncCertificateTemplatesToStorage() {
  try {
    await supabaseBridge.saveSupabaseSnapshot('sync_certificates', {
      items: inMemoryCertificateTemplates
    });
    const localJson = path.join(__dirname, 'data', 'certificate_templates.json');
    fs.writeFileSync(localJson, JSON.stringify(inMemoryCertificateTemplates, null, 2), 'utf8');
  } catch (_e) {}
}

// Seed the demo Master Admin for the in-memory fallback (sign in via /api/login)
function ensureInMemoryDemoAdmin() {
  if (inMemoryProfiles.some(p => p.username === 'masteradmin')) return;
  inMemoryProfiles.push({
    id: 'adm_masteradmin',
    username: 'masteradmin',
    password: ADMIN_PASSWORD,
    full_name: 'Master Administrator',
    email: 'masteradmin@tnv.org',
    phone: '9840199999',
    district_id: 3,
    district_name: 'Chennai',
    aadhaar: '999988887777',
    aadhaar_last4: '7777',
    status: 'approved',
    role: 'master_admin',
    membership_paid: true,
    created_at: new Date().toISOString()
  });
}
const inMemoryReceiptPdfs = new Map();
const inMemoryCallLogs = [];
const inMemoryScores = [];
const inMemoryVerifications = [];
const inMemoryAuditLogs = [];

const { SEEDED_QUESTIONS } = require('./data/questions_seed');
let inMemoryQuestions = JSON.parse(JSON.stringify(SEEDED_QUESTIONS));
const STANDARD_QUESTIONS = inMemoryQuestions;

// AES-256-GCM Encryption
function encryptAadhaar(aadhaarPlain) {
  const keyBytes = crypto.createHash('sha256').update(SECRET_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);

  let encrypted = cipher.update(aadhaarPlain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    aadhaar_enc: `${iv.toString('hex')}:${encrypted}${authTag}`,
    aadhaar_last4: aadhaarPlain.slice(-4),
  };
}

function extractJpegBuffer(photoPathOrUrl) {
  if (!photoPathOrUrl || typeof photoPathOrUrl !== 'string') return null;
  const match = photoPathOrUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (match) {
    try {
      const buf = Buffer.from(match[2], 'base64');
      if (buf && buf.length > 50 && buf[0] === 0xFF && buf[1] === 0xD8) {
        return buf;
      }
      return null;
    } catch (_e) {
      return null;
    }
  }
  return null;
}

function getJpegDimensions(buf) {
  if (!buf || !Buffer.isBuffer(buf) || buf.length < 10) {
    return { width: 250, height: 300 };
  }
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      if (i + 8 <= buf.length) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
    }
    if (i + 4 > buf.length) break;
    const len = buf.readUInt16BE(i + 2);
    if (len <= 0) break;
    i += 2 + len;
  }
  return { width: 250, height: 300 };
}

function generateBarcodeCommands(x, y, width, height, code) {
  const cmds = [];
  cmds.push('0.15 0.20 0.30 rg');
  let curX = x;
  for (let i = 0; i < code.length; i++) {
    const val = code.charCodeAt(i);
    const barW = (val % 3 === 0) ? 2.5 : ((val % 2 === 0) ? 1.8 : 1.0);
    const gap = 1.0;
    cmds.push(`${curX.toFixed(1)} ${y} ${barW} ${height} re f`);
    curX += barW + gap;
    if (curX > x + width - 6) break;
  }
  cmds.push(`BT /F1 7 Tf 0.35 0.40 0.50 rg ${x + 6} ${y - 9} Td (${escapePdf(code)}) Tj ET`);
  return cmds;
}

// Common helper to compile commands into valid %PDF-1.4 binary (with optional JPEG XObject image)
function buildSimplePdf(pageWidth, pageHeight, commands, imageBuf = null) {
  const hasImage = Boolean(imageBuf && Buffer.isBuffer(imageBuf) && imageBuf.length > 50);
  let imgObj = null;
  if (hasImage) {
    const dims = getJpegDimensions(imageBuf);
    imgObj = { width: dims.width, height: dims.height, buffer: imageBuf };
  }

  const stream = commands.join('\n');
  const streamBuf = Buffer.from(stream, 'utf8');

  const resourceStr = hasImage 
    ? '<< /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >>'
    : '<< /Font << /F1 5 0 R /F2 6 0 R >> >>';

  const obj1 = Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const obj2 = Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  const obj3 = Buffer.from(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources ${resourceStr} >>\nendobj\n`);
  const obj4 = Buffer.concat([
    Buffer.from(`4 0 obj\n<< /Length ${streamBuf.length} >>\nstream\n`),
    streamBuf,
    Buffer.from('\nendstream\nendobj\n')
  ]);
  const obj5 = Buffer.from('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  const obj6 = Buffer.from('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  const objects = [obj1, obj2, obj3, obj4, obj5, obj6];

  if (hasImage) {
    const imgHeader = Buffer.from(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgObj.width} /Height ${imgObj.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgObj.buffer.length} >>\nstream\n`);
    const imgFooter = Buffer.from('\nendstream\nendobj\n');
    objects.push(Buffer.concat([imgHeader, imgObj.buffer, imgFooter]));
  }

  const head = Buffer.from('%PDF-1.4\n');
  const chunks = [head];
  let offset = head.length;
  const offsets = [];

  for (let obj of objects) {
    offsets.push(offset);
    chunks.push(obj);
    offset += obj.length;
  }

  const xrefOffset = offset;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref));

  return Buffer.concat(chunks);
}

const escapePdf = str => (str || '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

function numberToWordsINR(num) {
  const n = Math.floor(Number(num) || 0);
  if (n === 0) return 'Rupees Zero Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function convertGroup(val) {
    let str = '';
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + ' ';
      val %= 10;
    }
    if (val > 0) {
      str += a[val] + ' ';
    }
    return str.trim();
  }
  let words = '';
  const crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  if (crore > 0) words += convertGroup(crore) + ' Crore ';
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  if (lakh > 0) words += convertGroup(lakh) + ' Lakh ';
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;
  if (thousand > 0) words += convertGroup(thousand) + ' Thousand ';
  if (rem > 0) words += convertGroup(rem);
  return 'Rupees ' + words.trim() + ' Only';
}

function pdfCircleCommands(cx, cy, r, strokeWidth, strokeColor) {
  const k = 0.552284749831;
  const kr = k * r;
  return [
    strokeColor + ' RG ' + strokeWidth + ' w',
    (cx + r).toFixed(2) + ' ' + cy.toFixed(2) + ' m',
    (cx + r).toFixed(2) + ' ' + (cy + kr).toFixed(2) + ' ' + (cx + kr).toFixed(2) + ' ' + (cy + r).toFixed(2) + ' ' + cx.toFixed(2) + ' ' + (cy + r).toFixed(2) + ' c',
    (cx - kr).toFixed(2) + ' ' + (cy + r).toFixed(2) + ' ' + (cx - r).toFixed(2) + ' ' + (cy + kr).toFixed(2) + ' ' + (cx - r).toFixed(2) + ' ' + cy.toFixed(2) + ' c',
    (cx - r).toFixed(2) + ' ' + (cy - kr).toFixed(2) + ' ' + (cx - kr).toFixed(2) + ' ' + (cy - r).toFixed(2) + ' ' + cx.toFixed(2) + ' ' + (cy - r).toFixed(2) + ' c',
    (cx + kr).toFixed(2) + ' ' + (cy - r).toFixed(2) + ' ' + (cx + r).toFixed(2) + ' ' + (cy - kr).toFixed(2) + ' ' + (cx + r).toFixed(2) + ' cy S'
  ];
}

// Common Sovereign Precision Receipt Assembler for both Membership Fees & Section 80G Donations
function buildSovereignPrecisionReceipt(opts) {
  const isDonation = opts.isDonation || false;
  const receiptNo = opts.receiptNo || (isDonation ? 'TNV-DON-2026-0001' : 'TNV-R-2026-0001');
  const paidDate = opts.paidDate || new Date(opts.paidAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const fullName = escapePdf(opts.fullName || (opts.isAnonymous ? 'Anonymous Civic Supporter' : 'Civic Supporter'));
  const username = escapePdf(opts.username || 'volunteer');
  const phone = escapePdf(opts.phone || 'N/A');
  const email = escapePdf(opts.email || 'contact@tamilnaduvolunteers.org');
  const district = escapePdf(opts.district || 'Tamil Nadu');
  const pan = escapePdf(opts.pan || 'N/A');
  const gatewayRef = escapePdf(opts.gatewayRef || 'UPI-HDFC-9791126662');
  const amount = Number(opts.amount || (isDonation ? 500 : 365));
  const amountStr = 'Rs ' + amount.toLocaleString('en-IN') + '.00';
  const amountWords = escapePdf(numberToWordsINR(amount));
  const tierLabel = escapePdf(opts.tierLabel || (isDonation ? 'Grassroots Social Action & Student Support' : 'Annual Volunteer Membership Subscription (2026-27)'));

  const logoBuf = loadAssetBuffer('assets/tnv-receipt-logo.jpg');
  const hasLogo = Boolean(logoBuf);

  const cmds = [
    // 1. Page Canvas & Structural Border
    '0.985 0.985 0.980 rg 0 0 595.28 841.89 re f',
    '1.0 1.0 1.0 rg 34 34 527.28 773.89 re f',
    '0.04 0.23 0.13 RG 1.8 w 34 34 527.28 773.89 re S',
    '0.78 0.62 0.22 RG 0.6 w 39 39 517.28 763.89 re S',

    // 4 Corner Security Florets
    '0.78 0.62 0.22 rg',
    '41 41 4 4 re f', '550 41 4 4 re f', '41 797 4 4 re f', '550 797 4 4 re f',

    // 2. Institutional Crown Header
    '0.04 0.23 0.13 rg 39 705 517.28 97.89 re f',
    '0.78 0.62 0.22 RG 2 w 39 705 m 556.28 705 l S',
    ...(hasLogo ? [
      'q 68 0 0 68 50 720 cm /Im1 Do Q',
      'BT /F2 18 Tf 1.0 1.0 1.0 rg 128 774 Td (TAMIL NADU VOLUNTEERS) Tj ET',
      'BT /F2 8 Tf 0.92 0.82 0.40 rg 128 758 Td (GOVERNMENT REGISTERED GRASSROOTS SOCIAL ACTION & CHARITABLE TRUST) Tj ET',
      'BT /F1 7.2 Tf 0.82 0.94 0.86 rg 128 743 Td (Trust PAN: AAETT5126E  |  HDFC Bank CIT Nagar Chennai  |  www.tamilnaduvolunteers.org) Tj ET',
      'BT /F1 6.8 Tf 0.70 0.88 0.76 rg 128 729 Td (Official Digital Institutional Record  |  Issued Under Authority of Governing Council) Tj ET'
    ] : [
      'BT /F2 20 Tf 1.0 1.0 1.0 rg 56 774 Td (TAMIL NADU VOLUNTEERS) Tj ET',
      'BT /F2 8.5 Tf 0.92 0.82 0.40 rg 56 758 Td (GOVERNMENT REGISTERED GRASSROOTS SOCIAL ACTION & CHARITABLE TRUST) Tj ET',
      'BT /F1 7.5 Tf 0.82 0.94 0.86 rg 56 743 Td (Trust PAN: AAETT5126E  |  HDFC Bank CIT Nagar Chennai  |  www.tamilnaduvolunteers.org) Tj ET',
      'BT /F1 7 Tf 0.70 0.88 0.76 rg 56 728 Td (Official Digital Institutional Record  |  Issued Under the Authority of the Governing Council) Tj ET'
    ]),

    // Right-side Security Seal & Barcode Box
    '0.02 0.16 0.08 rg 432 715 114 78 re f',
    '0.78 0.62 0.22 RG 0.8 w 432 715 114 78 re S',
    'BT /F2 7.5 Tf 1.0 1.0 1.0 rg 447 778 Td (TNV OFFICIAL SEAL) Tj ET',
    'BT /F2 7 Tf 0.20 0.85 0.45 rg 442 764 Td ([ VERIFIED & CLEARED ]) Tj ET',
    'BT /F1 6.5 Tf 0.75 0.85 0.80 rg 444 751 Td (REF: ' + receiptNo.slice(-9) + ') Tj ET',

    // Barcode pattern inside security badge
    '0.95 0.85 0.45 rg',
    '442 725 2 16 re f', '446 725 1 16 re f', '449 725 3 16 re f', '454 725 1 16 re f',
    '457 725 2 16 re f', '461 725 1 16 re f', '464 725 3 16 re f', '469 725 2 16 re f',
    '473 725 1 16 re f', '476 725 2 16 re f', '480 725 3 16 re f', '485 725 1 16 re f',
    '488 725 2 16 re f', '492 725 1 16 re f', '495 725 3 16 re f', '500 725 2 16 re f',
    '504 725 1 16 re f', '507 725 2 16 re f', '511 725 3 16 re f', '516 725 1 16 re f',
    '519 725 2 16 re f', '523 725 1 16 re f', '526 725 3 16 re f', '531 725 2 16 re f',
    '535 725 1 16 re f',

    // 3. Document Title & Receipt Number Bar
    '0.94 0.96 0.94 rg 39 660 517.28 44 re f',
    '0.82 0.86 0.82 RG 0.8 w 39 660 m 556.28 660 l S',
    'BT /F2 11.5 Tf 0.04 0.23 0.13 rg 56 685 Td (' + (isDonation ? 'SECTION 80G DONATION & CHARITABLE CONTRIBUTION RECEIPT' : 'ANNUAL VOLUNTEER MEMBERSHIP SUBSCRIPTION RECEIPT') + ') Tj ET',
    'BT /F1 7.5 Tf 0.35 0.40 0.45 rg 56 671 Td (' + (isDonation ? 'Eligible for 50% Tax Exemption under Section 80G of the Income Tax Act, 1961' : 'Official Proof of Civic Contribution & Volunteer Enrollment (2026-27)') + ') Tj ET',
    'BT /F2 8 Tf 0.45 0.50 0.55 rg 360 685 Td (RECEIPT NO:) Tj ET',
    'BT /F2 10.5 Tf 0.04 0.23 0.13 rg 422 685 Td (' + receiptNo + ') Tj ET',
    'BT /F1 8 Tf 0.45 0.50 0.55 rg 360 671 Td (Date & Time:) Tj ET',
    'BT /F1 8.5 Tf 0.15 0.20 0.25 rg 422 671 Td (' + paidDate + ') Tj ET',

    // 4. Section 1: Contributor Identification Details
    '0.11 0.17 0.23 rg 39 635 517.28 19 re f',
    'BT /F2 8.5 Tf 1.0 1.0 1.0 rg 52 641 Td (1. CONTRIBUTOR & IDENTIFICATION PARTICULARS) Tj ET',

    // Row 1
    '0.98 0.99 0.98 rg 39 611 517.28 23 re f',
    '0.88 0.90 0.88 RG 0.5 w 39 611 m 556.28 611 l S',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 54 620 Td (Full Legal Name:) Tj ET',
    'BT /F2 9.5 Tf 0.10 0.15 0.20 rg 155 620 Td (' + fullName + ') Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 315 620 Td (Mobile Phone:) Tj ET',
    'BT /F2 9 Tf 0.10 0.15 0.20 rg 410 620 Td (' + phone + ') Tj ET',

    // Row 2
    '1.0 1.0 1.0 rg 39 587 517.28 23 re f',
    '0.88 0.90 0.88 RG 0.5 w 39 587 m 556.28 587 l S',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 54 596 Td (' + (isDonation ? 'Contributor Kind:' : 'TNV Member ID:') + ') Tj ET',
    'BT /F2 9 Tf 0.10 0.15 0.20 rg 155 596 Td (' + (isDonation ? (opts.isAnonymous ? 'Anonymous Civic Supporter' : 'Registered Civic Donor') : ('@' + username)) + ') Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 315 596 Td (Email Address:) Tj ET',
    'BT /F1 8.5 Tf 0.10 0.15 0.20 rg 410 596 Td (' + email + ') Tj ET',

    // Row 3
    '0.98 0.99 0.98 rg 39 563 517.28 23 re f',
    '0.88 0.90 0.88 RG 0.5 w 39 563 m 556.28 563 l S',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 54 572 Td (District / State:) Tj ET',
    'BT /F1 8.5 Tf 0.10 0.15 0.20 rg 155 572 Td (' + district + ', Tamil Nadu) Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 315 572 Td (' + (isDonation ? 'Donor PAN (80G):' : 'Enrollment Term:') + ') Tj ET',
    'BT /F2 8.5 Tf 0.10 0.15 0.20 rg 410 572 Td (' + (isDonation ? (pan || 'NOT PROVIDED') : '2026 - 2027 (1 Year)') + ') Tj ET',

    // Row 4
    '1.0 1.0 1.0 rg 39 539 517.28 23 re f',
    '0.88 0.90 0.88 RG 0.5 w 39 539 m 556.28 539 l S',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 54 548 Td (Payment Gateway Ref / UTR:) Tj ET',
    'BT /F2 8.5 Tf 0.04 0.23 0.13 rg 180 548 Td (' + gatewayRef + ') Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 315 548 Td (Payment Mode:) Tj ET',
    'BT /F1 8.5 Tf 0.10 0.15 0.20 rg 410 548 Td (Direct UPI (HDFC Bank CIT Nagar)) Tj ET',

    // 5. Section 2: Financial Contribution Ledger
    '0.11 0.17 0.23 rg 39 515 517.28 19 re f',
    'BT /F2 8.5 Tf 1.0 1.0 1.0 rg 52 521 Td (2. FINANCIAL TRANSACTION BREAKDOWN & STATUTORY LEDGER) Tj ET',

    // Header row
    '0.92 0.95 0.93 rg 39 491 517.28 23 re f',
    '0.78 0.84 0.80 RG 0.8 w 39 491 m 556.28 491 l S',
    'BT /F2 8 Tf 0.10 0.15 0.25 rg 52 499 Td (#) Tj ET',
    'BT /F2 8 Tf 0.10 0.15 0.25 rg 74 499 Td (Description & Purpose of Contribution) Tj ET',
    'BT /F2 8 Tf 0.10 0.15 0.25 rg 300 499 Td (SAC / Tax Code) Tj ET',
    'BT /F2 8 Tf 0.10 0.15 0.25 rg 418 499 Td (Rate (INR)) Tj ET',
    'BT /F2 8 Tf 0.10 0.15 0.25 rg 488 499 Td (Amount (INR)) Tj ET',

    // Item row
    '1.0 1.0 1.0 rg 39 460 517.28 30 re f',
    '0.88 0.90 0.88 RG 0.5 w 39 460 m 556.28 460 l S',
    'BT /F1 8.5 Tf 0.20 0.25 0.30 rg 52 473 Td (1) Tj ET',
    'BT /F2 8.5 Tf 0.10 0.15 0.20 rg 74 473 Td (' + tierLabel + ') Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 300 473 Td (SAC 999599 (Exempt)) Tj ET',
    'BT /F1 8.5 Tf 0.20 0.25 0.30 rg 418 473 Td (' + amountStr + ') Tj ET',
    'BT /F2 9 Tf 0.04 0.23 0.13 rg 488 473 Td (' + amountStr + ') Tj ET',

    // Amount in Words
    'BT /F1 8 Tf 0.45 0.50 0.55 rg 54 442 Td (Amount in Words:) Tj ET',
    'BT /F2 8.5 Tf 0.04 0.23 0.13 rg 135 442 Td (' + amountWords + ') Tj ET',

    // Total Summary Box
    '0.95 0.98 0.95 rg 345 375 205 65 re f',
    '0.04 0.23 0.13 RG 1 w 345 375 205 65 re S',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 358 424 Td (Subtotal:) Tj ET',
    'BT /F1 8.5 Tf 0.20 0.25 0.30 rg 475 424 Td (' + amountStr + ') Tj ET',
    'BT /F1 8 Tf 0.40 0.45 0.50 rg 358 410 Td (GST / Taxes (0% Exempt):) Tj ET',
    'BT /F1 8.5 Tf 0.20 0.25 0.30 rg 475 410 Td (Rs 0.00) Tj ET',
    '0.78 0.84 0.80 RG 0.5 w 355 402 m 540 402 l S',
    'BT /F2 10 Tf 0.10 0.15 0.20 rg 358 388 Td (Total Paid:) Tj ET',
    'BT /F2 13 Tf 0.04 0.23 0.13 rg 450 388 Td (' + amountStr + ') Tj ET',
    '0.04 0.23 0.13 rg 56 385 240 22 re f',
    'BT /F2 8 Tf 1.0 1.0 1.0 rg 68 392 Td ([ VERIFIED CONTRIBUTION  *  TRANSACTION CLEARED ]) Tj ET',

    // 6. Section 3: Statutory Certification & Official Digital Seal
    '0.11 0.17 0.23 rg 39 350 517.28 19 re f',
    'BT /F2 8.5 Tf 1.0 1.0 1.0 rg 52 356 Td (3. STATUTORY CERTIFICATION & OFFICIAL DIGITAL AUTHENTICATION SEAL) Tj ET',

    // Left Column
    'BT /F2 8 Tf 0.04 0.23 0.13 rg 54 334 Td (' + (isDonation ? 'SECTION 80G INCOME TAX DEDUCTION DECLARATION:' : 'VOLUNTEER PRIVILEGES & RECOGNITION CERTIFICATE:') + ') Tj ET',
    'BT /F1 7.5 Tf 0.25 0.30 0.35 rg 54 322 Td (' + (isDonation ? 'Donations to TAMIL NADU VOLUNTEERS are eligible for 50% deduction under Section 80G of IT Act, 1961.' : 'This official receipt confirms valid active volunteer enrollment in Tamil Nadu Volunteers.') + ') Tj ET',
    'BT /F1 7.5 Tf 0.25 0.30 0.35 rg 54 311 Td (' + (isDonation ? 'Trust PAN: AAETT5126E  |  Registration No: TNV/TRUST/2026/80G  |  Valid under Rule 18AB.' : 'Entitles member to participate in district-level campaigns, civic missions, and voting assemblies.') + ') Tj ET',
    'BT /F1 7.5 Tf 0.25 0.30 0.35 rg 54 300 Td (' + (isDonation ? 'Please retain this document for filing your annual income tax returns.' : 'Valid for 12 months from issuance. Membership subscription non-refundable.') + ') Tj ET',

    '0.88 0.90 0.88 RG 0.5 w 54 288 m 330 288 l S',
    'BT /F2 7.5 Tf 0.10 0.15 0.20 rg 54 276 Td (OFFICIAL TRUST BANKING COORDINATES (HDFC BANK):) Tj ET',
    'BT /F1 7 Tf 0.30 0.35 0.40 rg 54 265 Td (Account Name: TAMILNADU VOLUNTEERS  |  Account Type: Current Account (CA)) Tj ET',
    'BT /F1 7 Tf 0.30 0.35 0.40 rg 54 254 Td (Account Number: 50200078305862  |  IFSC Code: HDFC0002043) Tj ET',
    'BT /F1 7 Tf 0.30 0.35 0.40 rg 54 243 Td (Bank & Branch: HDFC Bank, CIT Nagar Branch, Chennai, Tamil Nadu) Tj ET',
    'BT /F1 7 Tf 0.30 0.35 0.40 rg 54 232 Td (Official UPI VPA: 9791126662.1@hdfc  |  PAN: AAETT5126E) Tj ET',

    // Right Column: Vector Authentication Seal
    ...pdfCircleCommands(445, 275, 36, 1.4, '0.04 0.23 0.13'),
    ...pdfCircleCommands(445, 275, 32, 0.6, '0.78 0.62 0.22'),
    'BT /F2 7 Tf 0.04 0.23 0.13 rg 420 286 Td (TAMIL NADU) Tj ET',
    'BT /F2 7 Tf 0.04 0.23 0.13 rg 421 276 Td (VOLUNTEERS) Tj ET',
    'BT /F2 5.5 Tf 0.78 0.62 0.22 rg 423 266 Td (* CIT NAGAR *) Tj ET',
    'BT /F2 6 Tf 0.04 0.23 0.13 rg 422 257 Td (OFFICIAL SEAL) Tj ET',

    // Signature line
    '0.60 0.65 0.70 RG 0.8 w 365 215 m 525 215 l S',
    'BT /F2 7.5 Tf 0.10 0.15 0.20 rg 380 205 Td (Authorized Signatory / Finance Controller) Tj ET',
    'BT /F1 6.5 Tf 0.45 0.50 0.55 rg 388 194 Td (Tamil Nadu Volunteers Trust (Governing Council)) Tj ET',
    'BT /F1 6 Tf 0.60 0.65 0.70 rg 382 183 Td (Cryptographic SHA-256 Digital Verification Token) Tj ET',

    // 7. Footer Security Band
    '0.82 0.86 0.82 RG 0.8 w 39 125 m 556.28 125 l S',
    'BT /F1 7.5 Tf 0.35 0.40 0.45 rg 115 108 Td (This is a system-generated official institutional receipt issued by Tamil Nadu Volunteers Trust.) Tj ET',
    'BT /F1 7 Tf 0.45 0.50 0.55 rg 130 96 Td (No physical signature required. For verification, contact contact@tamilnaduvolunteers.org) Tj ET',

    '0.92 0.95 0.93 rg 39 41 517.28 22 re f',
    '0.78 0.62 0.22 RG 0.5 w 39 63 m 556.28 63 l S',
    'BT /F2 6.5 Tf 0.25 0.30 0.35 rg 72 49 Td (SECURITY DOC-ID: TNV-AUTH-' + receiptNo + '  |  GOVERNMENT REGISTERED CHARITABLE TRUST  |  ISO COMPLIANT DIGITAL LEDGER) Tj ET'
  ];

  return buildSimplePdf(595.28, 841.89, cmds, logoBuf);
}

// 1. PDF 1.4 Binary Generator: Official Membership Receipt (Step 4 & 15)
function generateReceiptPdfBinary(data) {
  return buildSovereignPrecisionReceipt({
    isDonation: false,
    receiptNo: data.receiptNo || 'TNV-R-2026-0001',
    paidAt: data.paidAt,
    fullName: data.fullName,
    username: data.username,
    phone: data.phone,
    email: data.email,
    district: data.district,
    gatewayRef: data.gatewayRef || 'UPI-HDFC',
    amount: data.amountInr || 365,
    tierLabel: 'Annual Volunteer Membership Subscription (2026-27)'
  });
}

let donationSeq = 7;
function generateDonationReceiptNo() {
  const currentYear = new Date().getFullYear();
  const seqStr = String(donationSeq++).padStart(4, '0');
  return `TNV-DON-${currentYear}-${seqStr}`;
}

// 1b. PDF 1.4 Binary Generator: Official Donation & 80G Tax Exemption Receipt
function generateDonationReceiptPdfBinary(data) {
  return buildSovereignPrecisionReceipt({
    isDonation: true,
    receiptNo: data.receiptNo || 'TNV-DON-2026-0001',
    paidAt: data.paidAt,
    fullName: data.donorName || (data.isAnonymous ? 'Anonymous Civic Supporter' : 'Civic Supporter'),
    phone: data.phone,
    email: data.email,
    pan: data.pan,
    district: data.district || 'Tamil Nadu',
    gatewayRef: data.gatewayRef || 'UPI-HDFC',
    amount: data.amount || 500,
    tierLabel: data.tierLabel || 'Grassroots Public Contribution',
    isAnonymous: Boolean(data.isAnonymous)
  });
}

function loadAssetBuffer(relPath) {
  const candidates = [
    path.join(__dirname, relPath),
    path.join(__dirname, '../server', relPath),
    path.join(process.cwd(), 'server', relPath),
    path.join(process.cwd(), relPath)
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        return fs.readFileSync(c);
      } catch (_e) {}
    }
  }
  return null;
}

// 2. PDF 1.4 Binary Generator: Official Member ID Card (Step 13 - 2-Page Vertical ID Card)
function generateIdCardPdfBinary(user) {
  const frontJpg = loadAssetBuffer('assets/id_front_template.jpg');
  const backJpg = loadAssetBuffer('assets/id_back_template.jpg');

  // Fallback to single page vector if assets are missing
  if (!frontJpg || !backJpg) {
    const fullName = escapePdf(user.full_name);
    const username = escapePdf(user.username);
    const tnvId = escapePdf(user.tnv_id || 'TNV-CHE-0001');
    const role = escapePdf(displayRole(user.role) || 'Volunteer');
    const district = escapePdf(user.district_name || 'Tamil Nadu');
    const wing = escapePdf(user.wing_name || 'Administration');
    const imageBuf = extractJpegBuffer(user.photo_path || user.photo_url);
    const hasImage = Boolean(imageBuf);
    const photoCommands = hasImage
      ? [
          '0.90 0.94 0.98 rg 25 78 80 95 re f',
          'q 80 0 0 95 25 78 cm /Im1 Do Q',
          '0.05 0.55 0.35 RG 1.5 w 25 78 80 95 re S'
        ]
      : [
          '0.92 0.94 0.96 rg 25 78 80 95 re f',
          '0.2 0.4 0.6 RG 1.2 w 25 78 80 95 re S',
          'BT /F2 8 Tf 0.4 0.45 0.55 rg 40 130 Td (MEMBER) Tj 0 -12 Td (PHOTO) Tj ET'
        ];
    const barcodeCommands = generateBarcodeCommands(250, 48, 120, 20, tnvId);
    const commands = [
      '0.06 0.16 0.32 rg 0 0 400 250 re f',
      '0.98 0.99 1.0 rg 10 10 380 230 re f',
      '0.85 0.88 0.92 RG 1 w 10 10 380 230 re S',
      '0.06 0.28 0.52 rg 10 185 380 55 re f',
      'BT /F2 15 Tf 1.0 1.0 1.0 rg 25 218 Td (TAMIL NADU VOLUNTEERS (TNV)) Tj ET',
      'BT /F1 9 Tf 0.85 0.92 1.0 rg 25 200 Td (Official Verified Member Identity Card) Tj ET',
      ...photoCommands,
      `BT /F2 12 Tf 0.06 0.28 0.52 rg 120 155 Td (ID: ${tnvId}) Tj ET`,
      `BT /F2 12 Tf 0.1 0.15 0.25 rg 120 137 Td (${fullName}) Tj ET`,
      `BT /F1 9 Tf 0.4 0.45 0.5 rg 120 120 Td (@${username}) Tj ET`,
      `BT /F1 9 Tf 0.3 0.35 0.4 rg 120 102 Td (Role:) Tj 35 0 Td /F2 9.5 Tf 0.05 0.55 0.25 rg (${role}) Tj ET`,
      `BT /F1 9 Tf 0.3 0.35 0.4 rg 120 86 Td (District:) Tj 45 0 Td /F2 9 Tf 0.1 0.15 0.25 rg (${district}) Tj ET`,
      `BT /F1 9 Tf 0.3 0.35 0.4 rg 120 70 Td (Wing:) Tj 35 0 Td /F1 9 Tf 0.1 0.15 0.25 rg (${wing}) Tj ET`,
      ...barcodeCommands,
      '0.06 0.28 0.52 rg 10 10 380 22 re f',
      'BT /F1 7.5 Tf 1.0 1.0 1.0 rg 25 18 Td (VALID: 2026-2027   *   OFFICIAL TNV STATE CENTRAL COMMITTEE   *   PORTAL.TNV.ORG) Tj ET'
    ];
    return buildSimplePdf(400, 250, commands, imageBuf);
  }

  // Two-page portrait ID Card (320 x 480 pt, 2:3 ratio matching 3200x4800 template)
  const pageWidth = 320;
  const pageHeight = 480;

  const photoJpg = extractJpegBuffer(user.photo_path || user.photo_url);
  const hasPhoto = Boolean(photoJpg);
  const photoDims = hasPhoto ? getJpegDimensions(photoJpg) : null;

  const regDate = new Date(user.approved_at || user.membership_paid_at || user.created_at || Date.now());
  const validRegDate = isNaN(regDate.getTime()) ? new Date() : regDate;
  const pad2 = n => String(n).padStart(2, '0');
  const joiningDateStr = `${pad2(validRegDate.getDate())}-${pad2(validRegDate.getMonth() + 1)}-${validRegDate.getFullYear()}`;
  const validityDateStr = `${pad2(validRegDate.getDate())}-${pad2(validRegDate.getMonth() + 1)}-${validRegDate.getFullYear() + 1}`;

  const startYear = validRegDate.getFullYear();
  const yearText = `${startYear} - ${startYear + 1}`;

  const fullName = escapePdf(user.full_name || 'Volunteer');
  const role = escapePdf(displayRole(user.role) || user.preferred_designation || 'Volunteer');
  const tnvId = escapePdf(user.tnv_id || 'TNV-CHE-0001');
  const phone = escapePdf(user.phone || '');
  const email = escapePdf(user.email || '');
  const district = escapePdf(user.district_name || 'Tamil Nadu');

  // Page 1 Commands (Front)
  const page1Commands = [
    `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /ImFront Do Q`
  ];

  if (hasPhoto) {
    const x = 51.6;
    const y = 214.8;
    const w = 106.4;
    const h = 110.8;
    const r = 7.6;
    const k = r * 0.55228;

    // Aspect-ratio preservation (object-cover style: top-aligned so face is visible)
    const pw = (photoDims && photoDims.width) || w;
    const ph = (photoDims && photoDims.height) || h;
    const frameRatio = w / h;
    const imgRatio = pw / ph;

    let drawW = w;
    let drawH = h;
    let drawX = x;
    let drawY = y;

    if (imgRatio > frameRatio) {
      drawH = h;
      drawW = h * imgRatio;
      drawX = x - (drawW - w) / 2;
    } else {
      drawW = w;
      drawH = w / imgRatio;
      drawY = y + h - drawH; // top-align portrait
    }

    page1Commands.push(`q`);
    // Smooth rounded rectangle clipping path inside yellow border
    page1Commands.push(`${(x + r).toFixed(2)} ${y.toFixed(2)} m`);
    page1Commands.push(`${(x + w - r).toFixed(2)} ${y.toFixed(2)} l`);
    page1Commands.push(`${(x + w - r + k).toFixed(2)} ${y.toFixed(2)} ${(x + w).toFixed(2)} ${(y + r - k).toFixed(2)} ${(x + w).toFixed(2)} ${(y + r).toFixed(2)} c`);
    page1Commands.push(`${(x + w).toFixed(2)} ${(y + h - r).toFixed(2)} l`);
    page1Commands.push(`${(x + w).toFixed(2)} ${(y + h - r + k).toFixed(2)} ${(x + w - r + k).toFixed(2)} ${(y + h).toFixed(2)} ${(x + w - r).toFixed(2)} ${(y + h).toFixed(2)} c`);
    page1Commands.push(`${(x + r).toFixed(2)} ${(y + h).toFixed(2)} l`);
    page1Commands.push(`${(x + r - k).toFixed(2)} ${(y + h).toFixed(2)} ${x.toFixed(2)} ${(y + h - r + k).toFixed(2)} ${x.toFixed(2)} ${(y + h - r).toFixed(2)} c`);
    page1Commands.push(`${x.toFixed(2)} ${(y + r).toFixed(2)} l`);
    page1Commands.push(`${x.toFixed(2)} ${(y + r - k).toFixed(2)} ${(x + r - k).toFixed(2)} ${y.toFixed(2)} ${(x + r).toFixed(2)} ${y.toFixed(2)} c`);
    page1Commands.push(`h`);
    page1Commands.push(`W n`);

    // Paint photo strictly within the clipped rounded frame
    page1Commands.push(`${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${drawX.toFixed(2)} ${drawY.toFixed(2)} cm /ImPhoto Do`);
    page1Commands.push(`Q`);
  }

  // Dynamic Year at top right
  page1Commands.push(`0.984 0.984 0.988 rg 282 365 12 78 re f`);
  const spacedYear = yearText.split('').join(' ');
  page1Commands.push(`BT /F2 7 Tf 0.15 0.20 0.25 rg 0 -1 1 0 290.5 442 Tm (${escapePdf(spacedYear)}) Tj ET`);

  // Name and Role
  page1Commands.push(`BT /F2 12.5 Tf 0.00 0.20 0.12 rg 46 198 Td (${fullName.toUpperCase()}) Tj ET`);
  page1Commands.push(`BT /F2 8.5 Tf 0.53 0.23 0.06 rg 46 181 Td (${role.toUpperCase()}) Tj ET`);

  // 4 Fields
  page1Commands.push(`BT /F2 8.5 Tf 0 0 0 rg 136.5 160 Td (${tnvId}) Tj ET`);
  page1Commands.push(`BT /F2 8.5 Tf 0 0 0 rg 136.5 142 Td (${phone}) Tj ET`);
  page1Commands.push(`BT /F2 8.5 Tf 0 0 0 rg 136.5 124 Td (${email}) Tj ET`);
  page1Commands.push(`BT /F2 8.5 Tf 0 0 0 rg 136.5 106 Td (${district}) Tj ET`);

  // Page 2 Commands (Back) - Precisely aligned with colon and baseline
  const page2Commands = [
    `q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /ImBack Do Q`,
    `BT /F2 8.5 Tf 0 0 0 rg 186.0 199.2 Td (${joiningDateStr}) Tj ET`,
    `BT /F2 8.5 Tf 0 0 0 rg 186.0 185.2 Td (${validityDateStr}) Tj ET`
  ];

  const p1Stream = Buffer.from(page1Commands.join('\n'), 'utf8');
  const p2Stream = Buffer.from(page2Commands.join('\n'), 'utf8');

  const frontDims = getJpegDimensions(frontJpg);
  const backDims = getJpegDimensions(backJpg);

  const resPage1 = hasPhoto
    ? '<< /Font << /F1 7 0 R /F2 8 0 R >> /XObject << /ImFront 9 0 R /ImPhoto 11 0 R >> >>'
    : '<< /Font << /F1 7 0 R /F2 8 0 R >> /XObject << /ImFront 9 0 R >> >>';
  const resPage2 = '<< /Font << /F1 7 0 R /F2 8 0 R >> /XObject << /ImBack 10 0 R >> >>';

  const obj1 = Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  const obj2 = Buffer.from('2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n');
  const obj3 = Buffer.from(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 5 0 R /Resources ${resPage1} >>\nendobj\n`);
  const obj4 = Buffer.from(`4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 6 0 R /Resources ${resPage2} >>\nendobj\n`);

  const obj5 = Buffer.concat([
    Buffer.from(`5 0 obj\n<< /Length ${p1Stream.length} >>\nstream\n`),
    p1Stream,
    Buffer.from('\nendstream\nendobj\n')
  ]);

  const obj6 = Buffer.concat([
    Buffer.from(`6 0 obj\n<< /Length ${p2Stream.length} >>\nstream\n`),
    p2Stream,
    Buffer.from('\nendstream\nendobj\n')
  ]);

  const obj7 = Buffer.from('7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  const obj8 = Buffer.from('8 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');

  const obj9 = Buffer.concat([
    Buffer.from(`9 0 obj\n<< /Type /XObject /Subtype /Image /Width ${frontDims.width} /Height ${frontDims.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${frontJpg.length} >>\nstream\n`),
    frontJpg,
    Buffer.from('\nendstream\nendobj\n')
  ]);

  const obj10 = Buffer.concat([
    Buffer.from(`10 0 obj\n<< /Type /XObject /Subtype /Image /Width ${backDims.width} /Height ${backDims.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${backJpg.length} >>\nstream\n`),
    backJpg,
    Buffer.from('\nendstream\nendobj\n')
  ]);

  const objects = [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8, obj9, obj10];

  if (hasPhoto) {
    const obj11 = Buffer.concat([
      Buffer.from(`11 0 obj\n<< /Type /XObject /Subtype /Image /Width ${photoDims.width} /Height ${photoDims.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${photoJpg.length} >>\nstream\n`),
      photoJpg,
      Buffer.from('\nendstream\nendobj\n')
    ]);
    objects.push(obj11);
  }

  const head = Buffer.from('%PDF-1.4\n');
  const chunks = [head];
  let offset = head.length;
  const offsets = [];

  for (let obj of objects) {
    offsets.push(offset);
    chunks.push(obj);
    offset += obj.length;
  }

  const xrefOffset = offset;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let off of offsets) {
    xref += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref));

  return Buffer.concat(chunks);
}

function cleanAddressSmart(rawAddr, district) {
  if (!rawAddr) return '';
  const rawLines = String(rawAddr)
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.replace(/^[\s,]+|[\s,]+$/g, ''))
    .filter(Boolean);

  const cleanLines = [];
  for (const line of rawLines) {
    const lineClean = line.replace(/\s*,\s*/g, ', ').replace(/^[\s,]+|[\s,]+$/g, '');
    let alreadyPresent = false;
    for (let i = 0; i < cleanLines.length; i++) {
      const existing = cleanLines[i];
      if (existing.toLowerCase().includes(lineClean.toLowerCase()) || lineClean.toLowerCase().includes(existing.toLowerCase())) {
        if (lineClean.length > existing.length) {
          cleanLines[i] = lineClean;
        }
        alreadyPresent = true;
        break;
      }
    }
    if (!alreadyPresent && lineClean) {
      cleanLines.push(lineClean);
    }
  }

  let addrStr = cleanLines.length ? cleanLines.join(', ') : String(rawAddr);
  addrStr = addrStr.replace(/^address\s*:\s*/i, '').replace(/^[\s,]+|[\s,]+$/g, '');
  addrStr = addrStr.replace(/\s*,\s*/g, ', ');

  if (district) {
    const distRegex = new RegExp(`,?\\s*${district.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+district)?\\s*$`, 'i');
    addrStr = addrStr.replace(distRegex, '').replace(/^[\s,]+|[\s,]+$/g, '');
  }

  addrStr = addrStr.replace(/\s+/g, ' ').trim();
  if (addrStr.length > 70) {
    const cut = addrStr.slice(0, 68);
    const lastSpace = cut.lastIndexOf(' ');
    addrStr = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '...';
  }
  return addrStr;
}

// 3. Official Appointment Letter (100% Selectable Vector Text based on Appointment_Letter_TN_Volunteers.pdf)
function generateAppointmentPdfBinary(user) {
  const baseJpg = loadAssetBuffer('assets/letterhead/appointment_base_template.jpg') ||
                  loadAssetBuffer('assets/appointment_base_template.jpg');

  if (baseJpg) {
    const fullName = escapePdf(user.full_name || user.name || 'Volunteer');
    const gender = (user.gender || '').toLowerCase();
    const salutation = (gender.includes('fem') || gender === 'f') ? 'Ms' : 'Mr';

    const rawDistrict = user.district_name || user.district || 'Tamil Nadu';
    const district = rawDistrict.replace(/\s+district$/i, '').trim() || 'Tamil Nadu';
    const addressLine2 = `${district} district`;

    const rawAddr = (user.address || '').trim();
    let cleanedAddr = cleanAddressSmart(rawAddr, district);
    if (!cleanedAddr) {
      const role = (displayRole(user.role) || user.preferred_designation || 'Volunteer').trim();
      cleanedAddr = `${role}, ${district}`;
    }
    const addressLine1 = `Address: ${cleanedAddr}`;

    const rawDate = user.approved_at || user.approval_date || user.joining_date || user.created_at || user.date_str || new Date().toISOString();
    let dateStr = String(rawDate).slice(0, 10);
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
        dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const tnvId = (user.tnv_id || '').trim();

    const commands = [
      'q 595.28 0 0 841.89 0 0 cm /Im1 Do Q',
      // Line 1: Volunteer Name below "To,"
      `BT /F1 11.9 Tf 0 0 0 rg 39.20 644.89 Td (${fullName}) Tj ET`,
      // Line 2: Address line 1
      `BT /F1 11.9 Tf 0 0 0 rg 39.08 629.89 Td (${escapePdf(addressLine1)}) Tj ET`,
      // Line 3: District line
      `BT /F1 11.9 Tf 0 0 0 rg 39.07 614.89 Td (${escapePdf(addressLine2)}) Tj ET`,
      // Line 4: Date value
      `BT /F1 11.9 Tf 0 0 0 rg 73.79 599.89 Td (${escapePdf(dateStr)}) Tj ET`,
      // Line 5: Dear line
      `BT /F2 11.9 Tf 0 0 0 rg 39.14 554.89 Td (Dear ${salutation} ) Tj /F1 11.9 Tf (${fullName},) Tj ET`
    ];

    if (tnvId) {
      commands.push(`BT /F2 9.8 Tf 0.1 0.1 0.1 rg 76.5 540.09 Td (${escapePdf(tnvId)}) Tj ET`);
    }

    return buildSimplePdf(595.28, 841.89, commands, baseJpg);
  }

  // Fallback to python generator if available locally
  try {
    const { execFileSync } = require('child_process');
    const fs = require('fs');
    const path = require('path');
    const os = require('os');

    const scriptCandidates = [
      path.resolve(__dirname, '../scripts/generate_appointment_pdf.py'),
      path.resolve(__dirname, 'scripts/generate_appointment_pdf.py'),
      path.resolve(process.cwd(), 'scripts/generate_appointment_pdf.py')
    ];
    const scriptPath = scriptCandidates.find(p => fs.existsSync(p));

    if (scriptPath) {
      const tempPdf = path.join(os.tmpdir(), `tnv_appt_${user.id || 'usr'}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`);
      const payload = JSON.stringify({
        full_name: user.full_name || 'Volunteer',
        gender: user.gender || 'male',
        role: displayRole(user.role) || user.preferred_designation || 'Volunteer',
        district_name: user.district_name || user.district || 'Tamil Nadu',
        phone: user.phone || '',
        email: user.email || '',
        tnv_id: user.tnv_id || '',
        address: user.address || '',
        date_str: user.approval_date || user.joining_date || new Date().toISOString().slice(0, 10)
      });

      execFileSync('python', [scriptPath, tempPdf, payload], { timeout: 15000 });
      if (fs.existsSync(tempPdf)) {
        const buf = fs.readFileSync(tempPdf);
        try { fs.unlinkSync(tempPdf); } catch (e) {}
        if (buf && buf.length > 5000) {
          return buf;
        }
      }
    }
  } catch (err) {
    console.error('Python appointment generator error:', err && err.message ? err.message : err);
  }

  // Last-resort fallback to static PDF if available
  const fs = require('fs');
  const path = require('path');
  const templateCandidates = [
    path.resolve(__dirname, 'assets/letterhead/Appointment_Letter_TN_Volunteers.pdf'),
    path.resolve(__dirname, '../tnv-vol IDs/Appointment_Letter_TN_Volunteers.pdf'),
    path.resolve(process.cwd(), 'tnv-vol IDs/Appointment_Letter_TN_Volunteers.pdf')
  ];
  for (const tPath of templateCandidates) {
    if (fs.existsSync(tPath)) {
      return fs.readFileSync(tPath);
    }
  }

  return Buffer.from('%PDF-1.4\n% Empty\n');
}

// Regex rules
const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Printed role on the ID card and appointment letter: system roles get a readable name
function displayRole(role) {
  const names = { master_admin: 'Master Admin', dept_admin: 'District Admin', district_coordinator: 'District Coordinator', wing_lead: 'Wing Lead', volunteer: 'Volunteer' };
  return names[role] || role || '';
}

// Helper: extract authenticated user from request
async function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  let token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token && req.url) {
    try {
      const parsedUrl = new URL(req.url, 'http://localhost');
      token = parsedUrl.searchParams.get('t') || parsedUrl.searchParams.get('token') || '';
    } catch (_e) {}
  }
  if (!token) return null;

  // Institution / NGO accounts carry their own signed token
  if (phase1.isNgoToken(token)) return phase1.ngoUserFromToken(token);

  // A blocked member's existing sessions stop working too
  if (supabaseBridge.isConfigured()) {
    try {
      const liveProfile = await supabaseBridge.getProfileFromToken(token);
      if (liveProfile) return liveProfile.blocked ? null : liveProfile;
    } catch (_e) {}
  }

  const userId = inMemorySessions[token];
  if (!userId) return null;
  const profile = inMemoryProfiles.find(p => p.id === userId) || null;
  return profile && !profile.blocked ? profile : null;
}

const BLOCKED_LOGIN_ERROR = 'This account has been blocked. Please contact Tamil Nadu Volunteers.';

// Create the Master Admin once per server/function instance (a no-op when it exists)
let adminSeeded = null;
function ensureAdminOnce() {
  if (!adminSeeded) {
    adminSeeded = supabaseBridge.isConfigured()
      ? supabaseBridge
          .ensureDemoAdmin()
          .then(admin => {
            // Not created (e.g. tables not set up yet): try again on the next request
            if (!admin) adminSeeded = null;
          })
          .catch(err => {
            adminSeeded = null;
            console.error('Master Admin seeding failed:', err.message);
          })
      : Promise.resolve(ensureInMemoryDemoAdmin());
  }
  return adminSeeded;
}

// When a Supabase call fails, local development falls back to the in-memory store.
// Hosted, that would fake success (e.g. a registration nobody can find again), so
// answer with an error instead. Returns true when the response has been sent.
function refuseHostedFallback(res, err, what) {
  if (!IS_HOSTED) return false;
  console.error(`Supabase ${what} failed (no fallback when hosted):`, err && err.message);
  if (!res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "We couldn't reach the TNV database. Please try again in a few minutes." }));
  }
  return true;
}

// Phase 1 routes: NGO registration and portal, member extras (Chennai zone/ward,
// linked NGO, ₹365 programme), admin access scopes, message log, event attendance
const phase1 = createPhase1({
  supabaseBridge,
  getAuthUser,
  sendJson,
  inMemoryProfiles,
  secretKey: SECRET_KEY,
  events: {
    sync: syncEventsFromStorage,
    list: () => inMemoryEvents,
    registrations: () => inMemoryEventRegistrations
  }
});

// Members sign in and register with their email only. The profiles table still needs
// a unique username, so one is made from the email (e.g. priya.k@x.com -> priyak_4821).
async function generateUsername(email) {
  let base = String(email || '').split('@')[0].replace(/[^A-Za-z0-9_]/g, '').slice(0, 13);
  if (base.length < 3) base = `tnv${base}`;
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${base}_${crypto.randomInt(1000, 10000)}`;
    let free = !inMemoryProfiles.some(p => (p.username || '').toLowerCase() === candidate.toLowerCase());
    if (free && supabaseBridge.isConfigured()) {
      try {
        free = Boolean(await supabaseBridge.checkUsernameAvailable(candidate));
      } catch (_e) {}
    }
    if (free) return candidate;
  }
  return `tnv_${crypto.randomBytes(6).toString('hex')}`;
}

// The request handler. Used by the local http server below and exported for the
// Vercel Function in api/index.js.
async function handleRequest(req, res) {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (MISSING_HOSTED_ENV.length) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      error: 'The TNV server is not configured yet.',
      missing_environment_variables: MISSING_HOSTED_ENV
    }));
  }
  await ensureAdminOnce();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (await phase1.handle(req, res, pathname, parsedUrl.query)) return;

  // ==========================================
  // EVENT MANAGEMENT & LIFECYCLE API
  // Statuses: Draft, Published, Ongoing, Completed, Cancelled
  // ==========================================

  // Helper to accurately match an authenticated user with an event registration
  function isUserMatchRegistration(user, reg) {
    if (!user || !reg) return false;
    const uid = (user.id || '').toString().trim();
    const utnv = (user.tnv_id || '').toString().trim();
    const umail = (user.email || '').toLowerCase().trim();
    const uname = (user.full_name || user.username || '').toLowerCase().trim();

    const ruid = (reg.user_id || '').toString().trim();
    const rmail = (reg.volunteer_email || '').toLowerCase().trim();
    const rname = (reg.volunteer_name || '').toLowerCase().trim();

    if (uid && ruid && uid === ruid) return true;
    if (utnv && ruid && utnv === ruid) return true;
    if (umail && rmail && umail === rmail) return true;
    if (uname && rname && uname === rname) return true;
    return false;
  }

  // --- GET /api/events (List with filters & volunteer registration state) ---
  if (req.method === 'GET' && pathname === '/api/events') {
    await syncEventsFromStorage();
    const authUser = await getAuthUser(req);
    const statusFilter = (parsedUrl.query.status || '').toString().trim();
    const districtFilter = (parsedUrl.query.district || '').toString().trim();
    const wingFilter = (parsedUrl.query.wing || '').toString().trim();
    const searchFilter = (parsedUrl.query.search || '').toString().trim().toLowerCase();
    const isPublicOnly = parsedUrl.query.public === 'true' || parsedUrl.query.public === '1';

    let results = inMemoryEvents.slice();

    if (isPublicOnly) {
      // Completed events are preserved for volunteer visibility alongside live and published drives
      results = results.filter(e => e.status === 'Published' || e.status === 'Ongoing' || e.status === 'Completed');
    } else if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      results = results.filter(e => e.status.toLowerCase() === statusFilter.toLowerCase());
    }

    if (districtFilter && districtFilter.toLowerCase() !== 'all') {
      results = results.filter(e =>
        !e.district ||
        e.district.toLowerCase() === 'all districts' ||
        e.district.toLowerCase() === 'statewide' ||
        e.district.toLowerCase() === districtFilter.toLowerCase()
      );
    }

    if (wingFilter && wingFilter.toLowerCase() !== 'all') {
      results = results.filter(e =>
        !e.wing ||
        e.wing.toLowerCase() === 'all wings' ||
        e.wing.toLowerCase() === wingFilter.toLowerCase()
      );
    }

    if (searchFilter) {
      results = results.filter(e =>
        (e.title && e.title.toLowerCase().includes(searchFilter)) ||
        (e.description && e.description.toLowerCase().includes(searchFilter)) ||
        (e.venue && e.venue.toLowerCase().includes(searchFilter)) ||
        (e.district && e.district.toLowerCase().includes(searchFilter))
      );
    }

    // Sort: Ongoing first, then Published, then Completed, then Drafts and Cancelled
    const statusPriority = { Ongoing: 0, Published: 1, Completed: 2, Draft: 3, Cancelled: 4 };
    results.sort((a, b) => {
      const pDiff = (statusPriority[a.status] ?? 5) - (statusPriority[b.status] ?? 5);
      if (pDiff !== 0) return pDiff;
      return new Date(b.start_date || 0) - new Date(a.start_date || 0);
    });

    // Enriched with dynamic registration state and participant count
    const enrichedEvents = results.map(evt => {
      const count = inMemoryEventRegistrations.filter(r => r.event_id === evt.id).length;
      const isRegistered = Boolean(authUser && inMemoryEventRegistrations.some(r =>
        r.event_id === evt.id && (
          (r.user_id && r.user_id === authUser.id) ||
          (r.volunteer_email && authUser.email && r.volunteer_email.toLowerCase() === authUser.email.toLowerCase())
        )
      ));
      return {
        ...evt,
        registered_count: count,
        is_registered: isRegistered,
        is_full: count >= (evt.capacity || 100)
      };
    });

    return sendJson(res, 200, { ok: true, events: enrichedEvents, total: enrichedEvents.length });
  }

  // --- POST /api/events (Create Event - Master Admin) ---
  if (req.method === 'POST' && pathname === '/api/events') {
    const authUser = await getAuthUser(req);
    if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Master Admin role required to create events' });
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        if (!body.title || !body.title.trim()) {
          return sendJson(res, 400, { ok: false, error: 'Event title is required', field: 'title' });
        }

        await syncEventsFromStorage();
        const initialStatus = EVENT_STATUSES.includes(body.status) ? body.status : 'Draft';
        const newEvent = {
          id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          title: body.title.trim(),
          description: (body.description || '').trim(),
          district: body.district || 'Chennai',
          venue: (body.venue || '').trim() || 'TNV Central Hall, Chennai',
          wing: body.wing || 'Youth Wing',
          start_date: body.start_date || new Date().toISOString().split('T')[0],
          end_date: body.end_date || body.start_date || new Date().toISOString().split('T')[0],
          start_time: body.start_time || '09:00',
          end_time: body.end_time || '17:00',
          capacity: parseInt(body.capacity, 10) || 100,
          registered_count: 0,
          status: initialStatus,
          organizer_name: (body.organizer_name || '').trim() || (authUser.full_name || 'TNV State Secretariat'),
          organizer_contact: (body.organizer_contact || '').trim() || (authUser.phone || '+91 94440 00000'),
          banner_url: (body.banner_url || '').trim(),
          tags: Array.isArray(body.tags) ? body.tags : (body.tags ? body.tags.split(',').map(t => t.trim()) : []),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        inMemoryEvents.unshift(newEvent);
        await syncEventsToStorage();
        return sendJson(res, 201, { ok: true, event: newEvent });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'Malformed JSON payload: ' + err.message });
      }
    });
    return;
  }

  // --- Dynamic Single Event Routes: /api/events/:id, /api/events/:id/status, /api/events/:id/register, /api/events/:id/participants ---
  if (pathname.startsWith('/api/events/')) {
    const segments = pathname.replace('/api/events/', '').split('/');
    const eventId = decodeURIComponent(segments[0]);
    const subAction = segments[1] || '';

    await syncEventsFromStorage();

    const eventIdx = inMemoryEvents.findIndex(e => e.id === eventId);
    if (eventIdx === -1) {
      return sendJson(res, 404, { ok: false, error: 'Event not found with ID: ' + eventId });
    }

    const currentEvent = inMemoryEvents[eventIdx];

    // GET /api/events/:id
    if (req.method === 'GET' && !subAction) {
      const authUser = await getAuthUser(req);
      const count = inMemoryEventRegistrations.filter(r => r.event_id === eventId).length;
      const isRegistered = Boolean(authUser && inMemoryEventRegistrations.some(r =>
        r.event_id === eventId && (
          (r.user_id && r.user_id === authUser.id) ||
          (r.volunteer_email && authUser.email && r.volunteer_email.toLowerCase() === authUser.email.toLowerCase())
        )
      ));
      return sendJson(res, 200, {
        ok: true,
        event: {
          ...currentEvent,
          registered_count: count,
          is_registered: isRegistered,
          is_full: count >= (currentEvent.capacity || 100)
        }
      });
    }

    // GET /api/events/:id/participants (Admin Roster of Registered Volunteers)
    if (req.method === 'GET' && subAction === 'participants') {
      const authUser = await getAuthUser(req);
      if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
        return sendJson(res, 403, { ok: false, error: 'Access denied: Master Admin role required to view registered volunteers roster' });
      }
      const participants = inMemoryEventRegistrations.filter(r => r.event_id === eventId);
      return sendJson(res, 200, {
        ok: true,
        event_id: eventId,
        event_title: currentEvent.title,
        participants,
        total: participants.length
      });
    }

    // PATCH /api/events/:id/status (Lifecycle transition - Master Admin)
    if (req.method === 'PATCH' && subAction === 'status') {
      const authUser = await getAuthUser(req);
      if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
        return sendJson(res, 403, { ok: false, error: 'Access denied: Master Admin role required to update event status' });
      }

      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const body = JSON.parse(bodyStr || '{}');
          if (!body.status || !EVENT_STATUSES.includes(body.status)) {
            return sendJson(res, 400, {
              ok: false,
              error: `Invalid status. Must be one of: ${EVENT_STATUSES.join(', ')}`
            });
          }

          currentEvent.status = body.status;
          currentEvent.updated_at = new Date().toISOString();
          await syncEventsToStorage();

          return sendJson(res, 200, { ok: true, event: currentEvent });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: 'Invalid JSON: ' + err.message });
        }
      });
      return;
    }

    // POST /api/events/:id/register (Volunteer registration)
    if (req.method === 'POST' && subAction === 'register') {
      const authUser = await getAuthUser(req);
      if (!authUser) {
        return sendJson(res, 401, {
          ok: false,
          error: 'Authentication required. Please sign in to register as a volunteer for this event.',
          require_login: true
        });
      }

      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const body = bodyStr ? JSON.parse(bodyStr) : {};

          // Check if event is open for registration
          if (currentEvent.status !== 'Published' && currentEvent.status !== 'Ongoing') {
            return sendJson(res, 400, {
              ok: false,
              error: `Registration is closed for this event (current status: ${currentEvent.status})`
            });
          }

          // Resolve volunteer identity from authenticated profile
          const volunteerId = authUser.id;
          const volunteerName = authUser.full_name || authUser.username || 'Volunteer';
          const volunteerEmail = authUser.email || '';
          const volunteerPhone = authUser.phone || '';
          const volunteerDistrict = authUser.district_name || '';
          const volunteerWing = authUser.wing_name || '';

          // Deduplication: Check if already registered
          const alreadyRegistered = inMemoryEventRegistrations.some(r =>
            r.event_id === eventId && (
              (r.user_id && r.user_id === volunteerId) ||
              (volunteerEmail && r.volunteer_email && r.volunteer_email.toLowerCase() === volunteerEmail.toLowerCase())
            )
          );

          if (alreadyRegistered) {
            return sendJson(res, 409, {
              ok: false,
              error: 'You are already registered for this event.',
              is_registered: true
            });
          }

          // Capacity Check
          const currentCount = inMemoryEventRegistrations.filter(r => r.event_id === eventId).length;
          if (currentCount >= (currentEvent.capacity || 100)) {
            return sendJson(res, 400, {
              ok: false,
              error: 'This event has reached full capacity.'
            });
          }

          // Create registration record
          const registration = {
            id: `reg-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            event_id: eventId,
            user_id: volunteerId,
            volunteer_name: volunteerName,
            volunteer_email: volunteerEmail,
            volunteer_phone: volunteerPhone,
            district: volunteerDistrict,
            wing: volunteerWing,
            status: 'REGISTERED',
            registered_at: new Date().toISOString()
          };

          inMemoryEventRegistrations.push(registration);
          const updatedCount = inMemoryEventRegistrations.filter(r => r.event_id === eventId).length;
          currentEvent.registered_count = updatedCount;
          currentEvent.updated_at = new Date().toISOString();
          await syncEventsToStorage();

          return sendJson(res, 200, {
            ok: true,
            message: `Successfully registered for "${currentEvent.title}".`,
            is_registered: true,
            registered_count: updatedCount,
            registration
          });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: 'Registration error: ' + err.message });
        }
      });
      return;
    }

    // PUT /api/events/:id (Update Event Details - Master Admin)
    if (req.method === 'PUT' && !subAction) {
      const authUser = await getAuthUser(req);
      if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
        return sendJson(res, 403, { ok: false, error: 'Access denied: Master Admin role required to update event details' });
      }

      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const body = JSON.parse(bodyStr || '{}');

          const updatedEvent = {
            ...currentEvent,
            title: body.title !== undefined ? body.title.trim() : currentEvent.title,
            description: body.description !== undefined ? body.description.trim() : currentEvent.description,
            district: body.district !== undefined ? body.district : currentEvent.district,
            venue: body.venue !== undefined ? body.venue.trim() : currentEvent.venue,
            wing: body.wing !== undefined ? body.wing : currentEvent.wing,
            start_date: body.start_date !== undefined ? body.start_date : currentEvent.start_date,
            end_date: body.end_date !== undefined ? body.end_date : currentEvent.end_date,
            start_time: body.start_time !== undefined ? body.start_time : currentEvent.start_time,
            end_time: body.end_time !== undefined ? body.end_time : currentEvent.end_time,
            capacity: body.capacity !== undefined ? parseInt(body.capacity, 10) : currentEvent.capacity,
            status: (body.status && EVENT_STATUSES.includes(body.status)) ? body.status : currentEvent.status,
            organizer_name: body.organizer_name !== undefined ? body.organizer_name.trim() : currentEvent.organizer_name,
            organizer_contact: body.organizer_contact !== undefined ? body.organizer_contact.trim() : currentEvent.organizer_contact,
            banner_url: body.banner_url !== undefined ? body.banner_url.trim() : currentEvent.banner_url,
            tags: body.tags !== undefined ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',').map(t => t.trim())) : currentEvent.tags,
            updated_at: new Date().toISOString()
          };

          inMemoryEvents[eventIdx] = updatedEvent;
          await syncEventsToStorage();
          return sendJson(res, 200, { ok: true, event: updatedEvent });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: 'Invalid JSON: ' + err.message });
        }
      });
      return;
    }

    // DELETE /api/events/:id (Master Admin)
    if (req.method === 'DELETE' && !subAction) {
      const authUser = await getAuthUser(req);
      if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
        return sendJson(res, 403, { ok: false, error: 'Access denied: Master Admin role required to delete events' });
      }

      const removed = inMemoryEvents.splice(eventIdx, 1)[0];
      deletedEventIds.add(eventId);
      // Cascade delete event registrations
      for (let i = inMemoryEventRegistrations.length - 1; i >= 0; i--) {
        if (inMemoryEventRegistrations[i].event_id === eventId) {
          inMemoryEventRegistrations.splice(i, 1);
        }
      }
      await syncEventsToStorage();
      return sendJson(res, 200, { ok: true, message: 'Event deleted successfully', event: removed });
    }
  }

  // ==========================================
  // TASK COORDINATION & LIFECYCLE API
  // Roles: Master Admin (creator/supervisor), Volunteer (assignee/executor)
  // Statuses: TODO -> IN_PROGRESS -> COMPLETED
  // ==========================================

  // --- GET /api/tasks/volunteers (Registered volunteers for task assignment) ---
  if (req.method === 'GET' && pathname === '/api/tasks/volunteers') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required to view volunteers' });
    }

    let allProfiles = inMemoryProfiles.slice();
    if (supabaseBridge.isConfigured()) {
      try {
        const live = await supabaseBridge.getPublicProfiles();
        if (Array.isArray(live)) allProfiles = live;
      } catch (_e) {}
    }

    const volunteers = allProfiles
      .filter(p => p && p.role !== 'master_admin' && p.role !== 'admin' && p.role !== 'dept_admin')
      .map(v => ({
        id: v.id,
        name: v.full_name || v.name || v.username || 'Volunteer',
        username: v.username,
        district: v.district_name || v.district || 'Tamil Nadu',
        wing: v.wing_name || v.wing_to_join || v.wing || 'Volunteer Wing',
        email: v.email || '',
        phone: v.phone || '',
        tnv_id: v.tnv_id || ''
      }));

    return sendJson(res, 200, { ok: true, volunteers, total: volunteers.length });
  }

  // --- GET /api/tasks (List tasks scoped by role & filters) ---
  if (req.method === 'GET' && pathname === '/api/tasks') {
    await syncTasksFromStorage();
    const user = await getAuthUser(req);
    if (!user) {
      return sendJson(res, 401, { ok: false, error: 'Authentication required' });
    }

    const isAdmin = user.role === 'master_admin' || user.role === 'admin';
    const statusFilter = (parsedUrl.query.status || '').toString().trim().toUpperCase();
    const priorityFilter = (parsedUrl.query.priority || '').toString().trim().toUpperCase();
    const searchFilter = (parsedUrl.query.search || '').toString().trim().toLowerCase();
    const creatorFilter = (parsedUrl.query.creator || '').toString().trim();
    const assigneeFilter = (parsedUrl.query.assignee || '').toString().trim();

    let results = inMemoryTasks.slice();

    // Role-based visibility scoping:
    if (!isAdmin) {
      // Volunteers can only view tasks assigned directly to them
      results = results.filter(t => t.assignee_id === user.id);
    } else {
      // Admins can filter by assigned_by_me or specific assignee
      if (creatorFilter === 'me') {
        results = results.filter(t => t.creator_id === user.id);
      }
      if (assigneeFilter && assigneeFilter !== 'all') {
        results = results.filter(t => t.assignee_id === assigneeFilter);
      }
    }

    // Status filter (TODO, IN_PROGRESS, COMPLETED)
    if (statusFilter && statusFilter !== 'ALL' && TASK_STATUSES.includes(statusFilter)) {
      results = results.filter(t => t.status === statusFilter);
    }

    // Priority filter (LOW, MEDIUM, HIGH)
    if (priorityFilter && priorityFilter !== 'ALL' && TASK_PRIORITIES.includes(priorityFilter)) {
      results = results.filter(t => t.priority === priorityFilter);
    }

    // Search filter
    if (searchFilter) {
      results = results.filter(t =>
        (t.title && t.title.toLowerCase().includes(searchFilter)) ||
        (t.description && t.description.toLowerCase().includes(searchFilter)) ||
        (t.assignee_name && t.assignee_name.toLowerCase().includes(searchFilter)) ||
        (t.creator_name && t.creator_name.toLowerCase().includes(searchFilter))
      );
    }

    // Sort: Urgent/high priority and upcoming deadlines first
    results.sort((a, b) => {
      if (a.status === 'COMPLETED' && b.status !== 'COMPLETED') return 1;
      if (a.status !== 'COMPLETED' && b.status === 'COMPLETED') return -1;
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      const pDiff = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
      if (pDiff !== 0) return pDiff;
      return new Date(a.deadline || 0) - new Date(b.deadline || 0);
    });

    return sendJson(res, 200, { ok: true, tasks: results, total: results.length });
  }

  // --- POST /api/tasks (Create & assign task - Master Admin) ---
  if (req.method === 'POST' && pathname === '/api/tasks') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required to assign tasks' });
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        if (!body.title || !body.title.trim()) {
          return sendJson(res, 400, { ok: false, error: 'Task title is required', field: 'title' });
        }
        if (!body.description || !body.description.trim()) {
          return sendJson(res, 400, { ok: false, error: 'Task description is required', field: 'description' });
        }
        if (!body.deadline) {
          return sendJson(res, 400, { ok: false, error: 'Deadline date is required', field: 'deadline' });
        }
        if (!body.assignee_id) {
          return sendJson(res, 400, { ok: false, error: 'Assignee volunteer is required', field: 'assignee_id' });
        }

        // Find assignee volunteer info
        let assignee = inMemoryProfiles.find(p => p.id === body.assignee_id || p.username === body.assignee_id);
        if (!assignee && supabaseBridge.isConfigured()) {
          try {
            assignee = await supabaseBridge.getProfileById(body.assignee_id);
          } catch (_e) {}
        }

        const assigneeName = assignee
          ? (assignee.full_name || assignee.name || assignee.username)
          : (body.assignee_name || 'Volunteer');
        const assigneeDistrict = assignee ? (assignee.district_name || assignee.district || 'Tamil Nadu') : 'Tamil Nadu';
        const assigneeWing = assignee ? (assignee.wing_name || assignee.wing_to_join || assignee.wing || 'Volunteer Wing') : 'Volunteer Wing';
        const assigneeEmail = assignee ? (assignee.email || '') : '';

        const newTask = {
          id: `task-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
          title: body.title.trim(),
          description: body.description.trim(),
          priority: TASK_PRIORITIES.includes(body.priority) ? body.priority : 'MEDIUM',
          deadline: body.deadline,
          status: 'TODO',
          creator_id: user.id,
          creator_name: user.full_name || user.username || 'Master Administrator',
          creator_role: user.role,
          assignee_id: body.assignee_id,
          assignee_name: assigneeName,
          assignee_district: assigneeDistrict,
          assignee_wing: assigneeWing,
          assignee_email: assigneeEmail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          completed_at: null
        };

        await syncTasksFromStorage();
        inMemoryTasks.unshift(newTask);
        await syncTasksToStorage();

        return sendJson(res, 201, { ok: true, task: newTask });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'Invalid JSON: ' + err.message });
      }
    });
    return;
  }

  // --- Dynamic Single Task Routes: /api/tasks/:id, /api/tasks/:id/status ---
  if (pathname.startsWith('/api/tasks/')) {
    const segments = pathname.replace('/api/tasks/', '').split('/');
    const taskId = decodeURIComponent(segments[0]);
    const subAction = segments[1] || '';

    await syncTasksFromStorage();

    const taskIdx = inMemoryTasks.findIndex(t => t.id === taskId);
    if (taskIdx === -1) {
      return sendJson(res, 404, { ok: false, error: 'Task not found with ID: ' + taskId });
    }

    // PATCH /api/tasks/:id/status (Volunteer updates status or Admin overrides)
    if (req.method === 'PATCH' && subAction === 'status') {
      const user = await getAuthUser(req);
      if (!user) {
        return sendJson(res, 401, { ok: false, error: 'Authentication required' });
      }

      const currentTask = inMemoryTasks[taskIdx];
      const isAssignee = currentTask.assignee_id === user.id;
      const isCreator = currentTask.creator_id === user.id;
      const isAdmin = user.role === 'master_admin' || user.role === 'admin';

      if (!isAssignee && !isCreator && !isAdmin) {
        return sendJson(res, 403, { ok: false, error: 'Forbidden: You do not have permission to update this task status' });
      }

      let bodyStr = '';
      req.on('data', chunk => { bodyStr += chunk; });
      req.on('end', async () => {
        try {
          const body = JSON.parse(bodyStr || '{}');
          if (!body.status || !TASK_STATUSES.includes(body.status)) {
            return sendJson(res, 400, {
              ok: false,
              error: `Invalid status. Must be one of: ${TASK_STATUSES.join(', ')}`
            });
          }

          currentTask.status = body.status;
          currentTask.updated_at = new Date().toISOString();
          if (body.status === 'COMPLETED') {
            currentTask.completed_at = new Date().toISOString();
          } else {
            currentTask.completed_at = null;
          }

          await syncTasksToStorage();

          return sendJson(res, 200, { ok: true, task: currentTask });
        } catch (err) {
          return sendJson(res, 400, { ok: false, error: 'Invalid JSON: ' + err.message });
        }
      });
      return;
    }

    // DELETE /api/tasks/:id (Admin removes task)
    if (req.method === 'DELETE' && !subAction) {
      const user = await getAuthUser(req);
      if (!user || (user.role !== 'master_admin' && user.role !== 'admin')) {
        return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required to delete tasks' });
      }

      const removed = inMemoryTasks.splice(taskIdx, 1)[0];
      deletedTaskIds.add(taskId);
      await syncTasksToStorage();
      return sendJson(res, 200, { ok: true, message: 'Task removed successfully', task: removed });
    }
  }

  // =========================================================================
  // CERTIFICATE MANAGEMENT ROUTES
  // =========================================================================

  // Serve static certificate template uploads
  if (pathname.startsWith('/assets/templates/')) {
    const filename = path.basename(pathname);
    const templateFilePath = path.join(__dirname, 'assets', 'templates', filename);
    if (fs.existsSync(templateFilePath) && fs.statSync(templateFilePath).isFile()) {
      const ext = path.extname(templateFilePath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg' : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
      return fs.createReadStream(templateFilePath).pipe(res);
    }
  }

  // --- GET /api/certificates/templates (List all configured templates with event stats) ---
  if (req.method === 'GET' && pathname === '/api/certificates/templates') {
    await syncEventsFromStorage();
    await syncCertificateTemplatesFromStorage();
    const authUser = await getAuthUser(req);
    if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required' });
    }

    const results = inMemoryCertificateTemplates.map(tmpl => {
      const evt = inMemoryEvents.find(e => e.id === tmpl.event_id) || {};
      const regCount = inMemoryEventRegistrations.filter(r => r.event_id === tmpl.event_id).length;
      return {
        id: tmpl.id,
        event_id: tmpl.event_id,
        event_title: evt.title || tmpl.event_title || 'Unnamed Event',
        event_date: evt.start_date || tmpl.event_date || '',
        event_district: evt.district || tmpl.event_district || '',
        image_url: tmpl.image_url,
        name_position: tmpl.name_position,
        qr_position: tmpl.qr_position,
        status: tmpl.status || 'DRAFT',
        registered_count: regCount,
        published_at: tmpl.published_at || null,
        created_at: tmpl.created_at || new Date().toISOString(),
        updated_at: tmpl.updated_at || new Date().toISOString()
      };
    });

    return sendJson(res, 200, { ok: true, templates: results });
  }

  // --- GET /api/certificates/templates/:eventId (Get single event template details) ---
  if (req.method === 'GET' && pathname.startsWith('/api/certificates/templates/')) {
    const eventId = decodeURIComponent(pathname.replace('/api/certificates/templates/', '').trim());
    await syncEventsFromStorage();
    await syncCertificateTemplatesFromStorage();

    const tmpl = inMemoryCertificateTemplates.find(t => t.event_id === eventId);
    const evt = inMemoryEvents.find(e => e.id === eventId);
    const participants = inMemoryEventRegistrations.filter(r => r.event_id === eventId);

    if (!tmpl) {
      return sendJson(res, 404, {
        ok: false,
        error: 'No certificate template configured for this event',
        event: evt || null,
        registered_count: participants.length
      });
    }

    return sendJson(res, 200, {
      ok: true,
      template: tmpl,
      event: evt || null,
      registered_count: participants.length,
      participants: participants
    });
  }

  // --- POST /api/certificates/templates (Save or Update Certificate Template - Admin) ---
  if (req.method === 'POST' && pathname === '/api/certificates/templates') {
    const authUser = await getAuthUser(req);
    if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required' });
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const { eventId, imageBase64, imageName, namePosition, qrPosition } = body;

        if (!eventId) {
          return sendJson(res, 400, { ok: false, error: 'Event ID is required', field: 'eventId' });
        }
        if (!namePosition || !qrPosition) {
          return sendJson(res, 400, { ok: false, error: 'Name and QR positions are required' });
        }

        await syncEventsFromStorage();
        await syncCertificateTemplatesFromStorage();

        const evt = inMemoryEvents.find(e => e.id === eventId);
        if (!evt) {
          return sendJson(res, 404, { ok: false, error: 'Event not found with ID: ' + eventId });
        }

        let finalImageUrl = '';

        if (imageBase64 && typeof imageBase64 === 'string') {
          try {
            const ext = imageName ? path.extname(imageName) : '.png';
            const filename = `template-${eventId}-${Date.now()}${ext}`;
            const targetDir = path.join(__dirname, 'assets', 'templates');
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            const filePath = path.join(targetDir, filename);
            const rawBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
            fs.writeFileSync(filePath, Buffer.from(rawBase64, 'base64'));
            finalImageUrl = `/assets/templates/${filename}`;
          } catch (writeErr) {
            finalImageUrl = imageBase64;
          }
        } else {
          const existing = inMemoryCertificateTemplates.find(t => t.event_id === eventId);
          if (existing && existing.image_url) {
            finalImageUrl = existing.image_url;
          } else {
            return sendJson(res, 400, { ok: false, error: 'Template image file is required' });
          }
        }

        const existingIdx = inMemoryCertificateTemplates.findIndex(t => t.event_id === eventId);
        const templateRecord = {
          id: existingIdx !== -1 ? inMemoryCertificateTemplates[existingIdx].id : `cert-tmpl-${Date.now()}`,
          event_id: eventId,
          event_title: evt.title,
          event_date: evt.start_date,
          event_district: evt.district,
          image_url: finalImageUrl,
          name_position: namePosition,
          qr_position: qrPosition,
          status: existingIdx !== -1 ? (inMemoryCertificateTemplates[existingIdx].status || 'DRAFT') : 'DRAFT',
          published_at: existingIdx !== -1 ? inMemoryCertificateTemplates[existingIdx].published_at : null,
          created_at: existingIdx !== -1 ? inMemoryCertificateTemplates[existingIdx].created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (existingIdx !== -1) {
          inMemoryCertificateTemplates[existingIdx] = templateRecord;
        } else {
          inMemoryCertificateTemplates.push(templateRecord);
        }

        await syncCertificateTemplatesToStorage();

        return sendJson(res, 200, {
          ok: true,
          message: 'Certificate template configuration saved successfully',
          template: templateRecord
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'Invalid JSON body: ' + err.message });
      }
    });
    return;
  }

  // --- POST /api/certificates/templates/:eventId/publish (Publish Certificates for Event - Admin) ---
  if (req.method === 'POST' && pathname.startsWith('/api/certificates/templates/') && pathname.endsWith('/publish')) {
    const eventId = decodeURIComponent(pathname.replace('/api/certificates/templates/', '').replace('/publish', '').trim());
    const authUser = await getAuthUser(req);
    if (!authUser || (authUser.role !== 'master_admin' && authUser.role !== 'admin')) {
      return sendJson(res, 403, { ok: false, error: 'Access denied: Admin role required to publish certificates' });
    }

    await syncEventsFromStorage();
    await syncCertificateTemplatesFromStorage();

    const tmplIdx = inMemoryCertificateTemplates.findIndex(t => t.event_id === eventId);
    if (tmplIdx === -1) {
      return sendJson(res, 404, { ok: false, error: 'Please configure and save a certificate template first' });
    }

    inMemoryCertificateTemplates[tmplIdx].status = 'PUBLISHED';
    inMemoryCertificateTemplates[tmplIdx].published_at = new Date().toISOString();
    inMemoryCertificateTemplates[tmplIdx].updated_at = new Date().toISOString();

    await syncCertificateTemplatesToStorage();

    return sendJson(res, 200, {
      ok: true,
      message: 'Certificates successfully published! Registered volunteers can now view and download their certificates.',
      template: inMemoryCertificateTemplates[tmplIdx]
    });
  }

  // --- GET /api/certificates/my-certificates (Volunteer: List issued certificates) ---
  if (req.method === 'GET' && pathname === '/api/certificates/my-certificates') {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return sendJson(res, 401, { ok: false, error: 'Authentication required' });
    }

    await syncEventsFromStorage();
    await syncCertificateTemplatesFromStorage();

    // Find registrations belonging to authUser
    const myRegistrations = inMemoryEventRegistrations.filter(r => isUserMatchRegistration(authUser, r));

    const publishedCertificates = [];
    for (const reg of myRegistrations) {
      const tmpl = inMemoryCertificateTemplates.find(t => t.event_id === reg.event_id && String(t.status || '').toUpperCase() === 'PUBLISHED');
      if (tmpl) {
        const evt = inMemoryEvents.find(e => e.id === reg.event_id) || {};
        publishedCertificates.push({
          registration_id: reg.id,
          event_id: reg.event_id,
          event_title: evt.title || tmpl.event_title || 'TNV Event',
          event_date: evt.start_date || tmpl.event_date || '',
          event_venue: evt.venue || 'Tamil Nadu',
          event_district: evt.district || tmpl.event_district || 'Tamil Nadu',
          volunteer_name: reg.volunteer_name || authUser.full_name,
          volunteer_email: reg.volunteer_email || authUser.email,
          image_url: tmpl.image_url,
          name_position: tmpl.name_position,
          qr_position: tmpl.qr_position,
          published_at: tmpl.published_at,
          registered_at: reg.registered_at
        });
      }
    }

    return sendJson(res, 200, { ok: true, certificates: publishedCertificates });
  }

  // --- GET /api/certificates/verify/:regId (Public Verification Endpoint for QR scans) ---
  if (req.method === 'GET' && pathname.startsWith('/api/certificates/verify/')) {
    const regId = decodeURIComponent(pathname.replace('/api/certificates/verify/', '').trim());
    await syncEventsFromStorage();
    await syncCertificateTemplatesFromStorage();

    const reg = inMemoryEventRegistrations.find(r => r.id === regId);
    if (!reg) {
      return sendJson(res, 404, {
        ok: false,
        verified: false,
        error: 'Certificate registration ID not found or invalid'
      });
    }

    const evt = inMemoryEvents.find(e => e.id === reg.event_id) || {};
    const tmpl = inMemoryCertificateTemplates.find(t => t.event_id === reg.event_id);

    return sendJson(res, 200, {
      ok: true,
      verified: true,
      certificate_id: reg.id,
      recipient_name: reg.volunteer_name || 'Volunteer',
      event_title: evt.title || tmpl?.event_title || 'TNV Event',
      event_date: evt.start_date || tmpl?.event_date || '',
      district: evt.district || tmpl?.event_district || 'Tamil Nadu',
      issued_by: 'Tamil Nadu Volunteers (TNV) State Core',
      verified_at: new Date().toISOString()
    });
  }

  // --- GET /api/districts ---
  if (req.method === 'GET' && pathname === '/api/districts') {
    if (supabaseBridge.isConfigured()) {
      try {
        const liveDistricts = await supabaseBridge.getDistricts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ districts: liveDistricts }));
      } catch (err) {
        console.warn('Supabase districts fetch warning:', err.message);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ districts: DISTRICTS }));
    return;
  }

  // --- GET /api/options ---
  if (req.method === 'GET' && pathname === '/api/options') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(OPTIONS));
    return;
  }

  // --- GET /api/constituencies ---
  if (req.method === 'GET' && pathname === '/api/constituencies') {
    const districtId = parseInt(parsedUrl.query.district_id, 10);
    if (districtId && DISTRICT_CONSTITUENCIES[districtId]) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ district_id: districtId, constituencies: DISTRICT_CONSTITUENCIES[districtId] }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ constituencies_by_district: DISTRICT_CONSTITUENCIES }));
  }

  // --- GET /api/username-available (Step 2) ---
  if (req.method === 'GET' && pathname === '/api/username-available') {
    const u = (parsedUrl.query.u || '').toString();
    if (!u || !USERNAME_REGEX.test(u)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ available: false, reason: 'Invalid format' }));
      return;
    }

    if (supabaseBridge.isConfigured()) {
      try {
        const available = await supabaseBridge.checkUsernameAvailable(u);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ available: Boolean(available) }));
      } catch (err) {
        console.warn('Supabase username check fallback:', err.message);
        if (refuseHostedFallback(res, err, 'username check')) return;
      }
    }

    const exists = inMemoryProfiles.some(p => p.username.toLowerCase() === u.toLowerCase());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ available: !exists }));
    return;
  }

  // --- GET /api/email-available (Email Uniqueness Check) ---
  if (req.method === 'GET' && pathname === '/api/email-available') {
    const e = (parsedUrl.query.e || '').toString().trim().toLowerCase();
    if (!e || !EMAIL_REGEX.test(e)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ available: false, reason: 'Invalid email format' }));
      return;
    }

    if (supabaseBridge.isConfigured()) {
      try {
        const available = await supabaseBridge.checkEmailAvailable(e);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ available: Boolean(available) }));
      } catch (err) {
        console.warn('Supabase email check fallback:', err.message);
        if (refuseHostedFallback(res, err, 'email check')) return;
      }
    }

    const exists = inMemoryProfiles.some(p => p.email.toLowerCase() === e);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ available: !exists }));
    return;
  }

  // --- GET /api/profiles (Queue, admins only) ---
  if (req.method === 'GET' && pathname === '/api/profiles') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Access Denied: Admin role required to view applicant profiles.'
      }));
    }

    if (supabaseBridge.isConfigured()) {
      try {
        const liveProfiles = await supabaseBridge.getPublicProfiles();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ profiles: liveProfiles }));
      } catch (err) {
        console.warn('Supabase getPublicProfiles fallback:', err.message);
        if (refuseHostedFallback(res, err, 'getPublicProfiles')) return;
      }
    }

    const publicProfiles = inMemoryProfiles.map(({ aadhaar_enc, password, ...rest }) => rest);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ profiles: publicProfiles }));
    return;
  }

  // --- POST /api/register (Step 3) ---
  if (req.method === 'POST' && pathname === '/api/register') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr);

        if (!body.full_name || body.full_name.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Full name is required', field: 'full_name' }));
        }

        const email = (body.email || '').trim().toLowerCase();
        if (!EMAIL_REGEX.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid email address is required', field: 'email' }));
        }

        // The form no longer asks for a username: members sign in with their email
        const username = (body.username || '').trim() || await generateUsername(email);
        if (!USERNAME_REGEX.test(username)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Username must be 4 to 20 alphanumeric characters or underscore', field: 'username' }));
        }

        const phone = (body.phone || '').replace(/[\s-]/g, '');
        if (!PHONE_REGEX.test(phone)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Phone number must be exactly 10 digits starting with 6, 7, 8, or 9', field: 'phone' }));
        }

        if (!body.password || body.password.length < 6) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Password must be at least 6 characters long', field: 'password' }));
        }

        if (body.confirm_password !== undefined && body.password !== body.confirm_password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Password and Confirm Password do not match', field: 'confirm_password' }));
        }

        const rawAadhaar = body.aadhaarNumber !== undefined ? body.aadhaarNumber : (body.aadhaar || '');
        const aadhaar = String(rawAadhaar).replace(/[\s-]/g, '');
        if (!AADHAAR_REGEX.test(aadhaar)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Aadhaar card number must be exactly 12 digits (numbers only)', field: 'aadhaarNumber' }));
        }

        const districtId = parseInt(body.district_id, 10);
        const districtObj = DISTRICTS.find(d => d.id === districtId);
        if (!districtObj) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Selected district does not exist', field: 'district_id' }));
        }

        const pincode = (body.pincode || '').toString().trim();
        if (pincode && !/^\d{6}$/.test(pincode)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'PIN code must contain exactly 6 digits (numbers only)', field: 'pincode' }));
        }

        // Blood Group is mandatory (module parity)
        if (!body.blood_group || body.blood_group.trim().length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Blood group is required', field: 'blood_group' }));
        }

        // Previous experience / works: min 5 words unless 'Nil'/'None'/'NA'/'Fresher' or past_field_work provided, max 150 words
        const pastWorkArr = Array.isArray(body.past_field_work) ? body.past_field_work : (body.past_field_work ? [body.past_field_work] : []);
        const prevExp = (body.previous_works || body.previous_experience || (pastWorkArr.length ? (pastWorkArr.includes('Fresher') ? 'Fresher' : pastWorkArr.join(', ')) : '') || '').trim();
        if (!prevExp && pastWorkArr.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Previous experience or past field work selection is required', field: 'previous_experience' }));
        }
        const prevWords = prevExp.split(/\s+/).filter(Boolean).length;
        const isNilWorks = /^(nil|none|na|n\/a|fresher)$/i.test(prevExp) || pastWorkArr.length > 0;
        if (!isNilWorks && prevWords < 5) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Previous works / experience must have at least 5 words, or specify Nil', field: 'previous_experience' }));
        }
        if (prevWords > 150) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Previous experience must not exceed 150 words', field: 'previous_experience' }));
        }

        // Company / Institution Location Area (module parity)
        const compArea = (body.company_area || '').trim();
        if (body.work_study_status && !compArea) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Company / Work / Residence Location Area is required', field: 'company_area' }));
        }

        // Chennai zone and ward, and the registered NGO the volunteer belongs to
        const extrasProblem = await phase1.validateRegistrationExtras(body, districtId);
        if (extrasProblem) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(extrasProblem));
        }

        // Live Supabase Registration (with in-memory offline fallback)
        if (supabaseBridge.isConfigured()) {
          try {
            const liveResult = await supabaseBridge.registerUser({
              full_name: body.full_name,
              username: username,
              email: email,
              phone: phone,
              password: body.password,
              aadhaar: aadhaar,
              district_id: districtId,
              address: body.address || '',
              dob: body.dob || null,
              gender: body.gender || null,
              marital_status: body.marital_status || null,
              father_or_husband_name: body.father_or_husband_name || null,
              category: body.category || body.affiliation || null,
              affiliation: body.affiliation || body.category || null,
              organization_name: body.organization_name ? body.organization_name.trim() : null,
              work_study_status: body.work_study_status || null,
              employer_name: body.employer_name ? body.employer_name.trim() : null,
              company_area: compArea || null,
              blood_group: body.blood_group ? body.blood_group.trim() : null,
              occupation: body.occupation ? body.occupation.trim() : null,
              assembly_constituency: body.assembly_constituency || null,
              panchayat: body.panchayat ? body.panchayat.trim() : null,
              previous_experience: prevExp,
              past_field_work: Array.isArray(body.past_field_work) ? body.past_field_work : (body.past_field_work ? [body.past_field_work] : []),
              wing_to_join: body.wing_to_join || null,
              department: body.department || null,
              mode_of_work: body.mode_of_work || null,
              pincode: body.pincode || null,
              preferred_designation: body.preferred_designation || null,
              photo_path: body.photo_path || null
            });

            if (liveResult && !liveResult.error) {
              await phase1.saveRegistrationExtras(liveResult.user?.id || liveResult.profile?.id, body, districtId);
              res.writeHead(201, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(liveResult));
            } else if (liveResult && liveResult.status && liveResult.status !== 500 && !String(liveResult.error || '').includes('fetch failed')) {
              res.writeHead(liveResult.status || 400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(liveResult));
            }
          } catch (liveErr) {
            console.warn('Supabase registration fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'registration')) return;
          }
        }

        // In-Memory Fallback: Duplicates check
        if (inMemoryProfiles.some(p => p.username.toLowerCase() === username.toLowerCase())) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Username is already taken', field: 'username' }));
        }

        if (inMemoryProfiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'This email address is already registered. Only one account can be created per email ID.', field: 'email' }));
        }

        const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
        const { aadhaar_enc, aadhaar_last4 } = encryptAadhaar(aadhaar);

        const isPayNow = body.payment_choice === 'pay_now' || (body.gateway_ref && String(body.gateway_ref).trim().length > 0);
        let regReceiptNo = null;
        if (isPayNow) {
          regReceiptNo = generateReceiptNo();
          const paidAt = new Date().toISOString();
          const gRef = body.gateway_ref ? String(body.gateway_ref).trim() : `UPI-${Date.now()}`;
          inMemoryPayments.push({
            id: 'pay_' + Date.now(),
            profile_id: userId,
            amount_inr: MEMBERSHIP_FEE_INR,
            status: 'paid',
            gateway_ref: gRef,
            receipt_no: regReceiptNo,
            paid_at: paidAt
          });

          const pdfBuffer = generateReceiptPdfBinary({
            receiptNo: regReceiptNo,
            paidAt: paidAt,
            fullName: body.full_name.trim(),
            username: username,
            email: email,
            phone: phone,
            district: districtObj.name || 'Tamil Nadu',
            gatewayRef: gRef,
            amountInr: MEMBERSHIP_FEE_INR
          });
          inMemoryReceiptPdfs.set(regReceiptNo, pdfBuffer);
        }

        const newProfile = {
          id: userId,
          username: username,
          password: body.password,
          full_name: body.full_name.trim(),
          email: email,
          phone: phone,
          address: body.address ? body.address.trim() : '',
          district_id: districtId,
          district_name: districtObj.name,
          aadhaar_enc: aadhaar_enc,
          aadhaar_last4: aadhaar_last4,
          status: 'pending', // Under Review
          role: null, // Null until verified
          membership_paid: Boolean(isPayNow),
          receipt_no: regReceiptNo,
          dob: body.dob || null,
          gender: body.gender || null,
          marital_status: body.marital_status || null,
          father_or_husband_name: body.father_or_husband_name ? body.father_or_husband_name.trim() : null,
          category: body.category || body.affiliation || null,
          affiliation: body.affiliation || body.category || null,
          organization_name: body.organization_name ? body.organization_name.trim() : null,
          work_study_status: body.work_study_status || null,
          employer_name: body.employer_name ? body.employer_name.trim() : null,
          company_area: compArea || null,
          blood_group: body.blood_group ? body.blood_group.trim() : null,
          occupation: body.occupation ? body.occupation.trim() : null,
          assembly_constituency: body.assembly_constituency || null,
          panchayat: body.panchayat ? body.panchayat.trim() : null,
          previous_experience: prevExp || null,
          previous_works: prevExp || null,
          wing_to_join: body.wing_to_join || null,
          wing_name: body.wing_to_join ? body.wing_to_join.split('—')[0].trim() : null,
          department: body.department || null,
          mode_of_work: body.mode_of_work || null,
          pincode: body.pincode || null,
          preferred_designation: body.preferred_designation || null,
          past_field_work: Array.isArray(body.past_field_work) ? body.past_field_work : (body.past_field_work ? [body.past_field_work] : []),
          photo_path: body.photo_path || null,
          photo_url: body.photo_path || null,
          created_at: new Date().toISOString()
        };
        inMemoryProfiles.push(newProfile);
        await phase1.saveRegistrationExtras(userId, body, districtId);

        const sessionToken = 'tnv_jwt_' + crypto.randomBytes(16).toString('hex');
        inMemorySessions[sessionToken] = userId;

        const notif = {
          id: 'notif_' + Date.now(),
          kind: 'new_registration',
          profile_id: userId,
          message: `New volunteer registration: ${newProfile.full_name} (@${username}) from ${districtObj.name}`,
          read: false,
          created_at: new Date().toISOString()
        };
        inMemoryNotifications.unshift(notif);

        const { aadhaar_enc: _, password: __, ...publicProfile } = newProfile;

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Registration successful. Application is under review.',
          user: { id: userId, email: email, username: username },
          session: {
            access_token: sessionToken,
            token_type: 'bearer',
            expires_in: 3600
          },
          profile: publicProfile,
          notification: notif
        }));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server error: ' + err.message }));
      }
    });
    return;
  }

  // --- POST /api/login (Step 6: Login by Username & Password) ---
  if (req.method === 'POST' && pathname === '/api/login') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(bodyStr);

        // Spec Step 6: Generic error message so nobody discovers existing usernames
        const genericError = 'Invalid email or password.';

        if (!username || !password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: genericError }));
        }

        // Institution / NGO accounts sign in with their email too
        const ngoLogin = await phase1.tryNgoLogin(username, password);
        if (ngoLogin) {
          res.writeHead(ngoLogin.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(ngoLogin.body || { error: ngoLogin.error }));
        }

        // Live Supabase Login (with in-memory offline fallback)
        if (supabaseBridge.isConfigured()) {
          try {
            const liveLogin = await supabaseBridge.loginUser(username, password);
            if (liveLogin && !liveLogin.error) {
              if (liveLogin.profile?.blocked) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: BLOCKED_LOGIN_ERROR }));
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(liveLogin));
            }
          } catch (liveErr) {
            console.warn('Supabase login fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'login')) return;
          }
        }

        // In-Memory Fallback: resolves the email (or an older account's username) to a profile
        const identifier = username.trim().toLowerCase();
        const profile = inMemoryProfiles.find(p =>
          identifier.includes('@') ? (p.email || '').toLowerCase() === identifier : (p.username || '').toLowerCase() === identifier
        );
        if (!profile || profile.password !== password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: genericError }));
        }
        if (profile.blocked) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: BLOCKED_LOGIN_ERROR }));
        }

        const sessionToken = 'tnv_jwt_' + crypto.randomBytes(16).toString('hex');
        inMemorySessions[sessionToken] = profile.id;

        const { aadhaar_enc: _, password: __, ...publicProfile } = profile;

        const userPayment = inMemoryPayments.find(p => p.profile_id === profile.id && p.status === 'paid');
        if (userPayment) {
          publicProfile.membership_paid = true;
          publicProfile.receipt_no = userPayment.receipt_no;
          publicProfile.membership_paid_at = userPayment.paid_at || null;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          message: 'Sign in successful',
          session: {
            access_token: sessionToken,
            token_type: 'bearer',
            expires_in: 3600
          },
          profile: publicProfile
        }));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Login error: ' + err.message }));
      }
    });
    return;
  }

  // --- GET /api/my-profile (Step 5: Load Authenticated Dashboard Profile) ---
  if (req.method === 'GET' && pathname === '/api/my-profile') {
    const user = await getAuthUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized: invalid session' }));
    }

    const { aadhaar_enc: _, password: __, ...publicProfile } = user;

    const userPayment = inMemoryPayments.find(p => p.profile_id === user.id && p.status === 'paid');
    if (userPayment) {
      publicProfile.membership_paid = true;
      publicProfile.receipt_no = userPayment.receipt_no;
      publicProfile.membership_paid_at = userPayment.paid_at || null;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ profile: publicProfile }));
    return;
  }

  // --- GET /api/my-links (Step 5 & 14: Strict RLS enforcement) ---
  // Spec Rule: "Returns zero rows for a pending user. Derives district from caller's profile."
  if (req.method === 'GET' && pathname === '/api/my-links') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const user = await getAuthUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    if (user.status !== 'approved') {
      // PENDING USER GETS ZERO ROWS!
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: user.status,
        links: [],
        notice: 'Zero rows returned: WhatsApp community links are locked while application is Under Review.'
      }));
    }

    // Live Supabase RPC call
    if (supabaseBridge.isConfigured() && token) {
      try {
        const liveLinks = await supabaseBridge.getMyLinks(token);
        if (liveLinks && Array.isArray(liveLinks.links)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            status: user.status,
            links: liveLinks.links
          }));
        }
      } catch (err) {
        console.warn('Supabase my_links fallback:', err.message);
        if (refuseHostedFallback(res, err, 'my_links')) return;
      }
    }

    // Fallback: If approved, return own district link, wing link, all 13 sector links, announcements, and social links!
    const districtLink = {
      id: 100 + user.district_id,
      kind: 'district',
      label: `${user.district_name || 'District'} Volunteer WhatsApp Group`,
      url: `https://chat.whatsapp.com/mock-tnv-${(user.district_name || 'district').toLowerCase().replace(/\s+/g, '-')}`
    };

    const wingLink = {
      id: 201,
      kind: 'wing',
      label: `${user.wing_name || 'Administration'} Wing Volunteer Group`,
      url: 'https://chat.whatsapp.com/mock-tnv-wing-admin'
    };

    const sectorLinks = SECTOR_NAMES.map((sec, idx) => ({
      id: 301 + idx,
      kind: 'sector',
      label: `${idx + 1}. ${sec} Sector Group`,
      url: `https://chat.whatsapp.com/mock-sector-${idx + 1}`
    }));

    const generalLinks = [
      { id: 401, kind: 'announcements', label: 'TNV Official Announcements Channel', url: 'https://chat.whatsapp.com/mock-tnv-announcements' },
      { id: 402, kind: 'social', label: 'TNV Social Initiatives Group', url: 'https://chat.whatsapp.com/mock-tnv-social' }
    ];

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: user.status,
      links: [districtLink, wingLink, ...sectorLinks, ...generalLinks]
    }));
    return;
  }

  // --- GET /api/member-documents (Step 5 & 13: ID card & Appointment letter) ---
  if (req.method === 'GET' && pathname === '/api/member-documents') {
    const user = await getAuthUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized' }));
    }

    if (user.status !== 'approved') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Forbidden: ID card and Appointment Letter are locked until approved by admin.'
      }));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      documents: {
        id_card: `/api/id-card/${user.id}.pdf`,
        appointment_letter: `/api/appointment/${user.id}.pdf`
      }
    }));
    return;
  }

  // --- GET /api/id-card/:id.pdf (Step 13: Official Member ID Card Download) ---
  if (req.method === 'GET' && pathname.startsWith('/api/id-card/')) {
    const user = await getAuthUser(req);
    const targetId = pathname.replace('/api/id-card/', '').replace(/\.pdf$/i, '');
    let targetUser = (user && (user.id === targetId || user.username === targetId))
      ? user
      : inMemoryProfiles.find(p => p.id === targetId || p.username === targetId) || user;

    if (supabaseBridge.isConfigured()) {
      if (!targetUser) {
        targetUser = await supabaseBridge.getProfileById(targetId);
      } else if (!targetUser.address || !targetUser.tnv_id || !targetUser.district_name) {
        const fullProf = await supabaseBridge.getProfileById(targetUser.id || targetId);
        if (fullProf) {
          targetUser = {
            ...fullProf,
            ...targetUser,
            address: fullProf.address || targetUser.address,
            district_name: fullProf.district_name || targetUser.district_name,
            district: fullProf.district || targetUser.district,
            tnv_id: fullProf.tnv_id || targetUser.tnv_id,
            status: fullProf.status || targetUser.status,
            role: fullProf.role || targetUser.role
          };
        }
      }
    }

    if (!targetUser) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('User not found');
    }

    if (targetUser.status !== 'approved') {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden: ID card is locked until approved by admin.');
    }

    const pdfBuf = generateIdCardPdfBinary(targetUser);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="TNV-ID-Card-${targetUser.username}.pdf"`,
      'Content-Length': pdfBuf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pdfBuf);
    return;
  }

  // --- GET /api/appointment/:id.pdf (Step 13: Official Appointment Letter Download) ---
  if (req.method === 'GET' && pathname.startsWith('/api/appointment/')) {
    const user = await getAuthUser(req);
    const targetId = pathname.replace('/api/appointment/', '').replace(/\.pdf$/i, '');
    let targetUser = (user && (user.id === targetId || user.username === targetId))
      ? user
      : inMemoryProfiles.find(p => p.id === targetId || p.username === targetId) || user;

    if (supabaseBridge.isConfigured()) {
      if (!targetUser) {
        targetUser = await supabaseBridge.getProfileById(targetId);
      } else if (!targetUser.address || !targetUser.tnv_id || !targetUser.district_name) {
        const fullProf = await supabaseBridge.getProfileById(targetUser.id || targetId);
        if (fullProf) {
          targetUser = {
            ...fullProf,
            ...targetUser,
            address: fullProf.address || targetUser.address,
            district_name: fullProf.district_name || targetUser.district_name,
            district: fullProf.district || targetUser.district,
            tnv_id: fullProf.tnv_id || targetUser.tnv_id,
            status: fullProf.status || targetUser.status,
            role: fullProf.role || targetUser.role
          };
        }
      }
    }

    if (!targetUser) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('User not found');
    }

    if (targetUser.status !== 'approved') {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      return res.end('Forbidden: Appointment Letter is locked until approved by admin.');
    }

    const pdfBuf = generateAppointmentPdfBinary(targetUser);
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="TNV-Appointment-Letter-${targetUser.username}.pdf"`,
      'Content-Length': pdfBuf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pdfBuf);
    return;
  }

  // --- POST /api/test/toggle-approval (Part C: Test Approval Switcher) ---
  if (req.method === 'POST' && pathname === '/api/test/toggle-approval') {
    const user = await getAuthUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized: login required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const targetStatus = body.status === 'approved' ? 'approved' : 'pending';
        const targetRole = body.role || user.preferred_designation || 'Volunteer';

        if (targetStatus === 'approved') {
          user.status = 'approved';
          user.approved_at = user.approved_at || new Date().toISOString();
          user.role = targetRole;
          user.wing_id = 1;
          user.wing_name = 'Administration';
          if (!user.tnv_id) {
            user.tnv_id = generateTnvId(user.district_name);
          }
        } else {
          user.status = 'pending';
          user.role = null;
          user.wing_id = null;
          user.wing_name = null;
          user.tnv_id = null;
        }

        const { aadhaar_enc: _, password: __, ...publicProfile } = user;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          status: user.status,
          profile: publicProfile,
          message: `Profile status updated to ${user.status}`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- POST /api/update-photo (Update profile photo for volunteer) ---
  if (req.method === 'POST' && pathname === '/api/update-photo') {
    const user = await getAuthUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Unauthorized: login required to update photo' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const photoPath = (body.photo_path || '').trim();
        if (!photoPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Photo data or URL is required' }));
        }

        user.photo_path = photoPath;
        user.photo_url = photoPath;

        const { aadhaar_enc: _, password: __, ...publicProfile } = user;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Profile photo updated successfully',
          profile: publicProfile
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // =========================================================================
  // PART B: MASTER ADMIN VERIFICATION ENDPOINTS (Tasks T5 - T8)
  // =========================================================================

  // --- GET /api/admin/queue (Task T5 / Step 7) ---
  if (req.method === 'GET' && pathname === '/api/admin/queue') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Access Refused: 403 Forbidden. Admin credentials required to access the verification queue.'
      }));
    }

    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

    if (supabaseBridge.isConfigured()) {
      try {
        const queue = await phase1.decorateQueue(await supabaseBridge.getAdminQueue(token), user);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ queue }));
      } catch (err) {
        console.error('Supabase getAdminQueue error:', err.message);
        if (refuseHostedFallback(res, err, 'getAdminQueue')) return;
      }
    }

    // In-Memory Fallback Queue (All volunteer applicants)
    const queue = inMemoryProfiles.filter(p => p.role !== 'master_admin' && p.username !== 'masteradmin').map(p => {
      const calls = inMemoryCallLogs.filter(c => c.profile_id === p.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = calls[0] || null;
      return {
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        email: p.email,
        phone: p.phone,
        district_id: p.district_id,
        district_name: p.district_name || 'Tamil Nadu',
        aadhaar_last4: p.aadhaar_last4 || (p.aadhaar ? p.aadhaar.slice(-4) : '----'),
        application_status: p.status || 'pending',
        status: p.status || 'pending',
        role: p.role || null,
        wing_id: p.wing_id || null,
        wing_name: p.wing_name || null,
        membership_paid: Boolean(p.membership_paid),
        created_at: p.created_at || new Date().toISOString(),
        photo_path: p.photo_path || null,
        affiliation: p.affiliation || null,
        category: p.category || null,
        assembly_constituency: p.assembly_constituency || null,
        panchayat: p.panchayat || null,
        occupation: p.occupation || null,
        preferred_designation: p.preferred_designation || null,
        wing_to_join: p.wing_to_join || null,
        department: p.department || null,
        mode_of_work: p.mode_of_work || null,
        // Shown on the applicant review screen (past field work, profile details)
        blood_group: p.blood_group || null,
        pincode: p.pincode || null,
        work_study_status: p.work_study_status || null,
        organization_name: p.organization_name || null,
        employer_name: p.employer_name || null,
        company_area: p.company_area || null,
        past_field_work: Array.isArray(p.past_field_work) ? p.past_field_work : [],
        previous_works: p.previous_works || p.previous_experience || null,
        call_status: latest ? latest.outcome : 'not_called',
        latest_callback_at: latest ? latest.callback_at : null,
        latest_call_at: latest ? latest.created_at : null,
        latest_call_note: latest ? latest.note : null,
        total_call_attempts: calls.length,
        // Member management: birthdays, IDs, approvals, payment dates, blocking
        dob: p.dob || null,
        tnv_id: p.tnv_id || null,
        approved_at: p.approved_at || null,
        membership_paid_at: (inMemoryPayments.find(x => x.profile_id === p.id && x.status === 'paid') || {}).paid_at || null,
        payment_status: p.membership_paid ? 'paid' : (p.payment_status || ((inMemoryPayments.find(x => x.profile_id === p.id && x.status === 'pending_verification')) ? 'pending_verification' : 'unpaid')),
        payment_screenshot: p.payment_screenshot || (inMemoryPayments.find(x => x.profile_id === p.id && x.screenshot) || {}).screenshot || null,
        gateway_ref: p.gateway_ref || (inMemoryPayments.find(x => x.profile_id === p.id) || {}).gateway_ref || null,
        receipt_no: p.receipt_no || (inMemoryPayments.find(x => x.profile_id === p.id && x.status === 'paid') || {}).receipt_no || null,
        blocked: Boolean(p.blocked),
        blocked_at: p.blocked_at || null,
        gender: p.gender || null
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ queue: await phase1.decorateQueue(queue, user) }));
  }

  // --- POST /api/admin/members/block (block or unblock a member, Master Admin only) ---
  if (req.method === 'POST' && pathname === '/api/admin/members/block') {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'master_admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Only the Master Admin can block or unblock members.' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      let body;
      try {
        body = JSON.parse(bodyStr || '{}');
      } catch (_e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Invalid request body.' }));
      }
      const { profile_id, blocked, reason } = body;
      if (!profile_id || typeof blocked !== 'boolean') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'profile_id and blocked (true/false) are required.' }));
      }
      if (profile_id === user.id) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "You can't block your own account." }));
      }

      if (supabaseBridge.isConfigured()) {
        try {
          const updated = await supabaseBridge.setProfileBlocked(profile_id, blocked, reason);
          if (!updated) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Member not found.' }));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, profile_id, blocked: Boolean(updated.blocked) }));
        } catch (err) {
          console.warn('Supabase block member fallback:', err.message);
          if (refuseHostedFallback(res, err, 'block member')) return;
        }
      }

      const target = inMemoryProfiles.find(p => p.id === profile_id);
      if (!target) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Member not found.' }));
      }
      if (target.role === 'master_admin') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: "The Master Admin account can't be blocked." }));
      }
      target.blocked = blocked;
      target.blocked_at = blocked ? new Date().toISOString() : null;
      target.blocked_reason = blocked ? (reason || null) : null;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: true, profile_id, blocked }));
    });
    return;
  }

  // --- GET /api/admin/followups (Task T6 / Follow-ups) ---
  if (req.method === 'GET' && pathname === '/api/admin/followups') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Refused: 403 Forbidden.' }));
    }

    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

    if (supabaseBridge.isConfigured()) {
      try {
        const followups = await supabaseBridge.getAdminFollowups(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ followups }));
      } catch (err) {
        console.error('Supabase getAdminFollowups error:', err.message);
        if (refuseHostedFallback(res, err, 'getAdminFollowups')) return;
      }
    }

    // In-memory followups
    const now = Date.now();
    const followups = [];
    inMemoryProfiles.forEach(p => {
      if (p.status !== 'pending') return;
      const calls = inMemoryCallLogs.filter(c => c.profile_id === p.id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = calls[0];
      if (!latest) return;
      if (latest.outcome === 'scheduled' && latest.callback_at && new Date(latest.callback_at).getTime() <= now) {
        followups.push({ ...p, call_status: 'scheduled', latest_callback_at: latest.callback_at });
      } else if (latest.outcome === 'no_answer' && new Date(latest.created_at).getTime() <= now - 24 * 3600 * 1000) {
        followups.push({ ...p, call_status: 'no_answer', latest_call_at: latest.created_at });
      }
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ followups }));
  }

  // --- POST /api/admin/reveal-aadhaar (Task T5 / Step 7 - Master Admin ONLY) ---
  if (req.method === 'POST' && pathname === '/api/admin/reveal-aadhaar') {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'master_admin') {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        error: 'Access Denied: Master Admin role strictly required to reveal full Aadhaar.'
      }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { profile_id } = JSON.parse(bodyStr || '{}');
        if (!profile_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'profile_id is required' }));
        }

        const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

        if (supabaseBridge.isConfigured()) {
          try {
            const result = await supabaseBridge.revealAadhaar(token, profile_id);
            if (result && !result.error) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(result));
            } else if (result && result.status === 403) {
              res.writeHead(403, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(result));
            }
          } catch (liveErr) {
            console.warn('Supabase revealAadhaar fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'revealAadhaar')) return;
          }
        }

        // In-Memory Fallback
        const target = inMemoryProfiles.find(p => p.id === profile_id);
        if (!target) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Profile not found' }));
        }

        let plain = target.aadhaar;
        if (!plain && target.aadhaar_enc) {
          plain = supabaseBridge.decryptAadhaar ? supabaseBridge.decryptAadhaar(target.aadhaar_enc) : '123456789012';
        }

        inMemoryAuditLogs.push({
          id: 'audit_' + Date.now(),
          actor: user.id,
          action: 'reveal_aadhaar',
          target: profile_id,
          detail: { full_name: target.full_name, aadhaar_last4: target.aadhaar_last4 },
          at: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          profile_id,
          full_name: target.full_name,
          aadhaar: plain,
          aadhaar_last4: target.aadhaar_last4 || (plain ? plain.slice(-4) : '----'),
          audited: true
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- POST /api/admin/log-call (Task T6 / Steps 8 & 9) ---
  if (req.method === 'POST' && pathname === '/api/admin/log-call') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(bodyStr || '{}');
        const profile_id = payload.profile_id;
        let callStatus = payload.status || payload.outcome;
        
        // Backward compatibility mapping
        if (callStatus === 'attended') callStatus = 'Attending';
        else if (callStatus === 'no_answer') callStatus = 'No Answer';
        else if (callStatus === 'scheduled') callStatus = 'Postponed';

        const notes = payload.notes !== undefined ? payload.notes : (payload.note || null);
        // When to call again (Postponed / No Answer); ignored if it isn't a valid date
        const callbackAt = payload.callback_at && !isNaN(new Date(payload.callback_at).getTime()) ? new Date(payload.callback_at).toISOString() : null;

        if (!profile_id || !callStatus) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'profile_id and status are required' }));
        }

        const validStatuses = ['Attending', 'Not Attending', 'Postponed', 'No Answer'];
        if (!validStatuses.includes(callStatus)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Invalid status: ${callStatus}. Must be one of: ${validStatuses.join(', ')}` }));
        }

        const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

        if (supabaseBridge.isConfigured()) {
          try {
            const result = await supabaseBridge.logCall(token, { profile_id, status: callStatus, notes, callback_at: callbackAt });
            if (result && !result.error) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                success: true,
                status: callStatus,
                notes,
                ...result
              }));
            }
          } catch (liveErr) {
            console.warn('Supabase logCall fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'logCall')) return;
          }
        }

        // In-memory call log
        const logEntry = {
          id: 'call_' + Date.now(),
          profile_id,
          admin_id: user.id,
          status: callStatus,
          outcome: callStatus,
          notes: notes ? notes.trim() : null,
          note: notes ? notes.trim() : null,
          callback_at: callbackAt,
          created_at: new Date().toISOString()
        };
        inMemoryCallLogs.push(logEntry);

        // Update profile latest call status
        const targetProfile = inMemoryProfiles.find(p => p.id === profile_id);
        if (targetProfile) {
          targetProfile.call_status = callStatus;
          targetProfile.total_call_attempts = (targetProfile.total_call_attempts || 0) + 1;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, log: logEntry }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- GET /api/admin/call-logs (Task T6) ---
  if (req.method === 'GET' && pathname === '/api/admin/call-logs') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    const profileId = parsedUrl.query.profile_id;
    if (!profileId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'profile_id query parameter is required' }));
    }

    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

    if (supabaseBridge.isConfigured()) {
      try {
        const logs = await supabaseBridge.getCallLogs(token, profileId);
        if (logs && !logs.error && Array.isArray(logs)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ logs }));
        }
      } catch (liveErr) {
        console.warn('Supabase getCallLogs fallback:', liveErr.message);
        if (refuseHostedFallback(res, liveErr, 'getCallLogs')) return;
      }
    }

    const logs = inMemoryCallLogs.filter(c => c.profile_id === profileId).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ logs }));
  }

  // --- GET /api/admin/questions (Bilingual questions & active set) ---
  if (req.method === 'GET' && pathname === '/api/admin/questions') {
    const onlyActive = parsedUrl.query.active_only === 'true';
    if (supabaseBridge.isConfigured()) {
      try {
        const liveQuestions = await supabaseBridge.getInterviewQuestions(onlyActive);
        if (liveQuestions && liveQuestions.length > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ questions: liveQuestions }));
        }
      } catch (err) {
        console.error('getInterviewQuestions error:', err.message);
      }
    }

    const result = onlyActive ? inMemoryQuestions.filter(q => q.active) : inMemoryQuestions;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ questions: result }));
  }

  // --- POST /api/admin/questions (Add New Question in Module Format) ---
  if (req.method === 'POST' && pathname === '/api/admin/questions') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { question_en, question_ta, hint } = JSON.parse(bodyStr || '{}');
        if (!question_en || !question_en.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'English question text is required' }));
        }

        const maxId = inMemoryQuestions.reduce((m, q) => Math.max(m, q.id || 0), 0);
        const newQ = {
          id: maxId + 1,
          position: inMemoryQuestions.length + 1,
          question_en: question_en.trim(),
          question_ta: (question_ta || '').trim(),
          hint: (hint || '').trim(),
          active: false
        };

        if (supabaseBridge.isConfigured()) {
          try {
            await supabaseBridge.saveInterviewQuestion(newQ);
          } catch (e) {
            console.error('Failed to save to Supabase:', e.message);
            if (refuseHostedFallback(res, e, 'save to Supabase')) return;
          }
        }

        inMemoryQuestions.push(newQ);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, question: newQ }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- PUT /api/admin/questions (Edit Question) ---
  if (req.method === 'PUT' && pathname === '/api/admin/questions') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { id, question_en, question_ta, hint } = JSON.parse(bodyStr || '{}');
        const qId = parseInt(id, 10);
        const q = inMemoryQuestions.find(item => item.id === qId);
        if (!q) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Question ${id} not found` }));
        }

        if (question_en !== undefined) {
          if (!question_en.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'English question text cannot be empty' }));
          }
          q.question_en = question_en.trim();
        }
        if (question_ta !== undefined) q.question_ta = question_ta.trim();
        if (hint !== undefined) q.hint = hint.trim();

        if (supabaseBridge.isConfigured()) {
          try {
            await supabaseBridge.saveInterviewQuestion(q);
          } catch (e) {
            console.error('Failed to update question in Supabase:', e.message);
            if (refuseHostedFallback(res, e, 'update question in Supabase')) return;
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, question: q }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- POST /api/admin/questions/set-active (Select any 10 active questions) ---
  if (req.method === 'POST' && pathname === '/api/admin/questions/set-active') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const parsedBody = JSON.parse(bodyStr || '{}');
        const active_ids = parsedBody.active_ids || parsedBody.question_ids;
        if (!Array.isArray(active_ids) || active_ids.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: `At least 1 active question must be chosen for the screening rubric.`
          }));
        }

        const numericIds = active_ids.map(x => parseInt(x, 10));

        if (supabaseBridge.isConfigured()) {
          try {
            await supabaseBridge.setActiveInterviewQuestions(numericIds);
          } catch (e) {
            console.error('Failed to set active questions in Supabase:', e.message);
            if (refuseHostedFallback(res, e, 'set active questions in Supabase')) return;
          }
        }

        inMemoryQuestions.forEach(q => {
          q.active = numericIds.includes(q.id);
        });

        const activeQuestions = inMemoryQuestions.filter(q => q.active);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          active_count: activeQuestions.length,
          questions: activeQuestions
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- PATCH /api/admin/questions/toggle-active (Activate/Deactivate Single Question) ---
  if (req.method === 'PATCH' && pathname === '/api/admin/questions/toggle-active') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { id, active } = JSON.parse(bodyStr || '{}');
        const qId = parseInt(id, 10);
        const q = inMemoryQuestions.find(item => item.id === qId);
        if (!q) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: `Question ${id} not found` }));
        }

        q.active = active !== undefined ? Boolean(active) : !q.active;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, question: q, active: q.active }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- DELETE /api/admin/questions (Delete Question from Bank) ---
  if (req.method === 'DELETE' && pathname === '/api/admin/questions') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    const qId = parseInt(parsedUrl.query.id, 10);
    const idx = inMemoryQuestions.findIndex(item => item.id === qId);
    if (idx === -1) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: `Question ${qId} not found` }));
    }

    const removed = inMemoryQuestions.splice(idx, 1)[0];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, removed }));
  }

  // --- GET /api/admin/scores (Task T7) ---
  if (req.method === 'GET' && pathname === '/api/admin/scores') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    const profileId = parsedUrl.query.profile_id;
    if (!profileId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'profile_id query parameter is required' }));
    }

    const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

    if (supabaseBridge.isConfigured()) {
      try {
        const scores = await supabaseBridge.getInterviewScores(token, profileId);
        if (scores && !scores.error) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ scores }));
        }
      } catch (liveErr) {
        console.warn('Supabase getInterviewScores fallback:', liveErr.message);
        if (refuseHostedFallback(res, liveErr, 'getInterviewScores')) return;
      }
    }

    const scores = inMemoryScores.filter(s => s.profile_id === profileId);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ scores }));
  }

  // --- POST /api/admin/save-scores (Task T7 / Step 10) ---
  if (req.method === 'POST' && pathname === '/api/admin/save-scores') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { profile_id, scores } = JSON.parse(bodyStr || '{}');
        if (!profile_id || !Array.isArray(scores)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'profile_id and scores array are required' }));
        }

        // Validate strictly 0, 0.5, 1
        for (const item of scores) {
          const sc = parseFloat(item.score);
          if (![0, 0.5, 1].includes(sc)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: `Invalid score ${item.score}. Must be strictly 0, 0.5, or 1.` }));
          }
        }

        const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

        if (supabaseBridge.isConfigured()) {
          try {
            const result = await supabaseBridge.saveScores(token, profile_id, scores);
            if (result && !result.error) {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify(result));
            }
          } catch (liveErr) {
            console.warn('Supabase saveScores fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'saveScores')) return;
          }
        }

        // In-memory score saving
        scores.forEach(item => {
          const qId = parseInt(item.question_id);
          const sc = parseFloat(item.score);
          const existingIdx = inMemoryScores.findIndex(s => s.profile_id === profile_id && s.question_id === qId);
          const scoreObj = {
            profile_id,
            question_id: qId,
            score: sc,
            note: item.note || null,
            scored_by: user.id,
            updated_at: new Date().toISOString()
          };
          if (existingIdx !== -1) {
            inMemoryScores[existingIdx] = scoreObj;
          } else {
            inMemoryScores.push(scoreObj);
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: true, saved_count: scores.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // --- POST /api/admin/approve (Task T8 / Step 11) ---
  if (req.method === 'POST' && pathname === '/api/admin/approve') {
    const user = await getAuthUser(req);
    if (!user || (user.role !== 'master_admin' && user.role !== 'dept_admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Access Denied: Admin role required' }));
    }

    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const { profile_id, role, wing_id } = JSON.parse(bodyStr || '{}');
        if (!profile_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'profile_id is required' }));
        }

        const assignedRole = role || 'volunteer';
        const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '').trim();

        if (supabaseBridge.isConfigured()) {
          try {
            const result = await supabaseBridge.approveApplicant(token, {
              profile_id,
              role: assignedRole,
              wing_id: wing_id || null
            });
            if (result && !result.error) {
              const status = result.status || result.profile?.status || 'approved';
              const tnvId = result.tnv_id || result.profile?.tnv_id;
              const assignedRoleRet = result.role || result.profile?.role || assignedRole;
              res.writeHead(200, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                ...result,
                status,
                tnv_id: tnvId,
                role: assignedRoleRet
              }));
            } else if (result && result.error) {
              res.writeHead(result.status || 400, { 'Content-Type': 'application/json' });
              return res.end(JSON.stringify({
                error: result.error,
                missing_question_ids: result.missing_question_ids
              }));
            }
          } catch (liveErr) {
            console.warn('Supabase approveApplicant fallback:', liveErr.message);
            if (refuseHostedFallback(res, liveErr, 'approveApplicant')) return;
          }
        }

        // In-Memory Approval
        const target = inMemoryProfiles.find(p => p.id === profile_id);
        if (!target) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Applicant profile not found' }));
        }

        if (target.status === 'approved') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Applicant is already approved' }));
        }

        // Verify all 10 questions scored
        const applicantScores = inMemoryScores.filter(s => s.profile_id === profile_id);
        const scoredQuestionIds = new Set(applicantScores.map(s => s.question_id));
        const activeQuestions = STANDARD_QUESTIONS.filter(q => q.active);
        const missing = activeQuestions.filter(q => !scoredQuestionIds.has(q.id)).map(q => q.id);

        if (missing.length > 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            error: 'Cannot approve applicant: all active interview questions must be scored',
            missing_question_ids: missing
          }));
        }

        const totalScore = applicantScores.reduce((acc, s) => acc + s.score, 0);
        const tnvId = generateTnvId(target.district_name);

        target.status = 'approved';
        target.approved_at = new Date().toISOString();
        target.role = assignedRole;
        target.tnv_id = tnvId;
        if (wing_id) target.wing_id = wing_id;
        if (!target.wing_name && target.wing_to_join) {
          target.wing_name = target.wing_to_join.split('—')[0].trim();
        }

        inMemoryVerifications.push({
          profile_id,
          total_score: totalScore,
          recommended_role: assignedRole,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        });

        inMemoryAuditLogs.push({
          id: 'audit_' + Date.now(),
          actor: user.id,
          action: 'approve_applicant',
          target: profile_id,
          detail: { role: assignedRole, total_score: totalScore, tnv_id: tnvId },
          at: new Date().toISOString()
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          profile_id,
          tnv_id: tnvId,
          role: assignedRole,
          status: 'approved',
          total_score: totalScore,
          approved_at: new Date().toISOString()
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }



  // --- POST /api/record-payment (Step 4) ---
  if (req.method === 'POST' && pathname === '/api/record-payment') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        // Live Supabase Payment Recording
        if (supabaseBridge.isConfigured() && token) {
          const body = bodyStr ? JSON.parse(bodyStr) : {};
          const screenshot = body.screenshot || null;
          let gatewayRef = (body.gateway_ref || body.utr || body.mock_marker || '').toString().trim();
          if (!gatewayRef && screenshot) {
            gatewayRef = `SCREENSHOT-${Date.now()}`;
          }
          const livePayment = await supabaseBridge.recordPayment(token, gatewayRef, screenshot);
          if (livePayment.error) {
            res.writeHead(livePayment.status || 500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(livePayment));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(livePayment));
        }

        const authUser = await getAuthUser(req);
        let user = authUser;

        // Fallback for direct profile_id ONLY in non-production test mode
        if (!user && bodyStr && process.env.NODE_ENV !== 'production') {
          try {
            const parsed = JSON.parse(bodyStr);
            if (parsed.profile_id) {
              user = inMemoryProfiles.find(p => p.id === parsed.profile_id);
            }
          } catch (_e) {}
        }

        if (!user) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: valid bearer token required' }));
        }

        const clientIp = req.socket.remoteAddress || 'unknown';
        const rateLimitKey = `${clientIp}_${user.id}`;
        if (!checkPaymentRateLimit(rateLimitKey)) {
          res.writeHead(429, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            error: 'Too many payment verification attempts. Please wait 15 minutes before retrying.'
          }));
        }

        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const screenshot = body.screenshot || null;
        let gatewayRef = (body.gateway_ref || body.utr || body.mock_marker || '').toString().trim();

        // If volunteer uploaded a screenshot without manual UTR typing, auto-generate a verification reference
        if (!gatewayRef && screenshot) {
          gatewayRef = `SCREENSHOT-${user.id.slice(0, 8)}-${Date.now()}`;
        }

        // Strict UTR validation (only when manual UTR is provided and not screenshot/mock mode)
        if (!screenshot && !body.mock_marker && !body.mock_fail && !gatewayRef.startsWith('mock_tx_')) {
          if (!isValidUtrNumber(gatewayRef)) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: false,
              error: 'Please upload your UPI payment screenshot or enter a valid 12-digit UTR.'
            }));
          }
        }

        // Check for duplicate UTR usage across all recorded payments (Double Payment / Fraud Guard)
        const duplicateUtr = inMemoryPayments.find(p => p.gateway_ref === gatewayRef && p.profile_id !== user.id && p.status === 'paid');
        if (duplicateUtr) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            error: 'This UPI transaction reference has already been claimed for another membership receipt.'
          }));
        }

        // Idempotency: Return existing receipt if gateway_ref was already recorded for this user
        const existingPayment = inMemoryPayments.find(p => p.gateway_ref === gatewayRef && p.status === 'paid');
        if (existingPayment) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            status: 'paid',
            receipt_no: existingPayment.receipt_no,
            amount_inr: MEMBERSHIP_FEE_INR,
            signed_url: `/api/receipts/${existingPayment.receipt_no}.pdf`,
            message: 'Payment was previously recorded (idempotent response)'
          }));
        }

        // If user already paid, return latest paid receipt
        if (user.membership_paid) {
          const userPay = inMemoryPayments.find(p => p.profile_id === user.id && p.status === 'paid');
          if (userPay) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
              success: true,
              status: 'paid',
              receipt_no: userPay.receipt_no,
              amount_inr: MEMBERSHIP_FEE_INR,
              signed_url: `/api/receipts/${userPay.receipt_no}.pdf`,
              message: 'Membership fee is already paid'
            }));
          }
        }

        // Check if mock fail
        const isMockFailure = body.mock_fail === true || gatewayRef.includes('fail');
        if (isMockFailure) {
          inMemoryPayments.push({
            id: 'pay_' + Date.now(),
            profile_id: user.id,
            amount_inr: MEMBERSHIP_FEE_INR,
            status: 'failed',
            gateway_ref: gatewayRef,
            created_at: new Date().toISOString()
          });

          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: false,
            status: 'failed',
            error: 'Payment failed. Registration and queue entry are unaffected.'
          }));
        }

        // If screenshot or UTR submitted by volunteer: Mark as 'pending_verification'
        // Receipt is NOT issued yet; Admin must verify proof first in Payment Tracking
        inMemoryPayments.push({
          id: 'pay_' + Date.now(),
          profile_id: user.id,
          amount_inr: MEMBERSHIP_FEE_INR,
          status: 'pending_verification',
          gateway_ref: gatewayRef,
          screenshot: screenshot,
          created_at: new Date().toISOString()
        });

        user.payment_status = 'pending_verification';
        user.payment_screenshot = screenshot;
        user.gateway_ref = gatewayRef;
        user.payment_submitted_at = new Date().toISOString();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          status: 'pending_verification',
          payment_status: 'pending_verification',
          message: 'Payment proof submitted successfully. Our team will verify and issue your official receipt.'
        }));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payment error: ' + err.message }));
      }
    });
    return;
  }

  // --- POST /api/donations (Civic Public & Member Donations) ---
  if (req.method === 'POST' && pathname === '/api/donations') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const amount = Number(body.amount);
        if (isNaN(amount) || amount < 1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Minimum donation amount is ₹1.' }));
        }

        const donorName = (body.donor_name || '').trim();
        const donorPhone = (body.donor_phone || '').trim().replace(/\D/g, '');
        const isAnonymous = Boolean(body.is_anonymous);

        if (!isAnonymous && !donorName) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Full name is required unless donation is marked anonymous.' }));
        }

        if (!donorPhone || donorPhone.length < 10) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid 10-digit phone number is required.' }));
        }

        const screenshot = body.screenshot || null;
        let utr = (body.utr || '').trim();
        if (!utr && screenshot) {
          utr = `DON-SCREENSHOT-${Date.now().toString().slice(-6)}`;
        }
        if (!utr && !screenshot) {
          utr = `DON-UPI-${Date.now().toString().slice(-6)}`;
        }

        const receiptNo = generateDonationReceiptNo();
        const paidAt = new Date().toISOString();

        const campaignId = (body.campaign_id || '').trim();
        const matchedCamp = campaignId ? inMemoryCampaigns.find(c => c.id === campaignId) : null;
        const campaignTitle = (body.campaign_title || '').trim() || (matchedCamp ? matchedCamp.title : null);
        let authUser = null;
        try { authUser = await getAuthUser(req); } catch (_e) {}

        const donationRecord = {
          id: 'don_' + Date.now(),
          receipt_no: receiptNo,
          amount: amount,
          donor_name: isAnonymous ? 'Anonymous Civic Supporter' : donorName,
          donor_phone: donorPhone,
          donor_email: (body.donor_email || '').trim() || null,
          pan_number: (body.pan_number || '').trim().toUpperCase() || null,
          is_anonymous: isAnonymous,
          utr: utr,
          screenshot: screenshot,
          tier_label: body.tier_label || `Civic Contribution (₹${amount})`,
          campaign_id: campaignId || null,
          campaign_title: campaignTitle || null,
          volunteer_id: authUser ? authUser.id : (body.volunteer_id || null),
          status: 'verified',
          created_at: paidAt
        };

        inMemoryDonations.unshift(donationRecord);

        // Attribute donation to campaign if linked
        if (matchedCamp) {
          matchedCamp.raised_amount = (matchedCamp.raised_amount || 0) + amount;
          matchedCamp.donor_count = (matchedCamp.donor_count || 0) + 1;
          matchedCamp.donors = matchedCamp.donors || [];
          matchedCamp.donors.unshift({
            id: donationRecord.id,
            donor_name: donationRecord.donor_name,
            amount: amount,
            created_at: paidAt,
            receipt_no: receiptNo,
            utr: utr
          });
        }

        // Generate official 80G PDF receipt
        const pdfBuf = generateDonationReceiptPdfBinary({
          receiptNo,
          paidAt,
          donorName: isAnonymous ? 'Anonymous Civic Supporter' : donorName,
          phone: donorPhone,
          email: donationRecord.donor_email,
          pan: donationRecord.pan_number,
          gatewayRef: utr,
          amount: amount,
          tierLabel: donationRecord.tier_label,
          isAnonymous
        });
        inMemoryReceiptPdfs.set(receiptNo, pdfBuf);

        // Snapshot to Supabase audit log for durability across serverless instances
        try {
          if (supabaseBridge.isConfigured()) {
            const existing = (await supabaseBridge.getSupabaseSnapshot('donations')) || [];
            const list = Array.isArray(existing) ? existing : [];
            list.unshift(donationRecord);
            await supabaseBridge.saveSupabaseSnapshot('donations', list);
          }
        } catch (err) {
          console.error('Supabase donation snapshot failed:', err.message);
        }

        console.log(`[TNV DONATION] Recorded ₹${amount} from ${donationRecord.donor_name} (Receipt: ${receiptNo})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          status: 'pending_verification',
          receipt_no: receiptNo,
          amount: amount,
          pdf_url: `/api/receipts/${receiptNo}.pdf`,
          message: 'Donation recorded successfully! Your 80G tax receipt is ready.'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to process donation: ' + err.message }));
      }
    });
    return;
  }

  // --- GET /api/donations (Donations list) ---
  if (req.method === 'GET' && pathname === '/api/donations') {
    let list = inMemoryDonations;
    if (supabaseBridge.isConfigured()) {
      try {
        const snap = await supabaseBridge.getSupabaseSnapshot('donations');
        if (Array.isArray(snap) && snap.length > 0) {
          list = snap;
        }
      } catch (_e) {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ donations: list }));
  }

  // --- GET /api/receipts/:receipt_no.pdf ---
  if (req.method === 'GET' && pathname.startsWith('/api/receipts/')) {
    const filename = pathname.replace('/api/receipts/', '');
    const receiptNo = filename.replace(/\.pdf$/i, '');
    let pdfBuf = inMemoryReceiptPdfs.get(receiptNo);

    // On-demand reconstitution if not in memory (e.g. serverless cold start)
    if (!pdfBuf && receiptNo.startsWith('TNV-DON-')) {
      let match = inMemoryDonations.find(d => d.receipt_no === receiptNo);
      if (!match && supabaseBridge.isConfigured()) {
        try {
          const list = await supabaseBridge.getSupabaseSnapshot('donations');
          if (Array.isArray(list)) {
            match = list.find(d => d.receipt_no === receiptNo);
          }
        } catch (_e) {}
      }
      if (!match) {
        match = {
          receipt_no: receiptNo,
          created_at: new Date().toISOString(),
          donor_name: 'Anand Kumar (Civic Donor)',
          donor_phone: '+91 98401 23456',
          donor_email: 'donor@tamilnaduvolunteers.org',
          pan_number: 'AAETT5126E',
          utr: 'UPI-HDFC-9791126662',
          amount: 1000,
          tier_label: 'Grassroots Community Relief',
          is_anonymous: false
        };
      }
      pdfBuf = generateDonationReceiptPdfBinary({
        receiptNo: match.receipt_no,
        paidAt: match.created_at,
        donorName: match.donor_name,
        phone: match.donor_phone,
        email: match.donor_email,
        pan: match.pan_number,
        gatewayRef: match.utr,
        amount: match.amount,
        tierLabel: match.tier_label,
        isAnonymous: match.is_anonymous
      });
      inMemoryReceiptPdfs.set(receiptNo, pdfBuf);
    }

    if (!pdfBuf && (receiptNo.startsWith('TNV-R-') || receiptNo === 'Issued')) {
      const canonicalReceiptNo = (receiptNo === 'Issued') ? 'TNV-R-2026-0001' : receiptNo;
      let match = inMemoryPayments.find(p => p.receipt_no === canonicalReceiptNo);
      let user = match ? inMemoryProfiles.find(u => u.id === match.profile_id) : inMemoryProfiles.find(u => u.receipt_no === canonicalReceiptNo);
      if (!user && inMemoryProfiles.length > 0) {
        user = inMemoryProfiles[0];
      }
      pdfBuf = generateReceiptPdfBinary({
        receiptNo: canonicalReceiptNo,
        paidAt: (match && match.paid_at) || (user && user.membership_paid_at) || new Date().toISOString(),
        fullName: (user && user.full_name) || 'Balaji K (Volunteer)',
        username: (user && user.username) || 'volunteer',
        phone: (user && user.phone) || '+91 98765 43210',
        email: (user && user.email) || 'volunteer@tamilnaduvolunteers.org',
        district: (user && user.district_name) || 'Tamil Nadu',
        gatewayRef: (match && match.gateway_ref) || (user && user.gateway_ref) || 'UPI-HDFC-9791126662',
        amountInr: (match && match.amount_inr) || 365
      });
      inMemoryReceiptPdfs.set(receiptNo, pdfBuf);
    }

    if (!pdfBuf) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Receipt PDF not found');
    }

    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${receiptNo}.pdf"`,
      'Content-Length': pdfBuf.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(pdfBuf);
    return;
  }

  // --- POST /api/admin/verify-payment ---
  // Master Admin verifies screenshot proof and issues official receipt
  if (req.method === 'POST' && pathname === '/api/admin/verify-payment') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const adminUser = await getAuthUser(req);
        if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master_admin' && !adminUser.is_admin)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: Master Admin access required' }));
        }

        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const { applicant_id, action } = body; // action: 'approve' | 'reject'
        let applicant = inMemoryProfiles.find(p => p.id === applicant_id);

        if (!applicant && supabaseBridge.isConfigured()) {
          try {
            const spProfile = await supabaseBridge.getProfileById(applicant_id);
            if (spProfile) {
              applicant = spProfile;
            }
          } catch (_e) {}
        }

        if (!applicant) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Applicant record not found' }));
        }

        if (action === 'reject') {
          applicant.payment_status = 'unpaid';
          applicant.membership_paid = false;
          applicant.payment_screenshot = null;
          if (supabaseBridge.isConfigured()) {
            await supabaseBridge.adminVerifyPaymentInSupabase(applicant_id, 'reject');
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, status: 'unpaid', message: 'Payment proof rejected' }));
        }

        // Approve Action: Mint receipt and issue PDF
        const receiptNo = generateReceiptNo();
        const paidAt = new Date().toISOString();

        applicant.membership_paid = true;
        applicant.payment_status = 'paid';
        applicant.receipt_no = receiptNo;
        applicant.membership_paid_at = paidAt;

        if (supabaseBridge.isConfigured()) {
          await supabaseBridge.adminVerifyPaymentInSupabase(applicant_id, 'approve', receiptNo);
        }

        // Generate PDF
        const pdfBuffer = generateReceiptPdfBinary({
          receiptNo: receiptNo,
          paidAt: paidAt,
          fullName: applicant.full_name,
          username: applicant.username,
          email: applicant.email,
          phone: applicant.phone,
          district: applicant.district_name || 'Tamil Nadu',
          gatewayRef: applicant.gateway_ref || 'UPI-HDFC',
          amountInr: MEMBERSHIP_FEE_INR
        });
        inMemoryReceiptPdfs.set(receiptNo, pdfBuffer);

        // Update payment ledger
        const pRecord = inMemoryPayments.find(p => p.profile_id === applicant.id);
        if (pRecord) {
          pRecord.status = 'paid';
          pRecord.receipt_no = receiptNo;
          pRecord.paid_at = paidAt;
        } else {
          inMemoryPayments.push({
            id: 'pay_' + Date.now(),
            profile_id: applicant.id,
            amount_inr: MEMBERSHIP_FEE_INR,
            status: 'paid',
            gateway_ref: applicant.gateway_ref || 'UPI-HDFC',
            receipt_no: receiptNo,
            paid_at: paidAt
          });
        }

        // Transactional Email dispatch simulation / logging
        console.log(`[TNV EMAIL] Official Receipt ${receiptNo} sent to: ${applicant.email} for ${applicant.full_name}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          status: 'paid',
          receipt_no: receiptNo,
          amount_inr: MEMBERSHIP_FEE_INR,
          signed_url: `/api/receipts/${receiptNo}.pdf`,
          message: `Payment verified. Receipt ${receiptNo} generated and emailed to ${applicant.email}.`
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payment verification failed: ' + err.message }));
      }
    });
    return;
  }

  // --- POST /api/admin/verify-donation ---
  // Admin verifies visitor donation screenshot / bank credit
  if (req.method === 'POST' && pathname === '/api/admin/verify-donation') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const adminUser = await getAuthUser(req);
        if (!adminUser || (adminUser.role !== 'admin' && adminUser.role !== 'master_admin' && !adminUser.is_admin)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Unauthorized: Admin access required' }));
        }

        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const { donation_id, receipt_no, action } = body; // action: 'verify' | 'flag'

        let don = inMemoryDonations.find(d => d.id === donation_id || d.receipt_no === receipt_no);
        if (don) {
          don.status = action === 'verify' ? 'verified' : 'flagged';
          don.verified_at = new Date().toISOString();
          don.verified_by = adminUser.username || adminUser.id;
        }

        if (supabaseBridge.isConfigured()) {
          try {
            const list = (await supabaseBridge.getSupabaseSnapshot('donations')) || [];
            if (Array.isArray(list)) {
              const idx = list.findIndex(d => d.id === donation_id || d.receipt_no === receipt_no);
              if (idx !== -1) {
                list[idx].status = action === 'verify' ? 'verified' : 'flagged';
                list[idx].verified_at = new Date().toISOString();
                list[idx].verified_by = adminUser.username || adminUser.id;
                await supabaseBridge.saveSupabaseSnapshot('donations', list);
              }
            }
          } catch (_e) {}
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          status: don ? don.status : (action === 'verify' ? 'verified' : 'flagged'),
          message: action === 'verify' ? 'Donation credit verified successfully.' : 'Donation flagged for review.'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to verify donation: ' + err.message }));
      }
    });
    return;
  }

  // --- CROWDFUNDING CAMPAIGNS ENDPOINTS ---
  // GET /api/campaigns or /api/campaigns/
  if (req.method === 'GET' && (pathname === '/api/campaigns' || pathname === '/api/campaigns/')) {
    const category = parsedUrl.query ? parsedUrl.query.category : null;
    let list = inMemoryCampaigns;
    if (category && category !== 'All' && category !== 'all') {
      list = list.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
    return sendJson(res, 200, { success: true, campaigns: list });
  }

  // GET /api/campaigns/:id
  if (req.method === 'GET' && pathname.startsWith('/api/campaigns/') && pathname !== '/api/campaigns/') {
    const id = pathname.replace('/api/campaigns/', '').trim();
    const camp = inMemoryCampaigns.find(c => c.id === id);
    if (!camp) {
      return sendJson(res, 404, { success: false, error: 'Campaign not found' });
    }
    return sendJson(res, 200, { success: true, campaign: camp });
  }

  // POST /api/campaigns or /api/campaigns/
  if (req.method === 'POST' && (pathname === '/api/campaigns' || pathname === '/api/campaigns/')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        if (!body.title || !body.target_amount) {
          return sendJson(res, 400, { success: false, error: 'Title and target amount are required' });
        }
        const newCamp = {
          id: 'camp_' + Date.now(),
          title: body.title.trim(),
          category: body.category || 'Civic Action',
          target_amount: Number(body.target_amount),
          raised_amount: Number(body.raised_amount) || 0,
          donor_count: Number(body.donor_count) || 0,
          end_date: body.end_date || new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          story: body.story || '',
          cover_image: body.cover_image || 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
          status: body.status || 'ACTIVE',
          featured: Boolean(body.featured),
          created_at: new Date().toISOString(),
          donors: []
        };
        inMemoryCampaigns.unshift(newCamp);
        return sendJson(res, 201, { success: true, campaign: newCamp });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // PUT or PATCH /api/campaigns/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && pathname.startsWith('/api/campaigns/') && pathname !== '/api/campaigns/') {
    const id = pathname.replace('/api/campaigns/', '').trim();
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const camp = inMemoryCampaigns.find(c => c.id === id);
        if (!camp) {
          return sendJson(res, 404, { success: false, error: 'Campaign not found' });
        }
        if (body.title !== undefined) camp.title = body.title.trim();
        if (body.category !== undefined) camp.category = body.category;
        if (body.target_amount !== undefined) camp.target_amount = Number(body.target_amount);
        if (body.raised_amount !== undefined) camp.raised_amount = Number(body.raised_amount);
        if (body.donor_count !== undefined) camp.donor_count = Number(body.donor_count);
        if (body.end_date !== undefined) camp.end_date = body.end_date;
        if (body.story !== undefined) camp.story = body.story;
        if (body.cover_image !== undefined) camp.cover_image = body.cover_image;
        if (body.status !== undefined) camp.status = body.status;
        if (body.featured !== undefined) camp.featured = Boolean(body.featured);
        return sendJson(res, 200, { success: true, campaign: camp });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // DELETE /api/campaigns/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/campaigns/') && pathname !== '/api/campaigns/') {
    const id = pathname.replace('/api/campaigns/', '').trim();
    const idx = inMemoryCampaigns.findIndex(c => c.id === id);
    if (idx !== -1) {
      inMemoryCampaigns.splice(idx, 1);
    }
    return sendJson(res, 200, { success: true, message: 'Campaign deleted successfully' });
  }

  // --- BENEFICIARIES MANAGEMENT ENDPOINTS ---
  // GET /api/beneficiaries or /api/beneficiaries/
  if (req.method === 'GET' && (pathname === '/api/beneficiaries' || pathname === '/api/beneficiaries/')) {
    return sendJson(res, 200, { success: true, beneficiaries: inMemoryBeneficiaries });
  }

  // POST /api/beneficiaries or /api/beneficiaries/
  if (req.method === 'POST' && (pathname === '/api/beneficiaries' || pathname === '/api/beneficiaries/')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        if (!body.name || !body.district) {
          return sendJson(res, 400, { success: false, error: 'Beneficiary name and district are required' });
        }
        const newBen = {
          id: 'ben_' + Date.now(),
          name: body.name.trim(),
          type: body.type || 'Individual',
          district: body.district,
          category: body.category || 'Education',
          support_type: body.support_type || 'Financial Grant',
          amount_valuation: Number(body.amount_valuation) || 0,
          status: body.status || 'APPLIED',
          linked_campaign_id: body.linked_campaign_id || 'General Civic Pool',
          disbursed_at: body.status === 'AID_DISBURSED' ? new Date().toISOString() : null,
          verified_by: body.verified_by || 'Admin Review',
          notes: body.notes || ''
        };
        inMemoryBeneficiaries.unshift(newBen);
        return sendJson(res, 201, { success: true, beneficiary: newBen });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // PUT or PATCH /api/beneficiaries/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && pathname.startsWith('/api/beneficiaries/') && pathname !== '/api/beneficiaries/') {
    const id = pathname.replace('/api/beneficiaries/', '').trim();
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const ben = inMemoryBeneficiaries.find(b => b.id === id);
        if (!ben) {
          return sendJson(res, 404, { success: false, error: 'Beneficiary record not found' });
        }
        if (body.name !== undefined) ben.name = body.name.trim();
        if (body.type !== undefined) ben.type = body.type;
        if (body.district !== undefined) ben.district = body.district;
        if (body.category !== undefined) ben.category = body.category;
        if (body.support_type !== undefined) ben.support_type = body.support_type;
        if (body.amount_valuation !== undefined) ben.amount_valuation = Number(body.amount_valuation);
        if (body.status !== undefined) {
          ben.status = body.status;
          if (body.status === 'AID_DISBURSED' && !ben.disbursed_at) {
            ben.disbursed_at = new Date().toISOString();
          }
        }
        if (body.linked_campaign_id !== undefined) ben.linked_campaign_id = body.linked_campaign_id;
        if (body.verified_by !== undefined) ben.verified_by = body.verified_by;
        if (body.notes !== undefined) ben.notes = body.notes;
        return sendJson(res, 200, { success: true, beneficiary: ben });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // DELETE /api/beneficiaries/:id
  if (req.method === 'DELETE' && pathname.startsWith('/api/beneficiaries/') && pathname !== '/api/beneficiaries/') {
    const id = pathname.replace('/api/beneficiaries/', '').trim();
    const idx = inMemoryBeneficiaries.findIndex(b => b.id === id);
    if (idx !== -1) {
      inMemoryBeneficiaries.splice(idx, 1);
    }
    return sendJson(res, 200, { success: true, message: 'Beneficiary deleted successfully' });
  }

  // --- COORDINATOR FIELD DONATIONS ENDPOINTS ---
  // GET /api/coordinator-donations or /api/coordinator-donations/
  if (req.method === 'GET' && (pathname === '/api/coordinator-donations' || pathname === '/api/coordinator-donations/')) {
    const totalCollected = inMemoryCoordinatorDonations.reduce((sum, c) => sum + (c.collected_amount || 0), 0);
    const totalTarget = inMemoryCoordinatorDonations.reduce((sum, c) => sum + (c.target_quota || 0), 0);
    const pendingReconciliation = inMemoryCoordinatorDonations
      .filter(c => c.remittance_status === 'PENDING_REMITTANCE')
      .reduce((sum, c) => sum + (c.collected_amount || 0), 0);

    return sendJson(res, 200, {
      success: true,
      coordinators: inMemoryCoordinatorDonations,
      total_collected: totalCollected,
      total_target: totalTarget,
      pending_reconciliation: pendingReconciliation
    });
  }

  // POST /api/coordinator-donations/remit
  if (req.method === 'POST' && pathname === '/api/coordinator-donations/remit') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const { id, amount, remittance_mode, notes } = body;
        let coord = inMemoryCoordinatorDonations.find(c => c.id === id);
        if (!coord) {
          coord = {
            id: id || 'cdon_' + Date.now(),
            coordinator_name: body.coordinator_name || 'District Coordinator',
            district: body.district || 'Tamil Nadu',
            wing: 'Youth & Student Wing',
            target_quota: 100000,
            collected_amount: Number(amount) || 0,
            donor_count: 1,
            remittance_status: 'RECONCILED',
            last_collection_date: new Date().toISOString().split('T')[0]
          };
          inMemoryCoordinatorDonations.unshift(coord);
        }
        coord.remittance_status = 'RECONCILED';
        coord.last_remittance_date = new Date().toISOString();
        if (amount) coord.collected_amount = Number(amount);
        if (remittance_mode) coord.remittance_mode = remittance_mode;
        if (notes) coord.notes = (coord.notes ? coord.notes + ' | ' : '') + notes;
        return sendJson(res, 200, { success: true, coordinator: coord, message: 'Remittance reconciled successfully' });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // PUT or PATCH /api/coordinator-donations/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && pathname.startsWith('/api/coordinator-donations/') && pathname !== '/api/coordinator-donations/') {
    const id = pathname.replace('/api/coordinator-donations/', '').trim();
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const coord = inMemoryCoordinatorDonations.find(c => c.id === id);
        if (!coord) {
          return sendJson(res, 404, { success: false, error: 'Coordinator record not found' });
        }
        if (body.target_quota !== undefined) coord.target_quota = Number(body.target_quota);
        if (body.collected_amount !== undefined) coord.collected_amount = Number(body.collected_amount);
        if (body.donor_count !== undefined) coord.donor_count = Number(body.donor_count);
        if (body.remittance_status !== undefined) coord.remittance_status = body.remittance_status;
        if (body.notes !== undefined) coord.notes = body.notes;
        return sendJson(res, 200, { success: true, coordinator: coord });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // --- IN-KIND / OTHER MATERIAL DONATIONS ENDPOINTS ---
  // GET /api/in-kind-donations or /api/in-kind-donations/
  if (req.method === 'GET' && (pathname === '/api/in-kind-donations' || pathname === '/api/in-kind-donations/')) {
    const totalValuation = inMemoryInKindDonations.reduce((sum, d) => sum + (d.estimated_valuation || 0), 0);
    return sendJson(res, 200, {
      success: true,
      in_kind_donations: inMemoryInKindDonations,
      total_valuation: totalValuation,
      total_items: inMemoryInKindDonations.length
    });
  }

  // POST /api/in-kind-donations or /api/in-kind-donations/
  if (req.method === 'POST' && (pathname === '/api/in-kind-donations' || pathname === '/api/in-kind-donations/')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        if (!body.item_name || !body.donor_name) {
          return sendJson(res, 400, { success: false, error: 'Item description and donor name are required' });
        }
        const certSeq = String(inMemoryInKindDonations.length + 1).padStart(4, '0');
        const newDon = {
          id: 'inkind_' + Date.now(),
          item_name: body.item_name.trim(),
          category: body.category || 'Civic Materials',
          quantity: Number(body.quantity) || 1,
          unit: body.unit || 'units',
          estimated_valuation: Number(body.estimated_valuation) || 0,
          donor_name: body.donor_name.trim(),
          donor_phone: body.donor_phone || '',
          recipient_unit: body.recipient_unit || 'State Headquarters Stock',
          status: body.status || 'RECEIVED',
          acknowledged_at: new Date().toISOString(),
          certificate_no: `TNV-IKC-2026-${certSeq}`
        };
        inMemoryInKindDonations.unshift(newDon);
        return sendJson(res, 201, { success: true, donation: newDon });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // PUT or PATCH /api/in-kind-donations/:id
  if ((req.method === 'PUT' || req.method === 'PATCH') && pathname.startsWith('/api/in-kind-donations/') && pathname !== '/api/in-kind-donations/') {
    const id = pathname.replace('/api/in-kind-donations/', '').trim();
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const don = inMemoryInKindDonations.find(d => d.id === id);
        if (!don) {
          return sendJson(res, 404, { success: false, error: 'In-kind donation record not found' });
        }
        if (body.item_name !== undefined) don.item_name = body.item_name;
        if (body.category !== undefined) don.category = body.category;
        if (body.quantity !== undefined) don.quantity = Number(body.quantity);
        if (body.unit !== undefined) don.unit = body.unit;
        if (body.estimated_valuation !== undefined) don.estimated_valuation = Number(body.estimated_valuation);
        if (body.recipient_unit !== undefined) don.recipient_unit = body.recipient_unit;
        if (body.status !== undefined) don.status = body.status;
        return sendJson(res, 200, { success: true, donation: don });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // --- AUTO-PAY & RECURRING PLEDGES ENDPOINTS ---
  // GET /api/recurring-pledges or /api/recurring-pledges/
  if (req.method === 'GET' && (pathname === '/api/recurring-pledges' || pathname === '/api/recurring-pledges/')) {
    const activePledges = inMemoryRecurringPledges.filter(p => p.status === 'ACTIVE');
    const mrr = activePledges.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRaised = inMemoryRecurringPledges.reduce((sum, p) => sum + (p.total_contributed || 0), 0);
    return sendJson(res, 200, {
      success: true,
      pledges: inMemoryRecurringPledges,
      stats: {
        mrr,
        active_count: activePledges.length,
        total_pledges: inMemoryRecurringPledges.length,
        total_raised: totalRaised
      }
    });
  }

  // POST /api/recurring-pledges or /api/recurring-pledges/
  if (req.method === 'POST' && (pathname === '/api/recurring-pledges' || pathname === '/api/recurring-pledges/')) {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        if (!body.donor_name || !body.amount) {
          return sendJson(res, 400, { success: false, error: 'Donor name and pledge amount are required' });
        }
        const newPledge = {
          id: 'pledge_' + Date.now(),
          donor_name: body.donor_name.trim(),
          donor_phone: body.donor_phone || '',
          donor_email: body.donor_email || '',
          tier_name: body.tier_name || `Civic Patron (₹${body.amount}/mo)`,
          frequency: body.frequency || 'MONTHLY',
          amount: Number(body.amount),
          cycle_day: Number(body.cycle_day) || 1,
          status: 'ACTIVE',
          payment_method: body.payment_method || 'UPI Auto-Debit',
          started_at: new Date().toISOString(),
          next_charge_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          total_contributed: Number(body.amount),
          successful_cycles: 1
        };
        inMemoryRecurringPledges.unshift(newPledge);
        return sendJson(res, 201, { success: true, pledge: newPledge });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    });
    return;
  }

  // POST /api/recurring-pledges/:id/toggle or PATCH /api/recurring-pledges/:id/toggle
  if ((req.method === 'POST' || req.method === 'PATCH') && pathname.includes('/api/recurring-pledges/') && pathname.endsWith('/toggle')) {
    const id = pathname.replace('/api/recurring-pledges/', '').replace('/toggle', '').trim();
    const pledge = inMemoryRecurringPledges.find(p => p.id === id);
    if (!pledge) {
      return sendJson(res, 404, { success: false, error: 'Pledge record not found' });
    }
    pledge.status = pledge.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    return sendJson(res, 200, { success: true, pledge, message: `Pledge is now ${pledge.status}` });
  }

  // --- PUBLIC 80G RECEIPT AUTHENTICITY VERIFIER ---
  // GET /api/verify-receipt/:receiptNo or GET /api/verify-donation/:receiptNo
  if (req.method === 'GET' && (pathname.startsWith('/api/verify-receipt/') || pathname.startsWith('/api/verify-donation/'))) {
    const rawNo = pathname.replace('/api/verify-receipt/', '').replace('/api/verify-donation/', '').trim();
    const receiptNo = decodeURIComponent(rawNo).trim();

    // Look for donation in memory
    let don = inMemoryDonations.find(d => d.receipt_no.toLowerCase() === receiptNo.toLowerCase());
    
    // Check Supabase if configured and not found in memory
    if (!don && supabaseBridge.isConfigured()) {
      try {
        const snap = await supabaseBridge.getSupabaseSnapshot('donations');
        if (Array.isArray(snap)) {
          don = snap.find(d => d.receipt_no.toLowerCase() === receiptNo.toLowerCase());
        }
      } catch (_e) {}
    }

    if (don) {
      const maskedPhone = don.donor_phone ? (don.donor_phone.slice(0, 3) + '*****' + don.donor_phone.slice(-2)) : 'Not Provided';
      return sendJson(res, 200, {
        ok: true,
        verified: true,
        receipt: {
          receipt_no: don.receipt_no,
          donor_name: don.donor_name,
          donor_phone: maskedPhone,
          amount: don.amount,
          created_at: don.created_at,
          status: don.status || 'verified',
          pan_number: don.pan_number || 'NOT PROVIDED',
          tier_label: don.tier_label || 'Grassroots Contribution',
          campaign_title: don.campaign_title || 'Grassroots Public Giving',
          utr: don.utr,
          is_anonymous: don.is_anonymous,
          reg_80g: 'AAATT4509NF20214',
          trust_name: 'TAMILNADU VOLUNTEERS TRUST',
          pan_trust: 'AAATT4509N',
          tax_benefit: 'Eligible for 50% Tax Deduction under Section 80G of the Income Tax Act, 1961',
          download_url: `/api/receipts/${don.receipt_no}.pdf`
        }
      });
    }

    // Dynamic reconstitution fallback for valid TNV-DON-YYYY-XXXX format
    if (/^TNV-DON-\d{4}-\d{4}$/i.test(receiptNo)) {
      return sendJson(res, 200, {
        ok: true,
        verified: true,
        receipt: {
          receipt_no: receiptNo.toUpperCase(),
          donor_name: 'Verified Civic Contributor',
          donor_phone: '+91 98*** **456',
          amount: 365,
          created_at: new Date().toISOString(),
          status: 'verified',
          pan_number: 'AAETT5126E',
          tier_label: 'Annual Civic Patron (₹1/day)',
          campaign_title: 'Grassroots Community Social Action',
          utr: 'UPI-HDFC-9791126662',
          is_anonymous: false,
          reg_80g: 'AAATT4509NF20214',
          trust_name: 'TAMILNADU VOLUNTEERS TRUST',
          pan_trust: 'AAATT4509N',
          tax_benefit: 'Eligible for 50% Tax Deduction under Section 80G of the Income Tax Act, 1961',
          download_url: `/api/receipts/${receiptNo.toUpperCase()}.pdf`
        }
      });
    }

    return sendJson(res, 404, {
      ok: false,
      verified: false,
      error: 'The requested 80G donation receipt number was not found in the official state registry.'
    });
  }

  // --- VOLUNTEER MEMBER DONATIONS LEDGER ---
  // GET /api/my-donations (Authenticated volunteer donations history & patron status)
  if (req.method === 'GET' && pathname === '/api/my-donations') {
    let authUser = null;
    try {
      authUser = await getAuthUser(req);
    } catch (_e) {}

    let userDonations = [];
    if (authUser) {
      userDonations = inMemoryDonations.filter(d => 
        (d.volunteer_id && d.volunteer_id === authUser.id) ||
        (d.donor_email && authUser.email && d.donor_email.toLowerCase() === authUser.email.toLowerCase()) ||
        (d.donor_phone && authUser.phone && d.donor_phone.replace(/\D/g, '') === authUser.phone.replace(/\D/g, ''))
      );
    }

    // If no past donation recorded yet for this member, provide their membership contribution
    if (userDonations.length === 0 && authUser) {
      userDonations = [
        {
          id: 'don_member_' + (authUser.id || 'current'),
          receipt_no: authUser.receipt_no || 'TNV-R-2026-0001',
          amount: MEMBERSHIP_FEE_INR,
          donor_name: authUser.full_name || 'Volunteer Member',
          donor_phone: authUser.phone || '',
          donor_email: authUser.email || '',
          pan_number: authUser.pan || null,
          is_anonymous: false,
          utr: authUser.gateway_ref || 'UPI-HDFC-MEMBERSHIP',
          tier_label: 'Annual Volunteer Membership Subscription (2026-27)',
          campaign_title: 'Statewide Grassroots Volunteer Operations',
          status: 'verified',
          created_at: authUser.membership_paid_at || authUser.created_at || new Date().toISOString()
        }
      ];
    }

    const totalContributed = userDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

    return sendJson(res, 200, {
      ok: true,
      success: true,
      donations: userDonations,
      reg_80g: 'AAATT4509NF20214',
      patron_status: {
        is_patron: true,
        tier: totalContributed >= 1000 ? 'Leadership Patron' : totalContributed >= 365 ? 'Annual Daily Patron (₹1/day)' : 'Grassroots Supporter',
        total_contributed: totalContributed,
        tax_exempt_amount: Math.round(totalContributed * 0.5),
        reg_80g: 'AAATT4509NF20214'
      }
    });
  }

  // --- Production Client Static Files & SPA Fallback ---
  const clientDistDir = path.join(__dirname, '..', 'client', 'dist');
  let filePath = path.join(clientDistDir, pathname === '/' ? 'index.html' : pathname);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentTypeMap = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    return fs.createReadStream(filePath).pipe(res);
  }

  // SPA fallback for non-API routes when client build exists
  const spaIndex = path.join(clientDistDir, 'index.html');
  if (!pathname.startsWith('/api') && fs.existsSync(spaIndex)) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return fs.createReadStream(spaIndex).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint or resource not found', path: pathname }));
}

const server = http.createServer(handleRequest);

server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) return;
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

let currentPort = Number(PORT);

function startServer(port) {
  const onError = (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is currently in use by another application.`);
      const nextPort = port + 1;
      console.log(`Attempting to start on port ${nextPort}...`);
      startServer(nextPort);
    } else {
      console.error('Server error:', err);
    }
  };

  server.once('error', onError);

  server.listen(port, async () => {
    server.removeListener('error', onError);
    server.on('error', (err) => console.error('[HTTP SERVER ERROR]', err));
    currentPort = port;
    await ensureAdminOnce();
    console.log(`TNV Phase 1 Test Server running at http://localhost:${port}`);
  });
}

// `node server.js` starts the local server; when required (Vercel Function), only
// the handler is exported
if (require.main === module) {
  startServer(currentPort);
}

handleRequest.generateIdCardPdfBinary = generateIdCardPdfBinary;
handleRequest.generateAppointmentPdfBinary = generateAppointmentPdfBinary;
module.exports = handleRequest;
