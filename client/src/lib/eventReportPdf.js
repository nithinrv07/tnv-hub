import { jsPDF } from 'jspdf';

/**
 * Compiles a comprehensive TNV Event Completion Report into a single print-ready PDF.
 * Includes event metadata, organisers, guests, 4 event photos, narrative overview, and attendees.
 */
export async function generateEventReportPdf({ event, report }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Helper: Header bar on pages
  function drawHeader(isFirstPage = true) {
    doc.setFillColor(20, 83, 45); // TNV Brand Green #14532D
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('TAMIL NADU VOLUNTEERS (TNV)', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(250, 204, 21); // Yellow accent
    doc.text('OFFICIAL FIELD DRIVE COMPLETION REPORT', margin, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    const dateStr = new Date().toLocaleDateString('en-GB');
    doc.text(`Generated: ${dateStr}`, pageWidth - margin, 14, { align: 'right' });
  }

  // Helper: Footer
  function drawFooter(pageNo, totalPages = 1) {
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 114, 128);
    doc.text('Tamil Nadu Volunteers · State Headquarters, Chennai · www.tamilnaduvolunteers.org', margin, pageHeight - 7);
    doc.text(`Page ${pageNo}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  drawHeader(true);
  let y = 30;

  // Event Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55);
  const titleLines = doc.splitTextToSize(event?.title || 'Civic Action Drive', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  // Event Details Grid
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('District / Location:', margin + 4, y + 6);
  doc.text('Date & Time:', margin + 65, y + 6);
  doc.text('Department / Wing:', margin + 125, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`${event?.district || 'Statewide'} · ${event?.venue || 'TNV Center'}`, margin + 4, y + 11);
  doc.text(`${event?.start_date || 'N/A'} (${event?.start_time || '09:00'} - ${event?.end_time || '17:00'})`, margin + 65, y + 11);
  doc.text(event?.department || event?.wing || 'Operations Wing', margin + 125, y + 11);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text('Lead Organiser:', margin + 4, y + 18);
  doc.text('Attendance Summary:', margin + 65, y + 18);
  doc.text('Report Submitter:', margin + 125, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 83, 45);
  doc.text(event?.organizer_name || 'TNV District Lead', margin + 4, y + 22);
  const metrics = report?.metrics || {};
  doc.text(`${metrics.checked_in || 0} Checked-In / ${metrics.total_registered || 0} Registered`, margin + 65, y + 22);
  doc.text(report?.submitted_by || 'Event Organiser', margin + 125, y + 22);

  y += 30;

  // Organisers & Distinguished Guests
  if (Array.isArray(event?.organisers) && event.organisers.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 83, 45);
    doc.text('Official Event Organisers', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    event.organisers.forEach(org => {
      doc.text(`• ${org.name || 'Organiser'} (${org.designation || 'Coordinator'}) - Contact: ${org.phone || 'N/A'}`, margin + 2, y);
      y += 4.5;
    });
    y += 3;
  }

  if (Array.isArray(event?.guests) && event.guests.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 83, 45);
    doc.text('Distinguished Guests', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(55, 65, 81);
    event.guests.forEach(gst => {
      doc.text(`• ${gst.name} — ${gst.designation}${gst.organization ? ` (${gst.organization})` : ''}`, margin + 2, y);
      y += 4.5;
    });
    y += 3;
  }

  // Narrative Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(20, 83, 45);
  doc.text('Executive Overview & Field Outcomes', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(55, 65, 81);
  const overviewText = report?.overview || event?.description || 'The field drive was successfully executed.';
  const overviewLines = doc.splitTextToSize(overviewText, contentWidth);
  doc.text(overviewLines, margin, y);
  y += overviewLines.length * 4.5 + 6;

  // 4 Event Photos (2x2 Grid)
  const photos = Array.isArray(report?.photos) ? report.photos.filter(Boolean) : [];
  if (photos.length > 0) {
    if (y > pageHeight - 80) {
      drawFooter(1);
      doc.addPage();
      drawHeader(false);
      y = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 83, 45);
    doc.text(`Event Photo Documentation (${photos.length} Photos)`, margin, y);
    y += 5;

    const imgW = (contentWidth - 6) / 2;
    const imgH = 42;

    for (let i = 0; i < Math.min(4, photos.length); i++) {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const posX = margin + col * (imgW + 6);
      const posY = y + row * (imgH + 4);

      try {
        doc.addImage(photos[i], 'JPEG', posX, posY, imgW, imgH);
      } catch (_e) {
        // Fallback placeholder box
        doc.setFillColor(243, 244, 246);
        doc.roundedRect(posX, posY, imgW, imgH, 1, 1, 'F');
        doc.setFontSize(7.5);
        doc.setTextColor(156, 163, 175);
        doc.text(`[Photo ${i + 1}]`, posX + imgW / 2, posY + imgH / 2, { align: 'center' });
      }
    }
    y += Math.ceil(Math.min(4, photos.length) / 2) * (imgH + 4) + 6;
  }

  // Attendees Roster Table
  const attendees = Array.isArray(report?.attendees) ? report.attendees : [];
  if (attendees.length > 0) {
    if (y > pageHeight - 60) {
      drawFooter(1);
      doc.addPage();
      drawHeader(false);
      y = 30;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(20, 83, 45);
    doc.text(`Verified Attendees & Feedback Roster (${attendees.length} participants)`, margin, y);
    y += 5;

    // Table Header
    doc.setFillColor(20, 83, 45);
    doc.rect(margin, y, contentWidth, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Participant Name', margin + 2, y + 4.2);
    doc.text('Phone', margin + 50, y + 4.2);
    doc.text('Check-in', margin + 85, y + 4.2);
    doc.text('Checkout / Rating', margin + 115, y + 4.2);
    doc.text('Feedback', margin + 145, y + 4.2);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    attendees.forEach((att, idx) => {
      if (y > pageHeight - 18) {
        drawFooter(doc.internal.getNumberOfPages());
        doc.addPage();
        drawHeader(false);
        y = 30;

        // Re-draw table header
        doc.setFillColor(20, 83, 45);
        doc.rect(margin, y, contentWidth, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.text('Participant Name', margin + 2, y + 4.2);
        doc.text('Phone', margin + 50, y + 4.2);
        doc.text('Check-in', margin + 85, y + 4.2);
        doc.text('Checkout / Rating', margin + 115, y + 4.2);
        doc.text('Feedback', margin + 145, y + 4.2);
        y += 6;
      }

      const bg = idx % 2 === 0 ? 255 : 249;
      doc.setFillColor(bg, bg, bg);
      doc.rect(margin, y, contentWidth, 5.5, 'F');

      doc.setTextColor(17, 24, 39);
      doc.text(att.name || 'Volunteer', margin + 2, y + 3.8);
      doc.text(att.phone || 'N/A', margin + 50, y + 3.8);
      doc.text(att.checked_in ? '✓ Present' : 'Absent', margin + 85, y + 3.8);
      doc.text(att.checked_out ? `✓ Checked Out (${att.rating || 5}★)` : 'Pending', margin + 115, y + 3.8);

      const fb = (att.feedback || '—').slice(0, 32);
      doc.text(fb, margin + 145, y + 3.8);

      y += 5.5;
    });
  }

  drawFooter(doc.internal.getNumberOfPages());
  return doc;
}
