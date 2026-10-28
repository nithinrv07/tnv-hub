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
const supabaseBridge = require('./supabase_bridge');
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
const inMemoryNotifications = [];
const inMemoryEmails = [];

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

// 1. PDF 1.4 Binary Generator: Official Membership Receipt (Step 4 & 15)
function generateReceiptPdfBinary(data) {
  const receiptNo = data.receiptNo || 'TNV-R-2026-0001';
  const paidDate = new Date(data.paidAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const fullName = escapePdf(data.fullName);
  const username = escapePdf(data.username);
  const email = escapePdf(data.email);
  const phone = escapePdf(data.phone);
  const district = escapePdf(data.district);
  const gatewayRef = escapePdf(data.gatewayRef);
  const amountStr = `Rs ${data.amountInr || 365}.00`;

  const commands = [
    '0.96 0.97 0.98 rg 30 30 535 780 re f',
    '1.0 1.0 1.0 rg 50 50 495 740 re f',
    '0.85 0.88 0.92 RG 1.5 w 50 50 495 740 re S',
    '0.06 0.28 0.52 rg 50 710 495 80 re f',
    'BT /F2 20 Tf 1.0 1.0 1.0 rg 70 752 Td (TAMIL NADU VOLUNTEERS (TNV)) Tj ET',
    'BT /F1 11 Tf 0.85 0.92 1.0 rg 70 730 Td (Official Membership Subscription Receipt - Phase 1) Tj ET',
    `BT /F2 13 Tf 0.1 0.15 0.25 rg 70 665 Td (RECEIPT NO: ${receiptNo}) Tj ET`,
    `BT /F1 10 Tf 0.4 0.45 0.5 rg 70 648 Td (Date: ${paidDate}) Tj ET`,
    '0.88 0.90 0.94 RG 1 w 70 630 m 525 630 l S',
    'BT /F2 12 Tf 0.06 0.28 0.52 rg 70 605 Td (MEMBER DETAILS) Tj ET',
    `BT /F1 10 Tf 0.3 0.35 0.4 rg 70 580 Td (Full Name:) Tj 130 0 Td /F2 10 Tf 0.1 0.15 0.2 rg (${fullName}) Tj ET`,
    `BT /F1 10 Tf 0.3 0.35 0.4 rg 70 560 Td (Username:) Tj 130 0 Td /F2 10 Tf 0.1 0.15 0.2 rg (@${username}) Tj ET`,
    `BT /F1 10 Tf 0.3 0.35 0.4 rg 70 540 Td (Mobile Phone:) Tj 130 0 Td /F1 10 Tf 0.1 0.15 0.2 rg (${phone}) Tj ET`,
    `BT /F1 10 Tf 0.3 0.35 0.4 rg 70 520 Td (Email:) Tj 130 0 Td /F1 10 Tf 0.1 0.15 0.2 rg (${email}) Tj ET`,
    `BT /F1 10 Tf 0.3 0.35 0.4 rg 70 500 Td (District:) Tj 130 0 Td /F1 10 Tf 0.1 0.15 0.2 rg (${district}) Tj ET`,
    '0.88 0.90 0.94 RG 1 w 70 480 m 525 480 l S',
    'BT /F2 12 Tf 0.06 0.28 0.52 rg 70 455 Td (PAYMENT INFORMATION) Tj ET',
    '0.94 0.96 0.98 rg 70 415 455 24 re f',
    'BT /F2 10 Tf 0.1 0.15 0.25 rg 80 422 Td (Description) Tj 240 0 Td (Gateway Ref) Tj 130 0 Td (Amount) Tj ET',
    `BT /F1 10 Tf 0.2 0.25 0.3 rg 80 395 Td (Annual Volunteer Membership) Tj 240 0 Td (${gatewayRef}) Tj 130 0 Td /F2 10 Tf 0.05 0.5 0.3 rg (${amountStr}) Tj ET`,
    '0.96 0.98 0.96 rg 330 320 195 45 re f',
    '0.1 0.6 0.3 RG 1 w 330 320 195 45 re S',
    `BT /F2 11 Tf 0.1 0.15 0.2 rg 345 342 Td (Total Paid:) Tj 60 0 Td /F2 14 Tf 0.05 0.55 0.25 rg (${amountStr}) Tj ET`,
    'BT /F1 9 Tf 0.2 0.5 0.2 rg 345 328 Td (Status: COMPLETED / VERIFIED) Tj ET',
    '0.88 0.90 0.94 RG 1 w 70 140 m 525 140 l S',
    'BT /F1 9 Tf 0.45 0.5 0.55 rg 70 120 Td (Official computer-generated receipt for TNV Hub Portal volunteer membership.) Tj ET',
    'BT /F1 9 Tf 0.45 0.5 0.55 rg 70 106 Td (Tamil Nadu Volunteers Hub - Building a stronger society together.) Tj ET'
  ];

  return buildSimplePdf(595.28, 841.89, commands);
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
    const role = escapePdf(user.role || 'Volunteer');
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
  const role = escapePdf(user.role || user.preferred_designation || 'Volunteer');
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

// 3. Official Appointment Letter (100% Selectable Vector Text based on Appointment_Letter_TN_Volunteers.pdf)
function generateAppointmentPdfBinary(user) {
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
        role: user.role || user.preferred_designation || 'Volunteer',
        district_name: user.district_name || user.district || 'Tamil Nadu',
        phone: user.phone || '',
        email: user.email || '',
        tnv_id: user.tnv_id || '',
        address: user.address || 'Address: 249 68 E,M G R Nagar, Thadagam post,Gingee Taluk,',
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
    console.error('Template appointment PDF generator error:', err && err.message ? err.message : err);
  }

  // Fallback: Serve the official Appointment_Letter_TN_Volunteers.pdf template directly
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

// Helper: extract authenticated user from request
async function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
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

        const username = (body.username || '').trim();
        if (!USERNAME_REGEX.test(username)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Username must be 4 to 20 alphanumeric characters or underscore', field: 'username' }));
        }

        const email = (body.email || '').trim().toLowerCase();
        if (!EMAIL_REGEX.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Valid email address is required', field: 'email' }));
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
        const genericError = 'Invalid username or password.';

        if (!username || !password) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: genericError }));
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

        // In-Memory Fallback: Resolves username to profile
        const profile = inMemoryProfiles.find(p => p.username.toLowerCase() === username.trim().toLowerCase());
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
    const targetUser = (user && user.id === targetId) ? user : inMemoryProfiles.find(p => p.id === targetId) || user;

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
    const targetUser = (user && user.id === targetId) ? user : inMemoryProfiles.find(p => p.id === targetId) || user;

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
        const queue = await supabaseBridge.getAdminQueue(token);
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
        blocked: Boolean(p.blocked),
        blocked_at: p.blocked_at || null
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ queue }));
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
          const gatewayRef = (body.gateway_ref || body.mock_marker || `UPI-TX-${Date.now()}`).toString().trim();
          const livePayment = await supabaseBridge.recordPayment(token, gatewayRef);
          if (livePayment.error) {
            res.writeHead(livePayment.status || 500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(livePayment));
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(livePayment));
        }

        const authUser = await getAuthUser(req);
        let user = authUser;

        // Fallback for direct profile_id in test payload
        if (!user && bodyStr) {
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

        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const gatewayRef = (body.gateway_ref || body.mock_marker || `MOCK-PAY-${Date.now()}`).toString().trim();

        // Idempotency: Return existing receipt if gateway_ref was already recorded
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

        // Payment Succeeded: Generate receipt number starting from 0001
        const receiptNo = generateReceiptNo();
        const paidAt = new Date().toISOString();

        inMemoryPayments.push({
          id: 'pay_' + Date.now(),
          profile_id: user.id,
          amount_inr: MEMBERSHIP_FEE_INR,
          status: 'paid',
          gateway_ref: gatewayRef,
          receipt_no: receiptNo,
          paid_at: paidAt
        });

        user.membership_paid = true;
        user.receipt_no = receiptNo;

        // Generate PDF
        const pdfBuffer = generateReceiptPdfBinary({
          receiptNo: receiptNo,
          paidAt: paidAt,
          fullName: user.full_name,
          username: user.username,
          email: user.email,
          phone: user.phone,
          district: user.district_name || 'Tamil Nadu',
          gatewayRef: gatewayRef,
          amountInr: MEMBERSHIP_FEE_INR
        });
        inMemoryReceiptPdfs.set(receiptNo, pdfBuffer);

        const signedUrl = `/api/receipts/${receiptNo}.pdf`;

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          status: 'paid',
          receipt_no: receiptNo,
          amount_inr: MEMBERSHIP_FEE_INR,
          signed_url: signedUrl,
          storage_path: `receipts/${user.id}/${receiptNo}.pdf`,
          message: 'Membership fee of Rs 365 recorded successfully. Receipt generated.'
        }));

      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payment error: ' + err.message }));
      }
    });
    return;
  }

  // --- GET /api/receipts/:receipt_no.pdf ---
  if (req.method === 'GET' && pathname.startsWith('/api/receipts/')) {
    const filename = pathname.replace('/api/receipts/', '');
    const receiptNo = filename.replace(/\.pdf$/i, '');
    const pdfBuf = inMemoryReceiptPdfs.get(receiptNo);

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
