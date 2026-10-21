const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('test/nithin_photo_raw.json', 'utf8'));

function extractJpegBuffer(photoPathOrUrl) {
  if (!photoPathOrUrl || typeof photoPathOrUrl !== 'string') return null;
  const match = photoPathOrUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i);
  if (match) {
    try {
      const buf = Buffer.from(match[2], 'base64');
      if (buf.length > 4 && buf[0] === 0xFF && buf[1] === 0xD8) {
        return buf;
      }
      return buf;
    } catch (_e) {
      return null;
    }
  }
  return null;
}

function getJpegDimensions(buf) {
  let i = 2;
  while (i < buf.length - 8) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    const len = buf.readUInt16BE(i + 2);
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

function generateIdCardPdfBinary(user) {
  const fullName = escapePdf(user.full_name);
  const username = escapePdf(user.username);
  const tnvId = escapePdf(user.tnv_id || 'TNV-CHE-0003');
  const role = escapePdf(user.role || 'Volunteer');
  const district = escapePdf(user.district_name || 'Chennai');
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

const user = {
  full_name: raw.full_name,
  username: raw.username,
  tnv_id: 'TNV-CHE-0003',
  role: 'Volunteer',
  district_name: 'Chennai',
  wing_name: 'Administration',
  photo_path: raw.photo_path
};

const pdf = generateIdCardPdfBinary(user);
fs.writeFileSync('test/nithin_id_card.pdf', pdf);
console.log('Generated test/nithin_id_card.pdf successfully, bytes:', pdf.length);
