/**
 * TNV Hub Portal - Receipt PDF Generator
 * Generates a clean, professional PDF 1.4 document for ₹365 membership payment.
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.2 Step 6)
 * Receipts stored in private bucket: receipts/<profile_id>/<receipt_no>.pdf
 */

export interface ReceiptData {
  receiptNo: string;
  paidAt: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  district: string;
  gatewayRef: string;
  amountInr: number;
}

/**
 * Escapes characters for PDF literal strings (parentheses and backslashes)
 */
function escapePdfText(text: string): string {
  if (!text) return '';
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/**
 * Generates a standard PDF 1.4 document byte buffer.
 */
export function generateReceiptPdf(data: ReceiptData): Uint8Array {
  const receiptNo = data.receiptNo || 'TNV-R-2026-0001';
  const paidDate = new Date(data.paidAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const fullName = escapePdfText(data.fullName || 'Member');
  const username = escapePdfText(data.username || '');
  const email = escapePdfText(data.email || '');
  const phone = escapePdfText(data.phone || '');
  const district = escapePdfText(data.district || '');
  const gatewayRef = escapePdfText(data.gatewayRef || 'MOCK-PAY');
  const amountStr = `Rs ${data.amountInr || 365}.00`;

  // Construct PDF content stream commands
  // Page size: A4 (595.28 x 841.89 points)
  const streamCommands = [
    // Background card container
    '0.96 0.97 0.98 rg',
    '30 30 535 780 re',
    'f',
    // White receipt card
    '1.0 1.0 1.0 rg',
    '50 50 495 740 re',
    'f',
    '0.85 0.88 0.92 RG',
    '1.5 w',
    '50 50 495 740 re',
    'S',
    // Header Banner (Navy/Blue)
    '0.06 0.28 0.52 rg',
    '50 710 495 80 re',
    'f',
    // Header Title Text
    'BT',
    '/F2 20 Tf',
    '1.0 1.0 1.0 rg',
    '70 752 Td',
    '(TAMIL NADU VOLUNTEERS (TNV)) Tj',
    'ET',
    // Header Subtitle Text
    'BT',
    '/F1 11 Tf',
    '0.85 0.92 1.0 rg',
    '70 730 Td',
    '(Official Membership Subscription Receipt - Phase 1) Tj',
    'ET',
    // Receipt Number and Date Block
    'BT',
    '/F2 13 Tf',
    '0.1 0.15 0.25 rg',
    '70 665 Td',
    `(${escapePdfText('RECEIPT NO: ' + receiptNo)}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.4 0.45 0.5 rg',
    '70 648 Td',
    `(${escapePdfText('Date: ' + paidDate)}) Tj`,
    'ET',
    // Line separator
    '0.88 0.90 0.94 RG',
    '1 w',
    '70 630 m 525 630 l S',
    // Section: Member Details
    'BT',
    '/F2 12 Tf',
    '0.06 0.28 0.52 rg',
    '70 605 Td',
    '(MEMBER DETAILS) Tj',
    'ET',
    // Details Grid
    'BT',
    '/F1 10 Tf',
    '0.3 0.35 0.4 rg',
    '70 580 Td (Full Name:) Tj',
    '130 0 Td',
    '/F2 10 Tf 0.1 0.15 0.2 rg',
    `(${fullName}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.3 0.35 0.4 rg',
    '70 560 Td (Username:) Tj',
    '130 0 Td',
    '/F2 10 Tf 0.1 0.15 0.2 rg',
    `(@${username}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.3 0.35 0.4 rg',
    '70 540 Td (Mobile Phone:) Tj',
    '130 0 Td',
    '/F1 10 Tf 0.1 0.15 0.2 rg',
    `(${phone}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.3 0.35 0.4 rg',
    '70 520 Td (Email:) Tj',
    '130 0 Td',
    '/F1 10 Tf 0.1 0.15 0.2 rg',
    `(${email}) Tj`,
    'ET',
    'BT',
    '/F1 10 Tf',
    '0.3 0.35 0.4 rg',
    '70 500 Td (District:) Tj',
    '130 0 Td',
    '/F1 10 Tf 0.1 0.15 0.2 rg',
    `(${district}) Tj`,
    'ET',
    // Line separator
    '0.88 0.90 0.94 RG',
    '1 w',
    '70 480 m 525 480 l S',
    // Section: Payment Details
    'BT',
    '/F2 12 Tf',
    '0.06 0.28 0.52 rg',
    '70 455 Td',
    '(PAYMENT INFORMATION) Tj',
    'ET',
    // Table Header
    '0.94 0.96 0.98 rg',
    '70 415 455 24 re f',
    'BT',
    '/F2 10 Tf 0.1 0.15 0.25 rg',
    '80 422 Td (Description) Tj',
    '340 0 Td (Gateway Ref) Tj',
    '65 0 Td (Amount) Tj',
    'ET',
    // Table Content
    'BT',
    '/F1 10 Tf 0.2 0.25 0.3 rg',
    '80 395 Td (Annual Volunteer Membership) Tj',
    '180 0 Td',
    `(${gatewayRef}) Tj`,
    '125 0 Td',
    '/F2 10 Tf 0.05 0.5 0.3 rg',
    `(${amountStr}) Tj`,
    'ET',
    // Total Box
    '0.96 0.98 0.96 rg',
    '330 330 195 45 re f',
    '0.1 0.6 0.3 RG',
    '1 w',
    '330 330 195 45 re S',
    'BT',
    '/F2 11 Tf 0.1 0.15 0.2 rg',
    '345 352 Td (Total Paid:) Tj',
    '60 0 Td',
    '/F2 14 Tf 0.05 0.55 0.25 rg',
    `(${amountStr}) Tj`,
    'ET',
    'BT',
    '/F1 9 Tf 0.2 0.5 0.2 rg',
    '345 338 Td (Status: COMPLETED / VERIFIED) Tj',
    'ET',
    // Footer / Verification Notice
    '0.88 0.90 0.94 RG',
    '1 w',
    '70 140 m 525 140 l S',
    'BT',
    '/F1 9 Tf 0.45 0.5 0.55 rg',
    '70 120 Td',
    '(This is a computer-generated official receipt for TNV Hub Portal volunteer membership.) Tj',
    '0 -14 Td',
    '(Keep this document for your records. For questions, contact admin@tnvportal.org.) Tj',
    '0 -14 Td',
    '(Tamil Nadu Volunteers Hub - Building a stronger society together.) Tj',
    'ET',
  ];

  const streamContent = streamCommands.join('\n');
  const streamLength = new TextEncoder().encode(streamContent).length;

  // Build standard PDF 1.4 document
  const objects: string[] = [];
  
  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  // Object 3: Page (A4: 595 x 842 points)
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );
  // Object 4: Contents Stream
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);
  // Object 5: Standard Helvetica Font
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  // Object 6: Standard Helvetica-Bold Font
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  let pdfString = '%PDF-1.4\n';
  const offsets: number[] = [];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(new TextEncoder().encode(pdfString).length);
    pdfString += objects[i] + '\n';
  }

  const xrefOffset = new TextEncoder().encode(pdfString).length;
  pdfString += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';

  for (const offset of offsets) {
    pdfString += String(offset).padStart(10, '0') + ' 00000 n \n';
  }

  pdfString += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new TextEncoder().encode(pdfString);
}
