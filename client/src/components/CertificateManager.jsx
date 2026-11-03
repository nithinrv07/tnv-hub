import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import QRCode from 'qrcode';

export default function CertificateManager({ initialTab = 'issue' }) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'issue' | 'active'
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [registeredParticipants, setRegisteredParticipants] = useState([]);
  const [activeTemplates, setActiveTemplates] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Template Image State
  const [templateImage, setTemplateImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [currentTemplateStatus, setCurrentTemplateStatus] = useState('DRAFT');
  const [publishedAt, setPublishedAt] = useState(null);

  // Field Coordinates Configuration (Percentages for responsive positioning)
  const [nameX, setNameX] = useState(50);
  const [nameY, setNameY] = useState(50);
  const [nameFontSize, setNameFontSize] = useState(36);
  const [nameColor, setNameColor] = useState('#1E4620');

  const [qrX, setQrX] = useState(50);
  const [qrY, setQrY] = useState(80);
  const [qrSize, setQrSize] = useState(120);

  const containerRef = useRef(null);

  // Load events and active templates on mount
  useEffect(() => {
    fetchEvents();
    fetchActiveTemplates();
  }, []);

  // Sync tab with initialTab prop if prop changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // When selected event changes, load its template
  useEffect(() => {
    if (selectedEventId) {
      fetchEventTemplateDetails(selectedEventId);
    } else {
      setTemplateImage(null);
      setImageFile(null);
      setRegisteredParticipants([]);
      setCurrentTemplateStatus('DRAFT');
      setPublishedAt(null);
    }
  }, [selectedEventId]);

  const getAuthToken = () => {
    return localStorage.getItem('tnv_token') || localStorage.getItem('token') || '';
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data && data.events) {
        // Keep non-draft events or all events
        const nonDrafts = data.events.filter(e => e.status !== 'Draft');
        const list = nonDrafts.length > 0 ? nonDrafts : data.events;
        setEvents(list);
        if (!selectedEventId && list.length > 0) {
          setSelectedEventId(list[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  const fetchActiveTemplates = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch('/api/certificates/templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.templates)) {
        setActiveTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch active templates:', err);
    }
  };

  const fetchEventTemplateDetails = async (eventId) => {
    try {
      setLoading(true);
      setError('');
      const token = getAuthToken();
      const res = await fetch(`/api/certificates/templates/${encodeURIComponent(eventId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      if (data && data.participants) {
        setRegisteredParticipants(data.participants);
      } else {
        // Fallback fetch participants
        fetchEventParticipants(eventId);
      }

      if (data && data.ok && data.template) {
        const tmpl = data.template;
        setTemplateImage(tmpl.image_url);
        setCurrentTemplateStatus(tmpl.status || 'DRAFT');
        setPublishedAt(tmpl.published_at || null);

        if (tmpl.name_position) {
          setNameX(tmpl.name_position.x ?? 50);
          setNameY(tmpl.name_position.y ?? 50);
          setNameFontSize(tmpl.name_position.fontSize ?? 36);
          setNameColor(tmpl.name_position.color || '#1E4620');
        }
        if (tmpl.qr_position) {
          setQrX(tmpl.qr_position.x ?? 50);
          setQrY(tmpl.qr_position.y ?? 80);
          setQrSize(tmpl.qr_position.size ?? 120);
        }
      } else {
        setTemplateImage(null);
        setImageFile(null);
        setCurrentTemplateStatus('DRAFT');
        setPublishedAt(null);
      }
    } catch (err) {
      console.error('Template detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventParticipants = async (eventId) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/participants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.participants)) {
        setRegisteredParticipants(data.participants);
      }
    } catch (err) {
      console.error('Failed to fetch participants:', err);
    }
  };

  // Image Upload Handler (Custom Template PNG/JPG only)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG or JPG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setTemplateImage(base64);
      setImageFile({ base64, name: file.name });
      setSuccess('Template design loaded. Adjust placement sliders and save.');
      setTimeout(() => setSuccess(''), 4000);
    };
    reader.readAsDataURL(file);
  };

  // Save Template Configuration
  const handleSaveTemplate = async () => {
    if (!selectedEventId) {
      setError('Please select an event first.');
      return;
    }
    if (!templateImage) {
      setError('Please upload a certificate template design before saving.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getAuthToken();
      const payload = {
        eventId: selectedEventId,
        imageBase64: imageFile?.base64 || templateImage,
        imageName: imageFile?.name || 'template.png',
        namePosition: {
          x: Math.round(nameX),
          y: Math.round(nameY),
          fontSize: Number(nameFontSize),
          color: nameColor
        },
        qrPosition: {
          x: Math.round(qrX),
          y: Math.round(qrY),
          size: Number(qrSize)
        }
      };

      const res = await fetch('/api/certificates/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to save certificate template.');
      }

      setSuccess('Certificate template layout saved successfully!');
      fetchActiveTemplates();
      setTimeout(() => setSuccess(''), 3500);
    } catch (err) {
      setError(err.message || 'Error saving template configuration.');
    } finally {
      setSaving(false);
    }
  };

  // Publish Certificates
  const handlePublishCertificates = async () => {
    if (!selectedEventId) {
      setError('Please select an event first.');
      return;
    }
    if (!templateImage) {
      setError('Please upload a template and save configuration before publishing.');
      return;
    }

    setPublishing(true);
    setError('');
    setSuccess('');

    try {
      // First save configuration to ensure coordinates are up to date
      await handleSaveTemplate();

      const token = getAuthToken();
      const res = await fetch(`/api/certificates/templates/${encodeURIComponent(selectedEventId)}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to publish certificates.');
      }

      setCurrentTemplateStatus('PUBLISHED');
      setPublishedAt(new Date().toISOString());
      setSuccess('🎉 Certificates successfully PUBLISHED! Registered volunteers can now immediately view and download their certificates from their dashboards.');
      fetchActiveTemplates();
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message || 'Error publishing certificates.');
    } finally {
      setPublishing(false);
    }
  };

  // Render Single Certificate on HTML5 Canvas
  const renderCertificateOnCanvas = async (attendeeName, verificationId) => {
    if (!templateImage) return null;

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1200;
          canvas.height = img.naturalHeight || 850;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);

          // 1. Draw template background
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // 2. Draw attendee name
          const pixelX = (nameX / 100) * canvas.width;
          const pixelY = (nameY / 100) * canvas.height;
          const scaledFontSize = Math.round(nameFontSize * (canvas.width / 1200));

          ctx.font = `bold ${scaledFontSize}px "Plus Jakarta Sans", Georgia, serif`;
          ctx.fillStyle = nameColor;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(attendeeName, pixelX, pixelY);

          // 3. Generate QR code as Data URL
          const qrText = `${window.location.origin}/verify/certificate/${encodeURIComponent(verificationId || 'TNV-SAMPLE')}`;
          const qrCanvas = document.createElement('canvas');
          await QRCode.toCanvas(qrCanvas, qrText, {
            margin: 1,
            width: qrSize,
            color: {
              dark: nameColor || '#1E4620',
              light: '#FFFFFF'
            }
          });

          // 4. Draw QR code onto main canvas
          const pixelQrX = (qrX / 100) * canvas.width;
          const pixelQrY = (qrY / 100) * canvas.height;
          const scaledQrSize = Math.round(qrSize * (canvas.width / 1200));

          ctx.drawImage(
            qrCanvas,
            pixelQrX - scaledQrSize / 2,
            pixelQrY - scaledQrSize / 2,
            scaledQrSize,
            scaledQrSize
          );

          canvas.toBlob((blob) => resolve(blob), 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load certificate template image'));
      img.src = templateImage;
    });
  };

  // Download Sample Certificate (PNG)
  const downloadSampleCertificate = async () => {
    if (!templateImage) {
      setError('Please upload a certificate template design first.');
      return;
    }

    setGenerating(true);
    setError('');

    try {
      const sampleAttendee = registeredParticipants[0]?.volunteer_name || 'Karthik Ramanathan';
      const sampleId = registeredParticipants[0]?.id || 'TNV-CERT-SAMPLE-001';
      const blob = await renderCertificateOnCanvas(sampleAttendee, sampleId);
      if (!blob) throw new Error('Failed to render certificate canvas.');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate-Sample-${sampleAttendee.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess(`Sample certificate downloaded for "${sampleAttendee}"!`);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Error generating sample certificate.');
    } finally {
      setGenerating(false);
    }
  };

  // Bulk Generate Certificates (ZIP)
  const downloadBulkCertificates = async () => {
    if (!selectedEventId) {
      setError('Please select an event first.');
      return;
    }
    if (!templateImage) {
      setError('Please upload a certificate template design first.');
      return;
    }

    // Participants list
    const participants = registeredParticipants.length > 0
      ? registeredParticipants
      : [{ id: 'sample-1', volunteer_name: 'Volunteer Participant' }];

    setGenerating(true);
    setError('');
    setSuccess('');
    setGenerateProgress(`Initializing ZIP archive for ${participants.length} certificates...`);

    try {
      const zip = new JSZip();
      const currentEvt = events.find(e => e.id === selectedEventId);
      const eventSlug = (currentEvt?.title || 'Event').replace(/[^a-zA-Z0-9]/g, '_');

      for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        const pName = p.volunteer_name || `Volunteer_${i + 1}`;
        setGenerateProgress(`Generating certificate ${i + 1} of ${participants.length}: ${pName}...`);

        const certBlob = await renderCertificateOnCanvas(pName, p.id || `TNV-CERT-${i + 1}`);
        if (certBlob) {
          const filename = `${pName.replace(/[^a-zA-Z0-9]/g, '_')}_Certificate.png`;
          zip.file(filename, certBlob);
        }
      }

      setGenerateProgress('Compressing ZIP archive package...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificates-${eventSlug}-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setSuccess(`Successfully generated and downloaded ZIP archive with ${participants.length} certificates!`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Error generating bulk certificates ZIP.');
    } finally {
      setGenerating(false);
      setGenerateProgress('');
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header with Navigation Tabs */}
      <div className="bg-white rounded-2xl border border-brand-green-tint p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-brand-green-dark font-display">
              Certificate Management Console
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-green-tint text-brand-green-dark text-xs font-bold font-display border border-brand-green/20">
              Live Engine
            </span>
          </div>
          <p className="text-xs text-neutral-muted mt-1">
            Upload custom template designs, configure Name & QR code placements, and issue certificates to registered event attendees.
          </p>
        </div>

        {/* Tab Switcher: Issue vs Active */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl shrink-0 border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveTab('issue')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'issue'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Issue Certificate
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('active'); fetchActiveTemplates(); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Active Certificates ({activeTemplates.length})
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <span>⚠️ {error}</span>
          <button type="button" onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-xs">
          <span>✅ {success}</span>
          <button type="button" onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 font-bold">×</button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: ISSUE CERTIFICATE DESIGNER                                     */}
      {/* ===================================================================== */}
      {activeTab === 'issue' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Column (Left) */}
          <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6 space-y-6 self-start">
            <h3 className="font-bold text-brand-green-dark text-base font-display pb-3 border-b border-neutral-100 flex items-center justify-between">
              <span>Layout & Template</span>
              {currentTemplateStatus === 'PUBLISHED' && (
                <span className="text-[10px] bg-brand-green text-white px-2 py-0.5 rounded-full font-extrabold uppercase">
                  Published
                </span>
              )}
            </h3>

            {/* Select Active Event */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-muted font-display">
                Select Event
              </label>
              <select
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 text-xs font-semibold text-neutral-800 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow"
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              >
                <option value="">Choose event...</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.start_date || 'Date TBD'})
                  </option>
                ))}
              </select>

              {selectedEvent && (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between">
                  <span>📍 {selectedEvent.district} &bull; {selectedEvent.venue}</span>
                  <span className="font-bold bg-white px-2 py-0.5 rounded shadow-xs text-brand-green-dark">
                    👥 {registeredParticipants.length} Registered
                  </span>
                </div>
              )}
            </div>

            {selectedEventId && (
              <>
                {/* Template Image Upload Box (PNG/JPG Only) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-muted font-display">
                    Certificate Background Image
                  </label>
                  <div className="relative border-2 border-dashed border-neutral-300 rounded-xl p-5 text-center hover:bg-neutral-50 transition-all cursor-pointer group">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleImageUpload}
                    />
                    <div className="w-10 h-10 rounded-full bg-brand-green-tint text-brand-green flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-brand-green-dark block">
                      {imageFile ? imageFile.name : 'Click to Upload Template Image'}
                    </span>
                    <span className="text-[10px] text-neutral-400 block mt-0.5">
                      PNG or JPG certificate template
                    </span>
                  </div>
                </div>

                {templateImage && (
                  <>
                    {/* NAME PLACEMENT CONTROLS */}
                    <div className="space-y-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-brand-green-dark uppercase tracking-wider font-display">
                          NAME PLACEMENT
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          X:{nameX}% Y:{nameY}%
                        </span>
                      </div>

                      {/* Name Horizontal Offset (X) */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                          <span>Horizontal Offset (X)</span>
                          <span className="font-bold font-mono">{nameX}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          className="w-full accent-[#1B6B3A] cursor-pointer"
                          value={nameX}
                          onChange={(e) => setNameX(Number(e.target.value))}
                        />
                      </div>

                      {/* Name Vertical Offset (Y) */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                          <span>Vertical Offset (Y)</span>
                          <span className="font-bold font-mono">{nameY}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          className="w-full accent-[#1B6B3A] cursor-pointer"
                          value={nameY}
                          onChange={(e) => setNameY(Number(e.target.value))}
                        />
                      </div>

                      {/* Font Settings */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1 font-display">
                            FONT SIZE (PX)
                          </label>
                          <input
                            type="number"
                            min="14"
                            max="96"
                            className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-800"
                            value={nameFontSize}
                            onChange={(e) => setNameFontSize(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1 font-display">
                            FONT COLOR (HEX)
                          </label>
                          <div className="flex items-center gap-1.5 border border-neutral-200 rounded-lg p-1 bg-white">
                            <input
                              type="color"
                              className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                              value={nameColor}
                              onChange={(e) => setNameColor(e.target.value)}
                            />
                            <input
                              type="text"
                              className="w-full text-xs font-mono font-bold text-neutral-700 outline-none"
                              value={nameColor}
                              onChange={(e) => setNameColor(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* QR CODE PLACEMENT CONTROLS */}
                    <div className="space-y-3 pt-3 border-t border-neutral-100">
                      <div className="flex items-center justify-between">
                        <span className="block text-xs font-bold text-brand-green-dark uppercase tracking-wider font-display">
                          QR CODE PLACEMENT
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          X:{qrX}% Y:{qrY}%
                        </span>
                      </div>

                      {/* QR X */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                          <span>Horizontal Offset (X)</span>
                          <span className="font-bold font-mono">{qrX}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          className="w-full accent-[#1B6B3A] cursor-pointer"
                          value={qrX}
                          onChange={(e) => setQrX(Number(e.target.value))}
                        />
                      </div>

                      {/* QR Y */}
                      <div>
                        <div className="flex justify-between text-xs font-medium text-neutral-600 mb-1">
                          <span>Vertical Offset (Y)</span>
                          <span className="font-bold font-mono">{qrY}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="95"
                          className="w-full accent-[#1B6B3A] cursor-pointer"
                          value={qrY}
                          onChange={(e) => setQrY(Number(e.target.value))}
                        />
                      </div>

                      {/* QR Size */}
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1 font-display">
                          QR CODE BLOCK SIZE (PX)
                        </label>
                        <input
                          type="number"
                          min="60"
                          max="250"
                          className="w-full px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-bold text-neutral-800"
                          value={qrSize}
                          onChange={(e) => setQrSize(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Operations Action Buttons */}
                    <div className="pt-4 border-t border-neutral-100 space-y-2.5">
                      <button
                        type="button"
                        onClick={handleSaveTemplate}
                        disabled={saving}
                        className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                      >
                        {saving ? 'Saving Layout...' : 'Save Configuration'}
                      </button>

                      <button
                        type="button"
                        onClick={downloadSampleCertificate}
                        disabled={generating}
                        className="w-full py-2.5 bg-white hover:bg-neutral-50 border border-neutral-300 text-neutral-800 font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Sample Certificate (PNG)</span>
                      </button>

                      <button
                        type="button"
                        onClick={downloadBulkCertificates}
                        disabled={generating}
                        className="w-full py-2.5 bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-extrabold rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                        </svg>
                        <span>Bulk Generate Certificates (ZIP)</span>
                      </button>

                      {/* Publish Action Button */}
                      <button
                        type="button"
                        onClick={handlePublishCertificates}
                        disabled={publishing}
                        className="w-full py-3 bg-brand-green hover:bg-brand-green-dark text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <svg className="w-4 h-4 text-brand-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{publishing ? 'Publishing...' : 'Publish Certificates (Make Live for Volunteers)'}</span>
                      </button>

                      {generateProgress && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-900 text-center animate-pulse">
                          {generateProgress}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Visual Preview Window Column (Right) */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-brand-green-tint p-5 sm:p-6 flex flex-col justify-start min-h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
              <h3 className="font-bold text-brand-green-dark text-base font-display">
                Interactive Layout Preview Window
              </h3>
              {publishedAt && (
                <span className="text-xs text-neutral-500 font-medium">
                  Published: {new Date(publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs text-neutral-muted">Loading template layout...</p>
              </div>
            ) : !templateImage ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-neutral-50/50 rounded-2xl border-2 border-dashed border-neutral-200">
                <div className="w-16 h-16 rounded-full bg-brand-green-tint text-brand-green flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h4 className="font-bold text-neutral-900 text-sm font-display">
                  Select Event and Upload Certificate Design
                </h4>
                <p className="text-xs text-neutral-muted max-w-sm mt-1">
                  Upload your organization's PNG or JPG certificate template to begin positioning recipient names and verified QR codes.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-neutral-900/5 p-4 rounded-xl border border-neutral-200 overflow-hidden">
                {/* Visual Canvas Layout Wrapper */}
                <div
                  ref={containerRef}
                  className="relative bg-white shadow-xl border border-neutral-300 overflow-hidden select-none w-full max-w-[640px] aspect-[1200/850]"
                >
                  {/* Background Template */}
                  <img
                    src={templateImage}
                    alt="Certificate Template"
                    className="w-full h-full object-fill pointer-events-none"
                  />

                  {/* Overlaid Name Block (Relative Percentages) */}
                  <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold px-2.5 py-0.5 rounded border border-dashed border-brand-green/60 bg-white/70 shadow-xs"
                    style={{
                      left: `${nameX}%`,
                      top: `${nameY}%`,
                      fontSize: `${Math.max(12, Math.round(nameFontSize * 0.45))}px`,
                      color: nameColor,
                      fontFamily: '"Plus Jakarta Sans", Georgia, serif'
                    }}
                  >
                    [{registeredParticipants[0]?.volunteer_name || 'Karthik Ramanathan'}]
                  </div>

                  {/* Overlaid QR Code Block (Relative Percentages) */}
                  <div
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-emerald-900 bg-white/95 flex flex-col items-center justify-center text-center shadow-xs"
                    style={{
                      left: `${qrX}%`,
                      top: `${qrY}%`,
                      width: `${Math.round(qrSize * 0.55)}px`,
                      height: `${Math.round(qrSize * 0.55)}px`
                    }}
                  >
                    <div className="w-5 h-5 rounded bg-brand-green/20 text-brand-green flex items-center justify-center text-[8px] font-bold mb-0.5">
                      QR
                    </div>
                    <span className="text-[8px] font-extrabold text-brand-green-dark uppercase leading-none">
                      VERIFIED
                    </span>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-neutral-500 text-center font-medium">
                  💡 Move the sliders on the left to align the recipient name and QR code block with your template's layout.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: ACTIVE CERTIFICATES REGISTER                                   */}
      {/* ===================================================================== */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-2xl shadow-sm border border-brand-green-tint overflow-hidden">
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-brand-green-dark text-base font-display">
                Active & Published Certificates Registry
              </h3>
              <p className="text-xs text-neutral-muted">
                Directory of configured event certificates and live volunteer distribution statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchActiveTemplates}
              className="text-xs font-bold text-brand-green hover:text-brand-green-dark p-2 hover:bg-neutral-50 rounded-lg transition-colors flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>

          {activeTemplates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-3">
                📜
              </div>
              <h4 className="font-bold text-neutral-800 text-sm font-display">No Certificates Issued Yet</h4>
              <p className="text-xs text-neutral-muted max-w-sm mx-auto mt-1">
                Go to the "Issue Certificate" tab, select an event, upload a template, and click Publish.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('issue')}
                className="mt-4 px-4 py-2 bg-brand-green text-white text-xs font-bold rounded-xl shadow-sm hover:bg-brand-green-dark transition-colors"
              >
                Issue First Certificate
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase tracking-wider font-display">
                  <tr>
                    <th className="py-3 px-4">Event Details</th>
                    <th className="py-3 px-4">Recipients</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Published Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {activeTemplates.map((t) => (
                    <tr key={t.id} className="hover:bg-neutral-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-neutral-900 text-sm font-display">{t.event_title}</div>
                        <div className="text-[11px] text-neutral-500 mt-0.5">
                          📍 {t.event_district || 'Tamil Nadu'} &bull; {t.event_date ? new Date(t.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-neutral-800 font-mono">
                          {t.registered_count} Attendees
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                            t.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600">
                        {t.published_at
                          ? new Date(t.published_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Not published'}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventId(t.event_id);
                            setActiveTab('issue');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-800 font-bold text-xs transition-colors"
                        >
                          Edit Layout
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventId(t.event_id);
                            setActiveTab('issue');
                            setTimeout(() => {
                              downloadBulkCertificates();
                            }, 500);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-brand-yellow hover:bg-amber-400 text-neutral-900 font-bold text-xs transition-colors shadow-xs"
                        >
                          Download ZIP
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
