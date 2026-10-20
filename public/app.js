document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Views
  const landingPageView = document.getElementById('landingPageView');
  const registrationView = document.getElementById('registrationView');
  const dashboardView = document.getElementById('dashboardView');
  const successModal = document.getElementById('successModal');
  const loginModal = document.getElementById('loginModal');
  
  const btnHeroRegister = document.getElementById('btnHeroRegister');
  const btnNavRegister = document.getElementById('btnNavRegister');
  const btnNavLogin = document.getElementById('btnNavLogin');
  const btnBackToLanding = document.getElementById('btnBackToLanding');
  const brandLogoBtn = document.getElementById('brandLogoBtn');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnModalCloseDone = document.getElementById('btnModalCloseDone');
  const btnCloseLoginModal = document.getElementById('btnCloseLoginModal');
  const btnLogout = document.getElementById('btnLogout');
  const btnRefreshStatus = document.getElementById('btnRefreshStatus');

  // Login Form
  const loginForm = document.getElementById('loginForm');
  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginAlert = document.getElementById('loginAlert');
  const btnLoginSubmit = document.getElementById('btnLoginSubmit');
  const loginSpinner = document.getElementById('loginSpinner');
  const loginText = document.getElementById('loginText');

  // Dashboard Elements
  const dashFullName = document.getElementById('dashFullName');
  const dashUsername = document.getElementById('dashUsername');
  const dpFullName = document.getElementById('dpFullName');
  const dpUsername = document.getElementById('dpUsername');
  const dpEmail = document.getElementById('dpEmail');
  const dpPhone = document.getElementById('dpPhone');
  const dpDistrict = document.getElementById('dpDistrict');
  const dpCategory = document.getElementById('dpCategory');
  const dpOccupation = document.getElementById('dpOccupation');
  const dpAadhaar = document.getElementById('dpAadhaar');
  const dashMembershipBadge = document.getElementById('dashMembershipBadge');
  const dashPaidView = document.getElementById('dashPaidView');
  const dashUnpaidView = document.getElementById('dashUnpaidView');
  const dashReceiptNo = document.getElementById('dashReceiptNo');
  const dashDownloadReceiptBtn = document.getElementById('dashDownloadReceiptBtn');
  const btnDashPayNow = document.getElementById('btnDashPayNow');

  // Guard Test Elements
  const btnTestDocAccess = document.getElementById('btnTestDocAccess');
  const btnTestMyLinks = document.getElementById('btnTestMyLinks');
  const btnTestAdminGuard = document.getElementById('btnTestAdminGuard');
  const resDocGuard = document.getElementById('resDocGuard');
  const resLinksGuard = document.getElementById('resLinksGuard');
  const resAdminGuard = document.getElementById('resAdminGuard');

  // Step 12 & Part C Elements
  const btnTogglePending = document.getElementById('btnTogglePending');
  const btnToggleApproved = document.getElementById('btnToggleApproved');
  const underReviewBanner = document.getElementById('underReviewBanner');
  const approvedMemberBanner = document.getElementById('approvedMemberBanner');
  const dashTnvId = document.getElementById('dashTnvId');
  const dashRole = document.getElementById('dashRole');
  const dashWing = document.getElementById('dashWing');
  const dashDistrictBadge = document.getElementById('dashDistrictBadge');
  const lockedCardsSection = document.getElementById('lockedCardsSection');
  const unlockedCardsSection = document.getElementById('unlockedCardsSection');
  const btnDownloadIdCard = document.getElementById('btnDownloadIdCard');
  const btnDownloadApptLetter = document.getElementById('btnDownloadApptLetter');
  const unlockedLinksBadge = document.getElementById('unlockedLinksBadge');
  const unlockedCommunityLinksList = document.getElementById('unlockedCommunityLinksList');

  // Form Elements
  const districtSelect = document.getElementById('district');
  const categorySelect = document.getElementById('category');
  const fieldOrgName = document.getElementById('fieldOrgName');
  const labelOrgName = document.getElementById('labelOrgName');
  const organizationNameInput = document.getElementById('organizationName');
  const affiliationManual = document.getElementById('affiliationManual');
  const workStudyStatusSelect = document.getElementById('workStudyStatus');
  const fieldEmployerName = document.getElementById('fieldEmployerName');
  const labelEmployerName = document.getElementById('labelEmployerName');
  const employerNameInput = document.getElementById('employerName');
  const workStudyStatusManual = document.getElementById('workStudyStatusManual');
  const bloodGroupSelect = document.getElementById('bloodGroup');
  const genderSelect = document.getElementById('gender');
  const maritalStatusSelect = document.getElementById('maritalStatus');
  const occupationInput = document.getElementById('occupation');
  const assemblyConstituencySelect = document.getElementById('assemblyConstituency');
  const panchayatInput = document.getElementById('panchayat');
  const wingToJoinSelect = document.getElementById('wingToJoin');
  const departmentSelect = document.getElementById('departmentSelect');
  const modeOfWorkSelect = document.getElementById('modeOfWork');
  const previousExperienceTextarea = document.getElementById('previousExperience');
  const prevWorkWordCount = document.getElementById('prevWorkWordCount');
  const pastFieldWorkContainer = document.getElementById('pastFieldWorkContainer');
  const pastFieldWorkCount = document.getElementById('pastFieldWorkCount');
  const pfwTriggerBox = document.getElementById('pfwTriggerBox');
  const pfwTriggerText = document.getElementById('pfwTriggerText');
  const pfwTriggerArrow = document.getElementById('pfwTriggerArrow');
  const pfwPanel = document.getElementById('pfwPanel');
  const pfwSearchInput = document.getElementById('pfwSearchInput');
  const btnPfwClearAll = document.getElementById('btnPfwClearAll');
  const btnPfwDone = document.getElementById('btnPfwDone');

  // Dashboard Extra Elements
  const dpOrgNameRow = document.getElementById('dpOrgNameRow');
  const dpOrgNameLabel = document.getElementById('dpOrgNameLabel');
  const dpOrganizationName = document.getElementById('dpOrganizationName');
  const dpWorkStudyStatus = document.getElementById('dpWorkStudyStatus');
  const dpEmployerNameRow = document.getElementById('dpEmployerNameRow');
  const dpEmployerNameLabel = document.getElementById('dpEmployerNameLabel');
  const dpEmployerName = document.getElementById('dpEmployerName');
  const dpConstituency = document.getElementById('dpConstituency');
  const dpPanchayat = document.getElementById('dpPanchayat');
  const dpWingToJoin = document.getElementById('dpWingToJoin');
  const dpDepartment = document.getElementById('dpDepartment');
  const dpModeOfWork = document.getElementById('dpModeOfWork');
  const dpPreviousExperience = document.getElementById('dpPreviousExperience');
  const dpPastFieldWorkChips = document.getElementById('dpPastFieldWorkChips');
  
  const emailInput = document.getElementById('email');
  const emailBadge = document.getElementById('emailBadge');
  const usernameInput = document.getElementById('username');
  const usernameBadge = document.getElementById('usernameBadge');
  const backendStatus = document.getElementById('backendStatus');
  const statDistrictsCount = document.getElementById('statDistrictsCount');

  // Photo Uploader Elements
  const photoUploaderBox = document.getElementById('photoUploaderBox');
  const photoFileInput = document.getElementById('photoFileInput');
  const photoPath = document.getElementById('photoPath');
  const photoPreviewImg = document.getElementById('photoPreviewImg');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  const btnSelectPhoto = document.getElementById('btnSelectPhoto');
  const btnSamplePhoto = document.getElementById('btnSamplePhoto');
  const btnWebcamSnap = document.getElementById('btnWebcamSnap');
  const btnRemovePhoto = document.getElementById('btnRemovePhoto');
  const photoStatusBadge = document.getElementById('photoStatusBadge');

  // Webcam Modal Elements
  const webcamModal = document.getElementById('webcamModal');
  const webcamVideo = document.getElementById('webcamVideo');
  const webcamCanvas = document.getElementById('webcamCanvas');
  const btnCapturePhoto = document.getElementById('btnCapturePhoto');
  const btnCancelWebcam = document.getElementById('btnCancelWebcam');
  const btnCloseWebcamModal = document.getElementById('btnCloseWebcamModal');

  // Dashboard Avatar & Visual ID Card Elements
  const dpAvatarImg = document.getElementById('dpAvatarImg');
  const dpAvatarPlaceholder = document.getElementById('dpAvatarPlaceholder');
  const dpMetaName = document.getElementById('dpMetaName');
  const dpMetaUsername = document.getElementById('dpMetaUsername');
  const dpMetaDistrict = document.getElementById('dpMetaDistrict');
  const btnUpdateDashPhoto = document.getElementById('btnUpdateDashPhoto');
  const dashPhotoFileInput = document.getElementById('dashPhotoFileInput');


  const registrationForm = document.getElementById('registrationForm');
  const formAlert = document.getElementById('formAlert');
  const btnSubmit = document.getElementById('btnSubmit');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitText = document.getElementById('submitText');

  // Payment Selection Elements
  const radioPayNow = document.getElementById('radioPayNow');
  const radioSkipPay = document.getElementById('radioSkipPay');
  const cardPayOption = document.getElementById('cardPayOption');
  const cardSkipOption = document.getElementById('cardSkipOption');
  const qrDisplayBox = document.getElementById('qrDisplayBox');
  const skipNoticeBox = document.getElementById('skipNoticeBox');
  const qrUtrInput = document.getElementById('qrUtrInput');

  // Quick Testing Buttons
  const btnFillValid = document.getElementById('btnFillValid');
  const btnFillBadAadhaar = document.getElementById('btnFillBadAadhaar');
  const btnFillDuplicateUser = document.getElementById('btnFillDuplicateUser');
  const btnFillDuplicateEmail = document.getElementById('btnFillDuplicateEmail');
  const btnRefreshLandingQueue = document.getElementById('btnRefreshLandingQueue');
  const landingQueueList = document.getElementById('landingQueueList');

  // Modal Result Elements
  const resUserId = document.getElementById('resUserId');
  const resUsername = document.getElementById('resUsername');
  const resStatus = document.getElementById('resStatus');
  const resMembership = document.getElementById('resMembership');
  const resAadhaar = document.getElementById('resAadhaar');
  const resDistrict = document.getElementById('resDistrict');
  const resNotifMsg = document.getElementById('resNotifMsg');
  const modalReceiptArea = document.getElementById('modalReceiptArea');
  const resReceiptNoText = document.getElementById('resReceiptNoText');
  const modalDownloadReceiptBtn = document.getElementById('modalDownloadReceiptBtn');

  let usernameDebounceTimer = null;

  // =========================================================================
  // VIEW NAVIGATION: Landing Page <-> Registration <-> Dashboard
  // =========================================================================
  function showRegistrationForm() {
    const adminEl = document.getElementById('adminView');
    if (adminEl) adminEl.classList.add('hidden');
    landingPageView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    registrationView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showLandingPage() {
    const adminEl = document.getElementById('adminView');
    if (adminEl) adminEl.classList.add('hidden');
    registrationView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    landingPageView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadAdminQueue();
  }

  function showApplicantDashboard(profile) {
    const adminEl = document.getElementById('adminView');
    if (adminEl) adminEl.classList.add('hidden');
    landingPageView.classList.add('hidden');
    registrationView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    populateDashboard(profile);
  }

  btnHeroRegister.addEventListener('click', showRegistrationForm);
  btnNavRegister.addEventListener('click', showRegistrationForm);
  btnBackToLanding.addEventListener('click', showLandingPage);
  brandLogoBtn.addEventListener('click', showLandingPage);

  // Login Modal Toggle
  btnNavLogin.addEventListener('click', () => {
    loginModal.classList.remove('hidden');
    loginAlert.className = 'alert hidden';
    loginForm.reset();
    loginUsername.focus();
  });

  btnCloseLoginModal.addEventListener('click', () => {
    loginModal.classList.add('hidden');
  });

  // Close Success Modal -> Direct to Dashboard
  function closeModal() {
    successModal.classList.add('hidden');
    if (window.currentRegisteredProfile) {
      showApplicantDashboard(window.currentRegisteredProfile);
    } else {
      showLandingPage();
    }
  }
  btnCloseModal.addEventListener('click', closeModal);
  btnModalCloseDone.addEventListener('click', closeModal);

  // Logout
  btnLogout.addEventListener('click', () => {
    window.currentSessionToken = null;
    window.currentRegisteredProfile = null;
    localStorage.removeItem('tnv_token');
    showLandingPage();
    alert('Logged out successfully.');
  });

  // =========================================================================
  // STEP 6: SIGN IN (Username + Password via login_email_for)
  // =========================================================================
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginAlert.className = 'alert hidden';
    loginSpinner.classList.remove('hidden');
    loginText.textContent = 'Signing in...';

    const u = loginUsername.value.trim();
    const p = loginPassword.value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      });

      const data = await res.json();

      if (!res.ok) {
        loginAlert.className = 'alert alert-danger';
        loginAlert.textContent = data.error || 'Invalid credentials';
        loginAlert.classList.remove('hidden');
        return;
      }

      window.currentSessionToken = data.session.access_token;
      window.currentRegisteredProfile = data.profile;
      localStorage.setItem('tnv_token', data.session.access_token);

      loginModal.classList.add('hidden');
      showApplicantDashboard(data.profile);

    } catch (err) {
      loginAlert.className = 'alert alert-danger';
      loginAlert.textContent = 'Network error: ' + err.message;
      loginAlert.classList.remove('hidden');
    } finally {
      loginSpinner.classList.add('hidden');
      loginText.textContent = 'Sign In to Dashboard';
    }
  });

  // =========================================================================
  // STEP 5 & 12: APPLICANT DASHBOARD POPULATION & STEP 12 UNLOCKS
  // =========================================================================
  function populateDashboard(profile) {
    if (!profile) return;

    dashFullName.textContent = profile.full_name || 'Volunteer';
    dashUsername.textContent = '@' + (profile.username || '');
    dpFullName.textContent = profile.full_name || '-';
    dpUsername.textContent = '@' + (profile.username || '-');
    dpEmail.textContent = profile.email || '-';
    dpPhone.textContent = profile.phone || '-';
    dpDistrict.textContent = profile.district_name || ('District ' + profile.district_id);
    if (dpCategory) dpCategory.textContent = profile.affiliation || profile.category || '-';
    
    // Organization Name row (Dynamic)
    if (dpOrgNameRow && dpOrganizationName) {
      if (profile.organization_name) {
        dpOrgNameRow.style.display = 'flex';
        const aff = (profile.affiliation || profile.category || '').toLowerCase();
        if (dpOrgNameLabel) {
          if (aff === 'ngo') dpOrgNameLabel.textContent = 'NGO Name:';
          else if (aff === 'trust') dpOrgNameLabel.textContent = 'Trust Name:';
          else if (aff === 'club') dpOrgNameLabel.textContent = 'Club Name:';
          else if (aff === 'school') dpOrgNameLabel.textContent = 'School Name:';
          else if (aff === 'college') dpOrgNameLabel.textContent = 'College Name:';
          else if (aff === 'association') dpOrgNameLabel.textContent = 'Association Name:';
          else if (aff === 'company') dpOrgNameLabel.textContent = 'Company Name:';
          else if (aff === 'other') dpOrgNameLabel.textContent = 'Other Name:';
          else dpOrgNameLabel.textContent = 'Organization Name:';
        }
        dpOrganizationName.textContent = profile.organization_name;
      } else {
        dpOrgNameRow.style.display = 'none';
      }
    }

    if (dpOccupation) dpOccupation.textContent = profile.occupation || '-';
    if (dpWorkStudyStatus) dpWorkStudyStatus.textContent = profile.work_study_status || '-';

    // Employer / Institution Name row (Dynamic)
    if (dpEmployerNameRow && dpEmployerName) {
      if (profile.employer_name) {
        dpEmployerNameRow.style.display = 'flex';
        if (dpEmployerNameLabel) {
          if (profile.work_study_status === 'Student') {
            dpEmployerNameLabel.textContent = 'School / College / Institution:';
          } else {
            dpEmployerNameLabel.textContent = 'Company / Employer:';
          }
        }
        dpEmployerName.textContent = profile.employer_name;
      } else {
        dpEmployerNameRow.style.display = 'none';
      }
    }

    if (dpConstituency) dpConstituency.textContent = profile.assembly_constituency || '-';
    if (dpPanchayat) dpPanchayat.textContent = profile.panchayat || '-';
    if (dpWingToJoin) dpWingToJoin.textContent = profile.wing_to_join || '-';
    if (dpDepartment) dpDepartment.textContent = profile.department || '-';
    if (dpModeOfWork) dpModeOfWork.textContent = profile.mode_of_work || '-';
    dpAadhaar.textContent = 'XXXX XXXX ' + (profile.aadhaar_last4 || '----');
    if (dpPreviousExperience) dpPreviousExperience.textContent = profile.previous_experience || 'Nil';

    if (dpPastFieldWorkChips) {
      dpPastFieldWorkChips.innerHTML = '';
      const fieldWorks = Array.isArray(profile.past_field_work)
        ? profile.past_field_work
        : (typeof profile.past_field_work === 'string' && profile.past_field_work ? profile.past_field_work.split(',') : []);

      if (fieldWorks.length > 0) {
        fieldWorks.forEach(fw => {
          const chip = document.createElement('span');
          chip.className = 'fieldwork-dash-badge';
          chip.textContent = '★ ' + fw.trim();
          dpPastFieldWorkChips.appendChild(chip);
        });
      } else {
        dpPastFieldWorkChips.innerHTML = '<span style="font-size:12px; color:#64748b;">No past field work specified</span>';
      }
    }

    // Render Avatar in Registered Profile Details Card
    const avatarUrl = profile.photo_url || profile.photo_path;
    if (avatarUrl && (avatarUrl.startsWith('data:image') || avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
      dpAvatarImg.src = avatarUrl;
      dpAvatarImg.classList.remove('hidden');
      dpAvatarPlaceholder.classList.add('hidden');
    } else {
      dpAvatarImg.classList.add('hidden');
      dpAvatarPlaceholder.classList.remove('hidden');
    }

    dpMetaName.textContent = profile.full_name || 'Volunteer';
    dpMetaUsername.textContent = '@' + (profile.username || '');
    dpMetaDistrict.textContent = profile.district_name || 'Tamil Nadu';

    // Step 12: Approval Status Toggle Handling
    const isApproved = profile.status === 'approved';
    if (isApproved) {
      btnToggleApproved.classList.add('active');
      btnTogglePending.classList.remove('active');

      underReviewBanner.classList.add('hidden');
      approvedMemberBanner.classList.remove('hidden');

      dashTnvId.textContent = profile.tnv_id || 'TNV-CHE-0001';
      dashRole.textContent = profile.role || 'Volunteer';
      dashWing.textContent = (profile.wing_name || 'Administration') + ' Wing';
      dashDistrictBadge.textContent = profile.district_name || 'Tamil Nadu';

      lockedCardsSection.classList.add('hidden');
      unlockedCardsSection.classList.remove('hidden');

      if (btnDownloadIdCard) {
        btnDownloadIdCard.href = `/api/id-card/${profile.id}.pdf`;
      }
      if (btnDownloadApptLetter) {
        btnDownloadApptLetter.href = `/api/appointment/${profile.id}.pdf`;
      }

      loadUnlockedCommunityLinks();
    } else {
      btnTogglePending.classList.add('active');
      btnToggleApproved.classList.remove('active');

      underReviewBanner.classList.remove('hidden');
      approvedMemberBanner.classList.add('hidden');

      lockedCardsSection.classList.remove('hidden');
      unlockedCardsSection.classList.add('hidden');
    }

    if (profile.membership_paid) {
      dashMembershipBadge.textContent = 'PAID (₹365)';
      dashMembershipBadge.className = 'badge badge-success';
      dashPaidView.classList.remove('hidden');
      dashUnpaidView.classList.add('hidden');
      if (profile.receipt_no) {
        dashReceiptNo.textContent = profile.receipt_no;
        dashDownloadReceiptBtn.href = `/api/receipts/${profile.receipt_no}.pdf`;
      }
    } else {
      dashMembershipBadge.textContent = 'UNPAID (Skipped)';
      dashMembershipBadge.className = 'badge badge-neutral';
      dashPaidView.classList.add('hidden');
      dashUnpaidView.classList.remove('hidden');
    }

    // Reset guard test displays
    resDocGuard.textContent = '-';
    resLinksGuard.textContent = '-';
    resAdminGuard.textContent = '-';
  }

  // Load Unlocked Community Links (Step 14)
  async function loadUnlockedCommunityLinks() {
    if (!window.currentSessionToken) return;
    try {
      const res = await fetch('/api/my-links', {
        headers: { 'Authorization': `Bearer ${window.currentSessionToken}` }
      });
      const data = await res.json();
      if (data.links && data.links.length > 0) {
        unlockedLinksBadge.textContent = `${data.links.length} Groups Active`;
        unlockedCommunityLinksList.innerHTML = '';
        data.links.forEach(link => {
          const row = document.createElement('div');
          row.className = 'community-link-row';
          let icon = '💬';
          if (link.kind === 'district') icon = '🏛️';
          else if (link.kind === 'wing') icon = '🛡️';
          else if (link.kind === 'sector') icon = '🤝';
          else if (link.kind === 'announcements') icon = '📢';
          else if (link.kind === 'social') icon = '🌟';

          row.innerHTML = `
            <div class="link-info">
              <span class="link-icon">${icon}</span>
              <div>
                <span class="link-name">${escapeHtml(link.label)}</span>
                <span class="link-kind-badge">${escapeHtml(link.kind)}</span>
              </div>
            </div>
            <a href="${escapeHtml(link.url)}" target="_blank" class="btn-join-whatsapp">&#128172; Join Group</a>
          `;
          unlockedCommunityLinksList.appendChild(row);
        });
      }
    } catch (err) {
      console.error('Failed to load community links:', err);
    }
  }

  // Simulator Toggle Handlers (Part B Bypass)
  btnToggleApproved.addEventListener('click', async () => {
    if (!window.currentSessionToken) return;
    try {
      const res = await fetch('/api/test/toggle-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.currentSessionToken}`
        },
        body: JSON.stringify({ status: 'approved', role: 'Volunteer' })
      });
      const data = await res.json();
      if (data.success) {
        window.currentRegisteredProfile = data.profile;
        populateDashboard(data.profile);
      }
    } catch (err) {
      console.error('Approval toggle error:', err);
    }
  });

  btnTogglePending.addEventListener('click', async () => {
    if (!window.currentSessionToken) return;
    try {
      const res = await fetch('/api/test/toggle-approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.currentSessionToken}`
        },
        body: JSON.stringify({ status: 'pending' })
      });
      const data = await res.json();
      if (data.success) {
        window.currentRegisteredProfile = data.profile;
        populateDashboard(data.profile);
      }
    } catch (err) {
      console.error('Pending toggle error:', err);
    }
  });

  // Refresh Status
  btnRefreshStatus.addEventListener('click', async () => {
    if (!window.currentSessionToken) return;
    try {
      const res = await fetch('/api/my-profile', {
        headers: { 'Authorization': `Bearer ${window.currentSessionToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        window.currentRegisteredProfile = data.profile;
        populateDashboard(data.profile);
        alert(`Status refreshed: Application is ${data.profile.status.toUpperCase()}`);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Pay Now from Dashboard
  btnDashPayNow.addEventListener('click', async () => {
    if (!window.currentSessionToken) return;
    btnDashPayNow.disabled = true;
    btnDashPayNow.textContent = 'Processing Payment...';

    try {
      const res = await fetch('/api/record-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${window.currentSessionToken}`
        },
        body: JSON.stringify({
          gateway_ref: `DASH_PAY_${Date.now()}`
        })
      });

      const data = await res.json();
      if (res.ok) {
        window.currentRegisteredProfile.membership_paid = true;
        window.currentRegisteredProfile.receipt_no = data.receipt_no;
        populateDashboard(window.currentRegisteredProfile);
        alert(`Success! Payment recorded. Receipt ${data.receipt_no} generated.`);
      } else {
        alert('Payment failed: ' + data.error);
      }
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      btnDashPayNow.disabled = false;
      btnDashPayNow.textContent = '💳 Pay ₹365 Now via UPI QR';
    }
  });

  // Security Guard Checks (Testing Step 5 rules)
  btnTestDocAccess.addEventListener('click', async () => {
    resDocGuard.textContent = 'Checking...';
    try {
      const res = await fetch('/api/member-documents', {
        headers: { 'Authorization': `Bearer ${window.currentSessionToken || ''}` }
      });
      const data = await res.json();
      if (res.status === 403) {
        resDocGuard.innerHTML = `<span style="color:#f87171;">&#128274; Refused: HTTP 403 Forbidden (Locked until approved)</span>`;
      } else if (res.status === 200) {
        resDocGuard.innerHTML = `<span style="color:#34d399;">&#10004; Granted: HTTP 200 OK (ID Card & Appointment Letter unlocked)</span>`;
      } else {
        resDocGuard.textContent = JSON.stringify(data);
      }
    } catch (err) {
      resDocGuard.textContent = 'Error: ' + err.message;
    }
  });

  btnTestMyLinks.addEventListener('click', async () => {
    resLinksGuard.textContent = 'Calling my_links()...';
    try {
      const res = await fetch('/api/my-links', {
        headers: { 'Authorization': `Bearer ${window.currentSessionToken || ''}` }
      });
      const data = await res.json();
      if (data.links.length === 0) {
        resLinksGuard.innerHTML = `<span style="color:#fbbf24;">&#10004; Returned 0 rows (${data.notice || 'Locked'})</span>`;
      } else {
        resLinksGuard.innerHTML = `<span style="color:#34d399;">&#10004; Returned ${data.links.length} unlocked community rows</span>`;
      }
    } catch (err) {
      resLinksGuard.textContent = 'Error: ' + err.message;
    }
  });

  btnTestAdminGuard.addEventListener('click', async () => {
    resAdminGuard.textContent = 'Attempting /admin access...';
    try {
      const res = await fetch('/api/admin/queue', {
        headers: { 'Authorization': `Bearer ${window.currentSessionToken || ''}` }
      });
      const data = await res.json();
      if (res.status === 403) {
        resAdminGuard.innerHTML = `<span style="color:#f87171;">&#128683; Refused: HTTP 403 Forbidden (${data.error})</span>`;
      } else {
        resAdminGuard.textContent = 'Unexpected access: ' + JSON.stringify(data);
      }
    } catch (err) {
      resAdminGuard.textContent = 'Error: ' + err.message;
    }
  });

  // =========================================================================
  // STEP 4: PAYMENT SELECTION (UPI QR vs SKIP)
  // =========================================================================
  function updatePaymentUi() {
    if (radioPayNow.checked) {
      cardPayOption.classList.add('active');
      cardSkipOption.classList.remove('active');
      qrDisplayBox.classList.remove('hidden');
      skipNoticeBox.classList.add('hidden');
      btnSubmit.innerHTML = '<span id="submitSpinner" class="spinner hidden"></span><span>Verify & Submit (with ₹365 Membership)</span>';
    } else {
      cardSkipOption.classList.add('active');
      cardPayOption.classList.remove('active');
      qrDisplayBox.classList.add('hidden');
      skipNoticeBox.classList.remove('hidden');
      btnSubmit.innerHTML = '<span id="submitSpinner" class="spinner hidden"></span><span>Submit Registration (Skip Payment)</span>';
    }
  }

  cardPayOption.addEventListener('click', () => {
    radioPayNow.checked = true;
    updatePaymentUi();
  });

  cardSkipOption.addEventListener('click', () => {
    radioSkipPay.checked = true;
    updatePaymentUi();
  });

  // =========================================================================
  // STEP 1: Load 38 Tamil Nadu Districts
  // =========================================================================
  async function loadDistricts() {
    try {
      const res = await fetch('/api/districts');
      const data = await res.json();
      
      if (data.districts && Array.isArray(data.districts)) {
        districtSelect.innerHTML = '<option value="">-- Select District (38 Tamil Nadu Districts) --</option>';
        data.districts.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d.id;
          opt.textContent = `${d.id}. ${d.name}`;
          districtSelect.appendChild(opt);
        });

        backendStatus.textContent = `All ${data.districts.length} TN Districts Loaded`;
        if (statDistrictsCount) statDistrictsCount.textContent = data.districts.length;
      }
    } catch (err) {
      console.error('Failed to load districts:', err);
      backendStatus.textContent = 'Error loading districts';
    }
  }

  // =========================================================================
  // =========================================================================
  // Load Clean Dropdown Options & Setup Dynamic Field Handlers
  // =========================================================================
  window.cachedConstituencies = {};
  window.cachedDepartmentsByWing = {};

  async function loadDropdownOptions() {
    try {
      const res = await fetch('/api/options');
      const options = await res.json();

      // 1. Affiliation / Category (Requirement 1 - exact options from Image 1)
      if (categorySelect) {
        categorySelect.innerHTML = '<option value="">— Select —</option>';
        const affiliationsList = options.affiliations || options.categories || [
          'Individual', 'NGO', 'Trust', 'Club', 'School', 'College',
          'Association', 'Company', 'Other', 'Others (type manually)'
        ];
        affiliationsList.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          categorySelect.appendChild(opt);
        });
      }

      // Work / Study Status
      if (workStudyStatusSelect) {
        workStudyStatusSelect.innerHTML = '<option value="">— Select —</option>';
        const statusList = options.work_study_statuses || [
          'Working', 'Student', 'Other', 'Others (type manually)'
        ];
        statusList.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s;
          opt.textContent = s;
          workStudyStatusSelect.appendChild(opt);
        });
      }

      // Blood Groups
      if (bloodGroupSelect && options.blood_groups) {
        bloodGroupSelect.innerHTML = '<option value="">-- Select Blood Group (Optional) --</option>';
        options.blood_groups.forEach(bg => {
          const opt = document.createElement('option');
          opt.value = bg;
          opt.textContent = bg;
          bloodGroupSelect.appendChild(opt);
        });
      }

      // Genders
      if (genderSelect && options.genders) {
        genderSelect.innerHTML = '<option value="">-- Select Gender --</option>';
        options.genders.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g;
          opt.textContent = g;
          genderSelect.appendChild(opt);
        });
      }

      // Marital Statuses
      if (maritalStatusSelect && options.marital_statuses) {
        maritalStatusSelect.innerHTML = '<option value="">-- Select Marital Status --</option>';
        options.marital_statuses.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          maritalStatusSelect.appendChild(opt);
        });
      }

      // Cache constituencies and departments for instant dynamic lookups
      if (options.constituencies_by_district) {
        window.cachedConstituencies = options.constituencies_by_district;
      }
      if (options.departments_by_wing) {
        window.cachedDepartmentsByWing = options.departments_by_wing;
      }

      // 6. Wing to Join (Requirement 6 - from Image 4)
      if (wingToJoinSelect) {
        wingToJoinSelect.innerHTML = '<option value="">— Select wing —</option>';
        const wingsList = options.wings || [
          'Management Wing — Governance, Systems & Organizational Support',
          'Operations Wing — Programs, Public Service & Social Impact'
        ];
        wingsList.forEach(w => {
          const opt = document.createElement('option');
          opt.value = w;
          opt.textContent = w;
          wingToJoinSelect.appendChild(opt);
        });
      }

      // 7. Mode of Work (Requirement 7 - from Image 5)
      if (modeOfWorkSelect) {
        modeOfWorkSelect.innerHTML = '<option value="">— Select —</option>';
        const modesList = options.modes_of_work || [
          'Online Volunteering',
          'Field Volunteering',
          'Both'
        ];
        modesList.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m;
          opt.textContent = m;
          modeOfWorkSelect.appendChild(opt);
        });
      }

      // 5. Past Field Work (Requirement 5 - select all that apply)
      if (pastFieldWorkContainer && options.past_field_work_departments) {
        renderPastFieldWorkItems(options.past_field_work_departments);
      }

      // Initialize dynamic field states
      updateAffiliationDynamicFields();
      updateWorkStudyDynamicFields();

    } catch (err) {
      console.error('Failed to load options:', err);
    }
  }

  // Render Past Field Work Checkboxes grouped by Department (Searchable Dropdown)
  function renderPastFieldWorkItems(depts) {
    if (!pastFieldWorkContainer) return;
    pastFieldWorkContainer.innerHTML = '';

    depts.forEach((group, gIdx) => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'pfw-dept-group';

      const titleDiv = document.createElement('div');
      titleDiv.className = 'pfw-dept-title';
      titleDiv.textContent = (group.department || '').toUpperCase();
      groupDiv.appendChild(titleDiv);

      const items = group.items || group.initiatives || [];
      items.forEach((item, iIdx) => {
        const id = `pfw_${gIdx}_${iIdx}`;
        const row = document.createElement('label');
        row.className = 'pfw-item-row';
        row.setAttribute('for', id);

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.id = id;
        cb.value = item;
        cb.name = 'past_field_work_items';
        cb.className = 'pfw-checkbox';
        cb.addEventListener('change', updatePastFieldWorkCount);

        const textSpan = document.createElement('span');
        textSpan.textContent = item;

        row.appendChild(cb);
        row.appendChild(textSpan);
        groupDiv.appendChild(row);
      });

      pastFieldWorkContainer.appendChild(groupDiv);
    });

    updatePastFieldWorkCount();
  }

  function updatePastFieldWorkCount() {
    if (!pastFieldWorkContainer) return;
    const checked = Array.from(pastFieldWorkContainer.querySelectorAll('input[type="checkbox"]:checked'));
    if (pastFieldWorkCount) {
      pastFieldWorkCount.textContent = `${checked.length} selected`;
      if (checked.length > 0) {
        pastFieldWorkCount.className = 'badge badge-primary';
      } else {
        pastFieldWorkCount.className = 'badge badge-neutral';
      }
    }

    if (pfwTriggerText) {
      if (checked.length === 0) {
        pfwTriggerText.textContent = '— Select past field work —';
        pfwTriggerText.classList.remove('has-selection');
      } else if (checked.length === 1) {
        pfwTriggerText.textContent = checked[0].value;
        pfwTriggerText.classList.add('has-selection');
      } else {
        pfwTriggerText.textContent = `${checked[0].value} (+${checked.length - 1} more)`;
        pfwTriggerText.classList.add('has-selection');
      }
    }
  }

  // Past Field Work Dropdown Toggle & Actions
  function openPfwDropdown() {
    if (!pfwPanel) return;
    pfwPanel.classList.remove('hidden');
    if (pfwTriggerBox) pfwTriggerBox.classList.add('active');
    if (pfwTriggerArrow) pfwTriggerArrow.innerHTML = '&#9650;';
    if (pfwSearchInput) {
      pfwSearchInput.focus();
    }
  }

  function closePfwDropdown() {
    if (!pfwPanel) return;
    pfwPanel.classList.add('hidden');
    if (pfwTriggerBox) pfwTriggerBox.classList.remove('active');
    if (pfwTriggerArrow) pfwTriggerArrow.innerHTML = '&#9660;';
  }

  if (pfwTriggerBox) {
    pfwTriggerBox.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pfwPanel && pfwPanel.classList.contains('hidden')) {
        openPfwDropdown();
      } else {
        closePfwDropdown();
      }
    });
  }

  if (btnPfwDone) {
    btnPfwDone.addEventListener('click', (e) => {
      e.stopPropagation();
      closePfwDropdown();
    });
  }

  if (btnPfwClearAll) {
    btnPfwClearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!pastFieldWorkContainer) return;
      const cbs = pastFieldWorkContainer.querySelectorAll('input[type="checkbox"]');
      cbs.forEach(cb => cb.checked = false);
      updatePastFieldWorkCount();
    });
  }

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!pfwPanel || pfwPanel.classList.contains('hidden')) return;
    if (!e.target.closest('#pfwDropdownWrapper')) {
      closePfwDropdown();
    }
  });

  // Search filter inside Past Field Work dropdown
  if (pfwSearchInput) {
    pfwSearchInput.addEventListener('input', () => {
      const q = pfwSearchInput.value.trim().toLowerCase();
      if (!pastFieldWorkContainer) return;
      const groups = pastFieldWorkContainer.querySelectorAll('.pfw-dept-group');
      groups.forEach(group => {
        let hasMatch = false;
        const rows = group.querySelectorAll('.pfw-item-row');
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          if (!q || text.includes(q)) {
            row.style.display = 'flex';
            hasMatch = true;
          } else {
            row.style.display = 'none';
          }
        });
        group.style.display = hasMatch ? 'block' : 'none';
      });
    });
  }

  // Dynamic Organization Name based on Affiliation / Category
  function updateAffiliationDynamicFields() {
    if (!categorySelect || !fieldOrgName || !labelOrgName || !organizationNameInput) return;
    const cat = categorySelect.value;
    
    if (!cat || cat === 'Individual' || cat === 'Others (type manually)') {
      fieldOrgName.classList.add('hidden');
      organizationNameInput.required = false;
      organizationNameInput.value = '';
    } else {
      fieldOrgName.classList.remove('hidden');
      organizationNameInput.required = true;
      
      const lower = cat.toLowerCase();
      if (lower === 'ngo') {
        labelOrgName.innerHTML = 'NGO Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of ngo';
      } else if (lower === 'trust') {
        labelOrgName.innerHTML = 'Trust Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of trust';
      } else if (lower === 'club') {
        labelOrgName.innerHTML = 'Club Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of club';
      } else if (lower === 'school') {
        labelOrgName.innerHTML = 'School Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of school';
      } else if (lower === 'college') {
        labelOrgName.innerHTML = 'College Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of college';
      } else if (lower === 'association') {
        labelOrgName.innerHTML = 'Association Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of association';
      } else if (lower === 'company') {
        labelOrgName.innerHTML = 'Company Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of company';
      } else if (lower === 'other') {
        labelOrgName.innerHTML = 'Other Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of other';
      } else {
        labelOrgName.innerHTML = 'Organization Name <span class="req">*</span>';
        organizationNameInput.placeholder = 'Enter name of organization';
      }
    }
  }

  // Dynamic Employer / Institution Name based on Work / Study Status
  function updateWorkStudyDynamicFields() {
    if (!workStudyStatusSelect || !fieldEmployerName || !labelEmployerName || !employerNameInput) return;
    const status = workStudyStatusSelect.value;
    
    if (!status) {
      fieldEmployerName.classList.add('hidden');
      employerNameInput.required = false;
      employerNameInput.value = '';
    } else if (status === 'Working') {
      fieldEmployerName.classList.remove('hidden');
      labelEmployerName.innerHTML = 'Company / Employer Name <span class="req">*</span>';
      employerNameInput.placeholder = 'Enter company / employer name';
      employerNameInput.required = true;
    } else if (status === 'Student') {
      fieldEmployerName.classList.remove('hidden');
      labelEmployerName.innerHTML = 'School / College / Institution Name <span class="req">*</span>';
      employerNameInput.placeholder = 'Enter school / college / institution name';
      employerNameInput.required = true;
    } else {
      fieldEmployerName.classList.remove('hidden');
      labelEmployerName.innerHTML = 'Work / Study Details <span class="req">*</span>';
      employerNameInput.placeholder = 'Enter work or study details';
      employerNameInput.required = true;
    }
  }

  // Affiliation / Category toggle
  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      if (affiliationManual) {
        if (categorySelect.value === 'Others (type manually)') {
          affiliationManual.classList.remove('hidden');
          affiliationManual.focus();
        } else {
          affiliationManual.classList.add('hidden');
          affiliationManual.value = '';
        }
      }
      updateAffiliationDynamicFields();
    });
  }

  // Work / Study Status toggle
  if (workStudyStatusSelect) {
    workStudyStatusSelect.addEventListener('change', () => {
      if (workStudyStatusManual) {
        if (workStudyStatusSelect.value === 'Others (type manually)') {
          workStudyStatusManual.classList.remove('hidden');
          workStudyStatusManual.focus();
        } else {
          workStudyStatusManual.classList.add('hidden');
          workStudyStatusManual.value = '';
        }
      }
      updateWorkStudyDynamicFields();
    });
  }

  // District Selection -> Load Assembly Constituencies (Requirement 4)
  if (districtSelect && assemblyConstituencySelect) {
    districtSelect.addEventListener('change', async () => {
      const districtId = districtSelect.value;
      assemblyConstituencySelect.innerHTML = '<option value="">— Select —</option>';

      if (!districtId) return;

      let list = window.cachedConstituencies[districtId];
      if (!list) {
        try {
          const res = await fetch(`/api/constituencies?district_id=${encodeURIComponent(districtId)}`);
          const data = await res.json();
          list = data.constituencies || [];
          window.cachedConstituencies[districtId] = list;
        } catch (err) {
          console.error('Failed to load constituencies for district', districtId, err);
        }
      }

      if (Array.isArray(list) && list.length > 0) {
        list.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c;
          opt.textContent = c;
          assemblyConstituencySelect.appendChild(opt);
        });
      }
    });
  }

  // Wing Selection -> Load Corresponding Departments & Sub-initiatives (Requirement 6)
  if (wingToJoinSelect && departmentSelect) {
    wingToJoinSelect.addEventListener('change', () => {
      const wing = wingToJoinSelect.value;
      departmentSelect.innerHTML = '<option value="">— Select department —</option>';

      if (!wing) return;

      const list = window.cachedDepartmentsByWing[wing] || [];
      list.forEach(dept => {
        if (typeof dept === 'string') {
          const opt = document.createElement('option');
          opt.value = dept;
          opt.textContent = dept;
          departmentSelect.appendChild(opt);
        } else if (dept && typeof dept === 'object') {
          // Department Header Option (from screenshots, e.g. "1. Administration & Human Resources Department")
          const headerOpt = document.createElement('option');
          headerOpt.value = dept.name;
          headerOpt.textContent = dept.name;
          headerOpt.style.fontWeight = 'bold';
          departmentSelect.appendChild(headerOpt);

          // Sub-initiatives / Sub-teams / Cells with bullet (e.g. "  • Volunteer Recruitment")
          if (Array.isArray(dept.items)) {
            dept.items.forEach(item => {
              const itemOpt = document.createElement('option');
              itemOpt.value = `${dept.name} — ${item}`;
              itemOpt.textContent = `\u00A0\u00A0• ${item}`;
              departmentSelect.appendChild(itemOpt);
            });
          }
        }
      });
    });
  }

  // Previous Works Word Counter
  function updateWordCounter() {
    if (!previousExperienceTextarea || !prevWorkWordCount) return;
    const val = previousExperienceTextarea.value.trim();
    if (!val) {
      prevWorkWordCount.textContent = '0/150 words';
      prevWorkWordCount.className = 'word-counter';
      return;
    }

    const words = val.split(/\s+/).filter(Boolean).length;
    prevWorkWordCount.textContent = `${words}/150 words`;

    if (words <= 150) {
      prevWorkWordCount.className = 'word-counter valid';
    } else {
      prevWorkWordCount.className = 'word-counter invalid';
    }
  }

  if (previousExperienceTextarea) {
    previousExperienceTextarea.addEventListener('input', updateWordCounter);
  }

  // =========================================================================
  // STEP 2: Live Username Check (RPC)
  // =========================================================================
  let usernameAbortController = null;
  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    clearTimeout(usernameDebounceTimer);
    if (usernameAbortController) {
      usernameAbortController.abort();
      usernameAbortController = null;
    }

    if (!val) {
      usernameBadge.className = 'username-badge idle';
      usernameBadge.textContent = 'Enter username';
      return;
    }

    const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;
    if (!USERNAME_REGEX.test(val)) {
      usernameBadge.className = 'username-badge invalid';
      usernameBadge.textContent = '4-20 chars (letters/nums/_)';
      return;
    }

    usernameBadge.className = 'username-badge checking';
    usernameBadge.textContent = 'Checking...';

    usernameDebounceTimer = setTimeout(async () => {
      usernameAbortController = new AbortController();
      const signal = usernameAbortController.signal;
      const timeoutId = setTimeout(() => {
        if (usernameAbortController) usernameAbortController.abort();
      }, 4000);

      try {
        const res = await fetch(`/api/username-available?u=${encodeURIComponent(val)}`, { signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        
        if (data.available === true) {
          usernameBadge.className = 'username-badge available';
          usernameBadge.textContent = '✓ Available';
        } else if (data.available === false) {
          usernameBadge.className = 'username-badge taken';
          usernameBadge.textContent = '✕ Already Taken';
        } else {
          usernameBadge.className = 'username-badge invalid';
          usernameBadge.textContent = data.reason || 'Not available';
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          usernameBadge.className = 'username-badge invalid';
          usernameBadge.textContent = 'Check timed out';
          return;
        }
        usernameBadge.className = 'username-badge invalid';
        usernameBadge.textContent = 'Error checking';
      } finally {
        usernameAbortController = null;
      }
    }, 250);
  });

  // =========================================================================
  // Live Email Uniqueness Check (Only one account per email rule)
  // =========================================================================
  let emailDebounceTimer = null;
  let emailAbortController = null;
  emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim().toLowerCase();
    clearTimeout(emailDebounceTimer);
    if (emailAbortController) {
      emailAbortController.abort();
      emailAbortController = null;
    }

    if (!val) {
      emailBadge.className = 'username-badge idle';
      emailBadge.textContent = '1 account / email';
      return;
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!EMAIL_REGEX.test(val)) {
      emailBadge.className = 'username-badge invalid';
      emailBadge.textContent = 'Invalid format';
      return;
    }

    emailBadge.className = 'username-badge checking';
    emailBadge.textContent = 'Checking...';

    emailDebounceTimer = setTimeout(async () => {
      emailAbortController = new AbortController();
      const signal = emailAbortController.signal;
      const timeoutId = setTimeout(() => {
        if (emailAbortController) emailAbortController.abort();
      }, 4000);

      try {
        const res = await fetch(`/api/email-available?e=${encodeURIComponent(val)}`, { signal });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();

        if (data.available === true) {
          emailBadge.className = 'username-badge available';
          emailBadge.textContent = '✓ Available';
          emailInput.classList.remove('is-invalid');
          emailInput.classList.add('is-valid');
        } else if (data.available === false) {
          emailBadge.className = 'username-badge taken';
          emailBadge.textContent = '✕ Already Taken (1 Account/Email)';
          emailInput.classList.add('is-invalid');
          emailInput.classList.remove('is-valid');
        } else {
          emailBadge.className = 'username-badge invalid';
          emailBadge.textContent = data.reason || 'Not available';
          emailInput.classList.add('is-invalid');
          emailInput.classList.remove('is-valid');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          emailBadge.className = 'username-badge invalid';
          emailBadge.textContent = 'Check timed out';
          return;
        }
        emailBadge.className = 'username-badge invalid';
        emailBadge.textContent = 'Error checking';
      } finally {
        emailAbortController = null;
      }
    }, 200);
  });

  // =========================================================================
  // PROFILE PHOTO UPLOADER (Drag-Drop, Paste, Webcam, Demo & Compression)
  // =========================================================================
  function getSampleVolunteerPhotoJpeg() {
    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const bgGrad = ctx.createLinearGradient(0, 0, 0, 300);
    bgGrad.addColorStop(0, '#0284c7');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 250, 300);

    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(125, 115, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(125, 105, 50, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.ellipse(125, 260, 90, 75, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(45, 255, 160, 30);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TNV VOLUNTEER', 125, 275);

    return canvas.toDataURL('image/jpeg', 0.9);
  }

  const SAMPLE_VOLUNTEER_PHOTO = getSampleVolunteerPhotoJpeg();

  function setVolunteerPhoto(dataUrl, label = 'Photo') {
    photoPath.value = dataUrl;
    photoPreviewImg.src = dataUrl;
    photoPreviewImg.classList.remove('hidden');
    photoPlaceholder.classList.add('hidden');
    btnRemovePhoto.classList.remove('hidden');
    photoStatusBadge.className = 'photo-status-badge has-photo';
    photoStatusBadge.textContent = '✓ ' + label + ' attached (embedded into ID Card)';
  }

  function clearVolunteerPhoto() {
    photoFileInput.value = '';
    photoPath.value = '';
    photoPreviewImg.src = '';
    photoPreviewImg.classList.add('hidden');
    photoPlaceholder.classList.remove('hidden');
    btnRemovePhoto.classList.add('hidden');
    photoStatusBadge.className = 'photo-status-badge';
    photoStatusBadge.textContent = 'Drag & drop photo here or click to browse';
  }

  function processImageFile(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 250;
        const maxH = 300;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setVolunteerPhoto(compressedDataUrl, file.name || 'Photo');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Trigger file selection
  btnSelectPhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    photoFileInput.click();
  });

  photoUploaderBox.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    photoFileInput.click();
  });

  photoFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) {
      processImageFile(file);
    }
  });

  // Drag and Drop
  photoUploaderBox.addEventListener('dragover', (e) => {
    e.preventDefault();
    photoUploaderBox.classList.add('dragover');
  });

  photoUploaderBox.addEventListener('dragleave', () => {
    photoUploaderBox.classList.remove('dragover');
  });

  photoUploaderBox.addEventListener('drop', (e) => {
    e.preventDefault();
    photoUploaderBox.classList.remove('dragover');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      processImageFile(file);
    }
  });

  // Global Clipboard Paste Support
  window.addEventListener('paste', (e) => {
    if (registrationView.classList.contains('hidden')) return;
    const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
    if (!items) return;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  });

  // Demo Sample Photo Button
  btnSamplePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    setVolunteerPhoto(SAMPLE_VOLUNTEER_PHOTO, 'Demo Volunteer Portrait');
  });

  // Remove Photo Button
  btnRemovePhoto.addEventListener('click', (e) => {
    e.stopPropagation();
    clearVolunteerPhoto();
  });

  // Webcam Capture Handlers
  let activeWebcamStream = null;

  btnWebcamSnap.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      webcamModal.classList.remove('hidden');
      activeWebcamStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      webcamVideo.srcObject = activeWebcamStream;
    } catch (err) {
      console.warn('Webcam access error:', err);
      alert('Camera access denied or unavailable: ' + err.message + '\nYou can choose a file from your device or click "Use Sample Photo".');
      webcamModal.classList.add('hidden');
    }
  });

  function stopWebcam() {
    if (activeWebcamStream) {
      activeWebcamStream.getTracks().forEach(track => track.stop());
      activeWebcamStream = null;
    }
    webcamModal.classList.add('hidden');
  }

  btnCloseWebcamModal.addEventListener('click', stopWebcam);
  btnCancelWebcam.addEventListener('click', stopWebcam);

  btnCapturePhoto.addEventListener('click', () => {
    if (!webcamVideo.videoWidth) {
      stopWebcam();
      return;
    }
    webcamCanvas.width = 250;
    webcamCanvas.height = 300;
    const ctx = webcamCanvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, 250, 300);
    const snapDataUrl = webcamCanvas.toDataURL('image/jpeg', 0.88);
    setVolunteerPhoto(snapDataUrl, 'Camera Selfie');
    stopWebcam();
  });

  // =========================================================================
  // DASHBOARD PROFILE PHOTO UPDATE HANDLER (Step 13 Integration)
  // =========================================================================
  btnUpdateDashPhoto.addEventListener('click', () => {
    dashPhotoFileInput.click();
  });

  dashPhotoFileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxW = 250;
        const maxH = 300;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

        if (!window.currentSessionToken) {
          alert('Please sign in to update your photo.');
          return;
        }

        try {
          const res = await fetch('/api/update-photo', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${window.currentSessionToken}`
            },
            body: JSON.stringify({ photo_path: compressedDataUrl })
          });
          const data = await res.json();
          if (data.success) {
            window.currentRegisteredProfile = data.profile;
            populateDashboard(data.profile);
            alert('Profile photo and Member ID Card updated successfully!');
          } else {
            alert('Failed to update photo: ' + (data.error || 'Server error'));
          }
        } catch (err) {
          alert('Network error updating photo: ' + err.message);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  // =========================================================================
  // Live Admin Queue Viewer
  // =========================================================================
  async function loadAdminQueue() {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      
      landingQueueList.innerHTML = '';
      if (!data.profiles || data.profiles.length === 0) {
        landingQueueList.innerHTML = '<div class="queue-item placeholder">No registered applicants yet</div>';
        return;
      }

      data.profiles.forEach(p => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
          <div>
            <div class="queue-item-name">${escapeHtml(p.full_name)} <span class="mono">(@${escapeHtml(p.username)})</span></div>
            <div class="queue-item-meta">${escapeHtml(p.district_name || 'District ID ' + p.district_id)} • Last4: ${escapeHtml(p.aadhaar_last4 || '----')}</div>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span class="badge ${p.status === 'approved' ? 'badge-success' : 'badge-warning'}">${p.status}</span>
            <span class="badge ${p.membership_paid ? 'badge-success' : 'badge-neutral'}">${p.membership_paid ? 'paid' : 'unpaid'}</span>
          </div>
        `;
        landingQueueList.appendChild(item);
      });
    } catch (err) {
      console.error('Failed to load queue:', err);
    }
  }

  btnRefreshLandingQueue.addEventListener('click', loadAdminQueue);

  // =========================================================================
  // FORM SUBMISSION (Steps 3 & 4)
  // =========================================================================
  registrationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    clearInvalidMarks();

    const formData = new FormData(registrationForm);
    const isPaymentChosen = radioPayNow.checked;
    const gatewayRef = qrUtrInput.value.trim();

    if (isPaymentChosen && !gatewayRef) {
      showAlert('Please enter your 12-digit UPI UTR / Transaction Reference number after completing the payment.', 'danger');
      qrUtrInput.focus();
      return;
    }

    // 1. Affiliation / Category (Requirement 1)
    let chosenAffiliation = categorySelect ? categorySelect.value : (formData.get('category')?.toString() || '');
    if (chosenAffiliation === 'Others (type manually)') {
      chosenAffiliation = affiliationManual ? affiliationManual.value.trim() : '';
      if (!chosenAffiliation) {
        showAlert('Please enter your specific affiliation / organization name.', 'danger');
        if (affiliationManual) affiliationManual.focus();
        return;
      }
    }
    if (!chosenAffiliation) {
      showAlert('Please select your Affiliation / Category.', 'danger');
      if (categorySelect) categorySelect.focus();
      return;
    }

    // Dynamic Organization Name (Required when Affiliation != Individual and != Others (type manually))
    let orgNameValue = '';
    if (chosenAffiliation !== 'Individual' && categorySelect?.value !== 'Others (type manually)') {
      orgNameValue = organizationNameInput ? organizationNameInput.value.trim() : (formData.get('organization_name')?.toString().trim() || '');
      if (!orgNameValue) {
        const orgLabel = labelOrgName ? labelOrgName.textContent.replace('*', '').trim() : 'Organization Name';
        showAlert(`Please enter your ${orgLabel}.`, 'danger');
        if (organizationNameInput) organizationNameInput.focus();
        return;
      }
    }

    // Work / Study Status
    let chosenWorkStatus = workStudyStatusSelect ? workStudyStatusSelect.value : (formData.get('work_study_status')?.toString() || '');
    if (chosenWorkStatus === 'Others (type manually)') {
      chosenWorkStatus = workStudyStatusManual ? workStudyStatusManual.value.trim() : '';
      if (!chosenWorkStatus) {
        showAlert('Please enter your specific Work / Study Status.', 'danger');
        if (workStudyStatusManual) workStudyStatusManual.focus();
        return;
      }
    }
    if (!chosenWorkStatus) {
      showAlert('Please select your Work / Study Status.', 'danger');
      if (workStudyStatusSelect) workStudyStatusSelect.focus();
      return;
    }

    // Dynamic Employer / Institution Name
    let employerNameValue = '';
    if (chosenWorkStatus) {
      employerNameValue = employerNameInput ? employerNameInput.value.trim() : (formData.get('employer_name')?.toString().trim() || '');
      if (!employerNameValue) {
        const empLabel = labelEmployerName ? labelEmployerName.textContent.replace('*', '').trim() : 'Company / Employer Name';
        showAlert(`Please enter your ${empLabel}.`, 'danger');
        if (employerNameInput) employerNameInput.focus();
        return;
      }
    }

    // 2. Profession / Designation (Requirement 2)
    const occupation = occupationInput ? occupationInput.value.trim() : (formData.get('occupation')?.toString().trim() || '');
    if (!occupation) {
      showAlert('Please enter your Profession / Designation.', 'danger');
      if (occupationInput) occupationInput.focus();
      return;
    }

    // 4. District & Assembly Constituency (Requirement 4)
    const districtId = parseInt(districtSelect ? districtSelect.value : (formData.get('district_id')?.toString() || '0'), 10);
    if (!districtId) {
      showAlert('Please select your District.', 'danger');
      if (districtSelect) districtSelect.focus();
      return;
    }

    const assemblyConstituency = assemblyConstituencySelect ? assemblyConstituencySelect.value : (formData.get('assembly_constituency')?.toString() || '');
    if (!assemblyConstituency) {
      showAlert('Please select your Assembly Constituency.', 'danger');
      if (assemblyConstituencySelect) assemblyConstituencySelect.focus();
      return;
    }
    const panchayat = panchayatInput ? panchayatInput.value.trim() : (formData.get('panchayat')?.toString().trim() || '');
    if (!panchayat) {
      showAlert('Please enter your Panchayat / Area.', 'danger');
      if (panchayatInput) panchayatInput.focus();
      return;
    }

    // 6. Wing to Join & Department (Requirement 6)
    const wingToJoin = wingToJoinSelect ? wingToJoinSelect.value : (formData.get('wing_to_join')?.toString() || '');
    if (!wingToJoin) {
      showAlert('Please select a Wing to Join.', 'danger');
      if (wingToJoinSelect) wingToJoinSelect.focus();
      return;
    }

    const department = departmentSelect ? departmentSelect.value : (formData.get('department')?.toString() || '');
    if (!department) {
      showAlert('Please select a Department.', 'danger');
      if (departmentSelect) departmentSelect.focus();
      return;
    }

    // 7. Mode of Work (Requirement 7)
    const modeOfWork = modeOfWorkSelect ? modeOfWorkSelect.value : (formData.get('mode_of_work')?.toString() || '');
    if (!modeOfWork) {
      showAlert('Please select which mode of work you prefer.', 'danger');
      if (modeOfWorkSelect) modeOfWorkSelect.focus();
      return;
    }

    // 3. Previous Experience
    const prevExp = previousExperienceTextarea ? previousExperienceTextarea.value.trim() : (formData.get('previous_experience')?.toString().trim() || '');
    if (!prevExp) {
      showAlert('Please enter your Previous Works / Experience (or mention "Nil").', 'danger');
      if (previousExperienceTextarea) previousExperienceTextarea.focus();
      return;
    }
    const words = prevExp.split(/\s+/).filter(Boolean).length;
    if (words > 150) {
      showAlert(`Previous experience should not exceed 150 words (currently ${words} words).`, 'danger');
      if (previousExperienceTextarea) previousExperienceTextarea.focus();
      return;
    }

    // 5. Past Field Work (Requirement 5 - select all that apply)
    const checkedFieldWorks = pastFieldWorkContainer
      ? Array.from(pastFieldWorkContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value)
      : [];

    const payload = {
      full_name: formData.get('full_name')?.toString().trim(),
      phone: formData.get('phone')?.toString().trim(),
      email: formData.get('email')?.toString().trim(),
      username: formData.get('username')?.toString().trim(),
      password: formData.get('password')?.toString(),
      confirm_password: formData.get('confirm_password')?.toString(),
      dob: formData.get('dob')?.toString(),
      gender: formData.get('gender')?.toString(),
      marital_status: formData.get('marital_status')?.toString(),
      father_or_husband_name: formData.get('father_or_husband_name')?.toString().trim(),
      aadhaar: formData.get('aadhaar')?.toString().trim(),
      category: chosenAffiliation,
      affiliation: chosenAffiliation,
      organization_name: orgNameValue || undefined,
      work_study_status: chosenWorkStatus,
      employer_name: employerNameValue || undefined,
      blood_group: formData.get('blood_group')?.toString() || undefined,
      occupation: occupation,
      address: formData.get('address')?.toString().trim(),
      pincode: formData.get('pincode')?.toString().trim() || undefined,
      district_id: districtId,
      assembly_constituency: assemblyConstituency,
      panchayat: panchayat,
      wing_to_join: wingToJoin,
      department: department,
      mode_of_work: modeOfWork,
      previous_experience: prevExp,
      past_field_work: checkedFieldWorks,
      photo_path: formData.get('photo_path')?.toString().trim() || undefined,
      agree_terms: formData.get('agree_terms') === 'on'
    };

    if (!payload.agree_terms) {
      showAlert('You must agree to the Terms and Conditions to proceed.', 'danger');
      return;
    }

    if (emailInput.classList.contains('is-invalid')) {
      showAlert('Validation Error: This email address is already registered. Only one account can be created per email address.', 'danger');
      emailInput.focus();
      return;
    }

    setSubmitting(true);

    try {
      // Step 3: Register applicant
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          const fieldEl = document.querySelector(`[name="${data.field}"]`);
          if (fieldEl) {
            fieldEl.classList.add('is-invalid');
            fieldEl.focus();
          }
        }
        showAlert(`Registration Error: ${data.error}`, 'danger');
        return;
      }

      // Step 4: If user opted for UPI QR payment, record the payment now
      let paymentRecord = null;
      if (isPaymentChosen && data.session?.access_token) {
        try {
          const payRes = await fetch('/api/record-payment', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.session.access_token}`
            },
            body: JSON.stringify({
              profile_id: data.user.id,
              gateway_ref: gatewayRef
            })
          });

          if (payRes.ok) {
            paymentRecord = await payRes.json();
          } else {
            console.warn('Payment failed to record, registration remains valid as unpaid.');
          }
        } catch (payErr) {
          console.warn('Payment recording error:', payErr);
        }
      }

      // Populate Success Modal
      resUserId.textContent = data.user.id;
      resUsername.textContent = '@' + data.user.username;
      resStatus.textContent = data.profile.status;
      resAadhaar.textContent = 'XXXX XXXX ' + data.profile.aadhaar_last4;
      resDistrict.textContent = data.profile.district_name || data.profile.district_id;

      if (paymentRecord && paymentRecord.success) {
        resMembership.textContent = 'PAID (₹365)';
        resMembership.className = 'info-value badge badge-success';
        modalReceiptArea.classList.remove('hidden');
        resReceiptNoText.textContent = paymentRecord.receipt_no;
        modalDownloadReceiptBtn.href = paymentRecord.signed_url;
      } else {
        resMembership.textContent = 'UNPAID (Skipped)';
        resMembership.className = 'info-value badge badge-neutral';
        modalReceiptArea.classList.add('hidden');
      }

      if (data.notification) {
        resNotifMsg.textContent = data.notification.message;
      }

      // Store authenticated session & registered profile for direct dashboard transition
      window.currentSessionToken = data.session.access_token;
      window.currentRegisteredProfile = data.profile;
      window.lastRegisteredUsername = data.user.username;
      window.lastRegisteredEmail = data.user.email;
      localStorage.setItem('tnv_token', data.session.access_token);

      // Show Success Modal
      successModal.classList.remove('hidden');
      registrationForm.reset();
      updateAffiliationDynamicFields();
      updateWorkStudyDynamicFields();
      clearVolunteerPhoto();
      usernameBadge.className = 'username-badge idle';
      usernameBadge.textContent = 'Enter username';
      emailBadge.className = 'username-badge idle';
      emailBadge.textContent = '1 account / email';

    } catch (err) {
      console.error('Submit error:', err);
      showAlert(`Network error: ${err.message}`, 'danger');
    } finally {
      setSubmitting(false);
    }
  });

  // =========================================================================
  // Quick Testing Buttons
  // =========================================================================
  btnFillValid.addEventListener('click', () => {
    clearAlert();
    clearInvalidMarks();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    document.getElementById('fullName').value = 'Ramesh Kumar';
    document.getElementById('phone').value = '98401' + randomNum;
    document.getElementById('email').value = `ramesh.tnv${randomNum}@example.com`;
    document.getElementById('username').value = `ramesh_${randomNum}`;
    document.getElementById('password').value = 'tnvPassword2026';
    document.getElementById('confirmPassword').value = 'tnvPassword2026';
    document.getElementById('dob').value = '1996-08-15';
    document.getElementById('gender').value = 'Male';
    document.getElementById('maritalStatus').value = 'Single';
    document.getElementById('fatherOrHusbandName').value = 'K. Kumar';
    document.getElementById('aadhaar').value = '98765432' + randomNum;
    
    // Affiliation / Category & Profession
    if (categorySelect) categorySelect.value = 'Individual';
    if (affiliationManual) {
      affiliationManual.classList.add('hidden');
      affiliationManual.value = '';
    }
    updateAffiliationDynamicFields();

    if (workStudyStatusSelect) workStudyStatusSelect.value = 'Working';
    if (workStudyStatusManual) {
      workStudyStatusManual.classList.add('hidden');
      workStudyStatusManual.value = '';
    }
    updateWorkStudyDynamicFields();
    if (employerNameInput) employerNameInput.value = 'Tata Consultancy Services';

    if (occupationInput) occupationInput.value = 'Software Engineer & Community Volunteer';
    if (bloodGroupSelect) bloodGroupSelect.value = 'O+';
    document.getElementById('address').value = '45 Mount Road, Guindy';
    document.getElementById('pincode').value = '600032';
    
    // District & Assembly Constituency
    if (districtSelect) {
      districtSelect.value = '3'; // Chennai
      districtSelect.dispatchEvent(new Event('change'));
      setTimeout(() => {
        if (assemblyConstituencySelect) {
          assemblyConstituencySelect.value = 'Mylapore';
          if (!assemblyConstituencySelect.value && assemblyConstituencySelect.options.length > 1) {
            assemblyConstituencySelect.selectedIndex = 1;
          }
        }
      }, 60);
    }
    if (panchayatInput) panchayatInput.value = 'Mylapore Ward 120, Alwarpet';

    // Wing to Join & Department
    if (wingToJoinSelect) {
      wingToJoinSelect.value = 'Operations Wing — Programs, Public Service & Social Impact';
      wingToJoinSelect.dispatchEvent(new Event('change'));
      setTimeout(() => {
        if (departmentSelect) {
          departmentSelect.value = '1. Social Responsibility, Awareness & Advocacy Department';
          if (!departmentSelect.value && departmentSelect.options.length > 1) {
            departmentSelect.selectedIndex = 1;
          }
        }
      }, 60);
    }

    // Mode of Work
    if (modeOfWorkSelect) {
      modeOfWorkSelect.value = 'Field Volunteering';
    }

    // Previous Works (5 to 150 words)
    if (previousExperienceTextarea) {
      previousExperienceTextarea.value = 'Active volunteer for 3 years participating in environmental cleanup drives, disaster relief supply distribution, and community health awareness programs across Chennai.';
      updateWordCounter();
    }

    // Past Field Work (Select some initiatives)
    if (pastFieldWorkContainer) {
      const cbs = pastFieldWorkContainer.querySelectorAll('input[type="checkbox"]');
      cbs.forEach((cb, idx) => {
        cb.checked = (idx === 0 || idx === 1 || idx === 6);
      });
      updatePastFieldWorkCount();
    }
    
    // Sample avatar SVG Data URL for instant test preview
    setVolunteerPhoto(SAMPLE_VOLUNTEER_PHOTO, 'Demo Volunteer Portrait');

    document.getElementById('agreeTerms').checked = true;

    qrUtrInput.value = `UPI-UTR-${randomNum}-2026`;
    usernameInput.dispatchEvent(new Event('input'));
    emailInput.dispatchEvent(new Event('input'));
  });

  btnFillBadAadhaar.addEventListener('click', () => {
    btnFillValid.click();
    document.getElementById('aadhaar').value = '12345678901'; // 11 digits
    showAlert('Set Aadhaar to 11 digits (Spec Section 15 Action 1 Test). Click Submit to verify rejection.', 'danger');
  });

  btnFillDuplicateUser.addEventListener('click', () => {
    btnFillValid.click();
    const existingUsername = window.lastRegisteredUsername || (landingQueueList.querySelector('.mono')?.textContent.replace(/[@()]/g, '').trim()) || 'volunteer_01';
    document.getElementById('username').value = existingUsername;
    usernameInput.dispatchEvent(new Event('input'));
    showAlert(`Set Username to "${existingUsername}" to test duplicate detection.`, 'danger');
  });

  btnFillDuplicateEmail.addEventListener('click', () => {
    btnFillValid.click();
    const existingEmail = window.lastRegisteredEmail || 'registered_volunteer@tnv.org';
    document.getElementById('email').value = existingEmail;
    emailInput.dispatchEvent(new Event('input'));
    showAlert(`Set Email to "${existingEmail}" to test single account per email ID validation.`, 'danger');
  });

  // Utilities
  function showAlert(message, type) {
    formAlert.className = `alert alert-${type}`;
    formAlert.textContent = message;
    formAlert.classList.remove('hidden');
  }

  function clearAlert() {
    formAlert.className = 'alert hidden';
    formAlert.textContent = '';
  }

  function clearInvalidMarks() {
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }

  function setSubmitting(isSubmitting) {
    btnSubmit.disabled = isSubmitting;
    if (isSubmitting) {
      submitSpinner?.classList.remove('hidden');
      submitText.textContent = 'Processing Application...';
    } else {
      updatePaymentUi();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[m]);
  }

  // Initialize
  loadDistricts();
  loadDropdownOptions();
  // =========================================================================
  // PART B: MASTER ADMIN VERIFICATION CONTROLLER (Tasks T5 - T8)
  // =========================================================================

  // Navigation & View Elements
  const adminView = document.getElementById('adminView');
  const btnNavAdmin = document.getElementById('btnNavAdmin');
  const btnRefreshAdminQueue = document.getElementById('btnRefreshAdminQueue');
  const btnAdminHome = document.getElementById('btnAdminHome');
  const btnAdminLogout = document.getElementById('btnAdminLogout');
  const btnFillDemoAdmin = document.getElementById('btnFillDemoAdmin');

  // Stats Counters
  const statAdminTotal = document.getElementById('statAdminTotal');
  const statAdminPending = document.getElementById('statAdminPending');
  const statAdminAttended = document.getElementById('statAdminAttended');
  const statAdminScheduled = document.getElementById('statAdminScheduled');
  const statAdminApproved = document.getElementById('statAdminApproved');

  // Follow-up Alert Banner
  const adminFollowupNotice = document.getElementById('adminFollowupNotice');
  const adminFollowupCount = document.getElementById('adminFollowupCount');
  const btnViewFollowups = document.getElementById('btnViewFollowups');

  // Queue Table & Filter Elements
  const adminSearchInput = document.getElementById('adminSearchInput');
  const adminFilterStatus = document.getElementById('adminFilterStatus');
  const adminFilterCall = document.getElementById('adminFilterCall');
  const adminFilterPayment = document.getElementById('adminFilterPayment');
  const adminFilterDistrict = document.getElementById('adminFilterDistrict');
  const btnResetAdminFilters = document.getElementById('btnResetAdminFilters');
  const adminQueueCountBadge = document.getElementById('adminQueueCountBadge');
  const adminQueueTable = document.getElementById('adminQueueTable');
  const adminQueueTableBody = document.getElementById('adminQueueTableBody');
  const adminQueueEmpty = document.getElementById('adminQueueEmpty');
  const adminQueueLoading = document.getElementById('adminQueueLoading');

  // Applicant Review Modal Elements
  const adminReviewModal = document.getElementById('adminReviewModal');
  const btnCloseAdminReviewModal = document.getElementById('btnCloseAdminReviewModal');
  const revApplicantName = document.getElementById('revApplicantName');
  const revApplicantUsername = document.getElementById('revApplicantUsername');
  const revStatusBadge = document.getElementById('revStatusBadge');
  const revPaymentBadge = document.getElementById('revPaymentBadge');

  // Profile Details in Review Modal
  const revFullName = document.getElementById('revFullName');
  const revPhone = document.getElementById('revPhone');
  const revEmail = document.getElementById('revEmail');
  const revDistrict = document.getElementById('revDistrict');
  const revConstituency = document.getElementById('revConstituency');
  const revPanchayat = document.getElementById('revPanchayat');
  const revAddress = document.getElementById('revAddress');
  const revPincode = document.getElementById('revPincode');
  const revAffiliation = document.getElementById('revAffiliation');
  const revOrgName = document.getElementById('revOrgName');
  const revWorkStudy = document.getElementById('revWorkStudy');
  const revEmployer = document.getElementById('revEmployer');
  const revWing = document.getElementById('revWing');
  const revDept = document.getElementById('revDept');
  const revMode = document.getElementById('revMode');
  const revBloodGroup = document.getElementById('revBloodGroup');
  const revDob = document.getElementById('revDob');
  const revGender = document.getElementById('revGender');
  const revMaritalStatus = document.getElementById('revMaritalStatus');
  const revFatherHusband = document.getElementById('revFatherHusband');

  // Aadhaar Reveal Elements
  const revAadhaarDisplay = document.getElementById('revAadhaarDisplay');
  const btnRevealAadhaar = document.getElementById('btnRevealAadhaar');
  const revAadhaarAuditNotice = document.getElementById('revAadhaarAuditNotice');

  // Telephone Verification Elements
  const revCurrentCallStatusBadge = document.getElementById('revCurrentCallStatusBadge');
  const btnCallNoAnswer = document.getElementById('btnCallNoAnswer');
  const btnCallScheduled = document.getElementById('btnCallScheduled');
  const btnCallAttended = document.getElementById('btnCallAttended');
  const revScheduledBox = document.getElementById('revScheduledBox');
  const revCallbackTime = document.getElementById('revCallbackTime');
  const revCallbackNote = document.getElementById('revCallbackNote');
  const btnSaveScheduledCall = document.getElementById('btnSaveScheduledCall');
  const btnCancelScheduledCall = document.getElementById('btnCancelScheduledCall');
  const revAttendedBox = document.getElementById('revAttendedBox');
  const revAttendedNote = document.getElementById('revAttendedNote');
  const btnSaveAttendedCall = document.getElementById('btnSaveAttendedCall');
  const btnCancelAttendedCall = document.getElementById('btnCancelAttendedCall');
  const revCallHistoryList = document.getElementById('revCallHistoryList');

  // Leadership Scoring Elements
  const revRunningScore = document.getElementById('revRunningScore');
  const revScoreProgressBar = document.getElementById('revScoreProgressBar');
  const revScoredCount = document.getElementById('revScoredCount');
  const revQuestionsList = document.getElementById('revQuestionsList');
  const btnSaveScoresDraft = document.getElementById('btnSaveScoresDraft');

  // Approval Decision Elements
  const revRoleSelect = document.getElementById('revRoleSelect');
  const revRoleHint = document.getElementById('revRoleHint');
  const revScoringCompleteCheck = document.getElementById('revScoringCompleteCheck');
  const btnApproveApplicant = document.getElementById('btnApproveApplicant');
  const revApprovalAlert = document.getElementById('revApprovalAlert');

  // Part B State Variables
  let fullAdminQueue = [];
  let currentReviewingApplicant = null;
  let interviewQuestionsCache = [];
  let applicantScoresMap = {};

  // View Navigation
  function showAdminView() {
    landingPageView.classList.add('hidden');
    registrationView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    adminView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Populate District Filter if empty
    if (adminFilterDistrict.children.length <= 1 && window.currentDistrictsList) {
      window.currentDistrictsList.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = d.name;
        adminFilterDistrict.appendChild(opt);
      });
    }

    loadFullAdminQueue();
    loadAdminFollowups();
  }

  if (btnNavAdmin) {
    btnNavAdmin.addEventListener('click', showAdminView);
  }

  if (btnAdminHome) {
    btnAdminHome.addEventListener('click', showLandingPage);
  }

  if (btnAdminLogout) {
    btnAdminLogout.addEventListener('click', () => {
      window.currentSessionToken = null;
      window.currentRegisteredProfile = null;
      localStorage.removeItem('tnv_token');
      showLandingPage();
    });
  }

  // Demo Admin Auto-Fill
  if (btnFillDemoAdmin) {
    btnFillDemoAdmin.addEventListener('click', async () => {
      try {
        await fetch('/api/admin/ensure-demo-admin', { method: 'POST' });
      } catch (_e) {}
      loginUsername.value = 'masteradmin';
      loginPassword.value = 'AdminPassword2026!';
      loginUsername.style.borderColor = '#38bdf8';
      loginPassword.style.borderColor = '#38bdf8';
      setTimeout(() => {
        loginUsername.style.borderColor = '';
        loginPassword.style.borderColor = '';
      }, 1500);
      btnLoginSubmit.focus();
    });
  }

  // Load Full Admin Queue (Task T5 / Step 7)
  async function loadFullAdminQueue() {
    if (adminQueueLoading) adminQueueLoading.classList.remove('hidden');
    if (adminQueueEmpty) adminQueueEmpty.classList.add('hidden');

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.currentSessionToken) {
        headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
      }

      const res = await fetch('/api/admin/queue', { headers });
      const data = await res.json();

      if (!res.ok) {
        // If not logged in as admin yet, prompt or load fallback
        console.warn('Queue response not ok:', data.error);
        if (adminQueueTableBody) {
          adminQueueTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Please sign in with Master Admin credentials to view applicant queue.</td></tr>`;
        }
        return;
      }

      fullAdminQueue = data.queue || [];
      updateAdminQueueStats(fullAdminQueue);
      renderFilteredAdminQueue();

    } catch (err) {
      console.error('Failed to load admin queue:', err);
    } finally {
      if (adminQueueLoading) adminQueueLoading.classList.add('hidden');
    }
  }

  if (btnRefreshAdminQueue) {
    btnRefreshAdminQueue.addEventListener('click', loadFullAdminQueue);
  }

  // Load Admin Follow-ups
  async function loadAdminFollowups() {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.currentSessionToken) {
        headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
      }
      const res = await fetch('/api/admin/followups', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const followups = data.followups || [];

      if (followups.length > 0) {
        adminFollowupNotice.classList.remove('hidden');
        adminFollowupCount.textContent = followups.length === 1 ? '1 applicant' : `${followups.length} applicants`;
      } else {
        adminFollowupNotice.classList.add('hidden');
      }
    } catch (_e) {}
  }

  if (btnViewFollowups) {
    btnViewFollowups.addEventListener('click', () => {
      adminFilterStatus.value = 'pending';
      adminFilterCall.value = 'scheduled';
      renderFilteredAdminQueue();
    });
  }

  // Update Admin Stats Counters
  function updateAdminQueueStats(queue) {
    const total = queue.length;
    const pending = queue.filter(p => p.status === 'pending').length;
    const attended = queue.filter(p => p.call_status === 'attended').length;
    const scheduled = queue.filter(p => p.call_status === 'scheduled').length;
    const approved = queue.filter(p => p.status === 'approved').length;

    statAdminTotal.textContent = total;
    statAdminPending.textContent = pending;
    statAdminAttended.textContent = attended;
    statAdminScheduled.textContent = scheduled;
    statAdminApproved.textContent = approved;
  }

  // Filter & Search Queue
  function renderFilteredAdminQueue() {
    const qStatus = adminFilterStatus.value;
    const qCall = adminFilterCall.value;
    const qPayment = adminFilterPayment.value;
    const qDistrict = adminFilterDistrict.value;
    const query = adminSearchInput.value.trim().toLowerCase();

    const filtered = fullAdminQueue.filter(p => {
      // 1. App status filter
      if (qStatus !== 'all' && (p.status || 'pending') !== qStatus) return false;

      // 2. Call status filter
      if (qCall !== 'all' && (p.call_status || 'not_called') !== qCall) return false;

      // 3. Payment filter
      if (qPayment === 'paid' && !p.membership_paid) return false;
      if (qPayment === 'unpaid' && p.membership_paid) return false;

      // 4. District filter
      if (qDistrict !== 'all' && String(p.district_id) !== String(qDistrict)) return false;

      // 5. Search text query
      if (query) {
        const nameMatch = (p.full_name || '').toLowerCase().includes(query);
        const userMatch = (p.username || '').toLowerCase().includes(query);
        const phoneMatch = (p.phone || '').includes(query);
        if (!nameMatch && !userMatch && !phoneMatch) return false;
      }

      return true;
    });

    adminQueueCountBadge.textContent = `Showing ${filtered.length} of ${fullAdminQueue.length} applicants`;
    adminQueueTableBody.innerHTML = '';

    if (filtered.length === 0) {
      adminQueueEmpty.classList.remove('hidden');
      return;
    }

    adminQueueEmpty.classList.add('hidden');

    filtered.forEach(p => {
      const tr = document.createElement('tr');

      const isApproved = p.status === 'approved';
      const isPaid = Boolean(p.membership_paid);
      const callStatus = p.call_status || 'not_called';

      let callBadgeClass = 'badge-call-not_called';
      let callLabel = 'Not Called';
      if (callStatus === 'no_answer') {
        callBadgeClass = 'badge-call-no_answer';
        callLabel = 'No Answer';
      } else if (callStatus === 'scheduled') {
        callBadgeClass = 'badge-call-scheduled';
        callLabel = 'Scheduled';
      } else if (callStatus === 'attended') {
        callBadgeClass = 'badge-call-attended';
        callLabel = 'Attended';
      }

      const regDate = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

      tr.innerHTML = `
        <td>
          <div class="applicant-cell-name">${escapeHtml(p.full_name)}</div>
          <div class="applicant-cell-handle mono">@${escapeHtml(p.username)}</div>
        </td>
        <td>
          <div style="font-weight: 500;">${escapeHtml(p.district_name || 'District ID ' + p.district_id)}</div>
          <div style="font-size: 11px; color: var(--text-dim);">${escapeHtml(p.wing_name || p.wing_to_join || 'General')}</div>
        </td>
        <td class="mono">${escapeHtml(p.phone || '-')}</td>
        <td>
          <span class="badge ${isPaid ? 'badge-success' : 'badge-neutral'}">
            ${isPaid ? '₹365 Paid' : 'Unpaid'}
          </span>
        </td>
        <td style="color: var(--text-dim); font-size: 12px;">${regDate}</td>
        <td>
          <span class="badge ${callBadgeClass}">${callLabel}</span>
        </td>
        <td>
          <span class="badge ${isApproved ? 'badge-success' : 'badge-warning'}">
            ${isApproved ? 'approved' : 'pending'}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="btn-review-applicant" data-id="${p.id}">
            ${isApproved ? 'View Details' : 'Review & Verify'} &rarr;
          </button>
        </td>
      `;

      const btnReview = tr.querySelector('.btn-review-applicant');
      btnReview.addEventListener('click', () => {
        openApplicantReviewModal(p);
      });

      adminQueueTableBody.appendChild(tr);
    });
  }

  // Filter Listeners
  if (adminFilterStatus) adminFilterStatus.addEventListener('change', renderFilteredAdminQueue);
  if (adminFilterCall) adminFilterCall.addEventListener('change', renderFilteredAdminQueue);
  if (adminFilterPayment) adminFilterPayment.addEventListener('change', renderFilteredAdminQueue);
  if (adminFilterDistrict) adminFilterDistrict.addEventListener('change', renderFilteredAdminQueue);
  if (adminSearchInput) adminSearchInput.addEventListener('input', renderFilteredAdminQueue);

  if (btnResetAdminFilters) {
    btnResetAdminFilters.addEventListener('click', () => {
      adminFilterStatus.value = 'all';
      adminFilterCall.value = 'all';
      adminFilterPayment.value = 'all';
      adminFilterDistrict.value = 'all';
      adminSearchInput.value = '';
      renderFilteredAdminQueue();
    });
  }

  // Open Applicant Review Modal (Tasks T5, T6, T7, T8)
  async function openApplicantReviewModal(applicant) {
    currentReviewingApplicant = applicant;
    applicantScoresMap = {};

    // Header Info
    revApplicantName.textContent = applicant.full_name || 'Applicant Review';
    revApplicantUsername.textContent = '@' + (applicant.username || 'user');
    
    revStatusBadge.textContent = applicant.status || 'pending';
    revStatusBadge.className = `badge ${applicant.status === 'approved' ? 'badge-success' : 'badge-warning'}`;

    revPaymentBadge.textContent = applicant.membership_paid ? 'PAID (₹365)' : 'UNPAID';
    revPaymentBadge.className = `badge ${applicant.membership_paid ? 'badge-success' : 'badge-neutral'}`;

    // Demographic Info
    revFullName.textContent = applicant.full_name || '-';
    revPhone.innerHTML = applicant.phone ? `<a href="tel:${applicant.phone}" style="color: #38bdf8; text-decoration: none;">${applicant.phone} &#128222;</a>` : '-';
    revEmail.innerHTML = applicant.email ? `<a href="mailto:${applicant.email}" style="color: #38bdf8; text-decoration: none;">${applicant.email} &#9993;</a>` : '-';
    revDistrict.textContent = applicant.district_name || 'Tamil Nadu';
    revConstituency.textContent = applicant.assembly_constituency || 'Not specified';
    revPanchayat.textContent = applicant.panchayat || 'Not specified';
    revAddress.textContent = applicant.address || 'Address provided during registration';
    revPincode.textContent = applicant.pincode || '-';
    revAffiliation.textContent = applicant.affiliation || applicant.category || 'General';
    revOrgName.textContent = applicant.organization_name || '-';
    revWorkStudy.textContent = applicant.work_study_status || 'Working Professional';
    revEmployer.textContent = applicant.employer_name || '-';
    revWing.textContent = applicant.wing_name || applicant.wing_to_join || 'Administration Wing';
    revDept.textContent = applicant.department || 'General Administration';
    revMode.textContent = applicant.mode_of_work || 'Field Work';
    revBloodGroup.textContent = applicant.blood_group || 'O+';
    revDob.textContent = applicant.dob || '-';
    revGender.textContent = applicant.gender || 'Not specified';
    revMaritalStatus.textContent = applicant.marital_status || 'Single';
    revFatherHusband.textContent = applicant.father_or_husband_name || '-';

    // Reset Aadhaar Display (Masked)
    const last4 = applicant.aadhaar_last4 || (applicant.aadhaar ? applicant.aadhaar.slice(-4) : '----');
    revAadhaarDisplay.textContent = `•••• •••• ${last4}`;
    btnRevealAadhaar.innerHTML = '&#128275; Reveal Full Aadhaar';
    btnRevealAadhaar.className = 'btn-reveal-aadhaar';
    btnRevealAadhaar.disabled = false;
    revAadhaarAuditNotice.innerHTML = '&#128274; Aadhaar is masked. Revealing decrypts the full 12 digits and writes a permanent record into the immutable <strong>audit_log</strong> table.';

    // Reset Call Outcome Boxes
    revScheduledBox.classList.add('hidden');
    revAttendedBox.classList.add('hidden');
    updateModalCallBadge(applicant.call_status || 'not_called');

    // Reset Approval Alert & Button
    revApprovalAlert.className = 'alert hidden';
    revApprovalAlert.textContent = '';
    btnApproveApplicant.disabled = true;

    // Set Role Recommendation
    revRoleSelect.value = applicant.role || 'volunteer';

    // Show Modal
    adminReviewModal.classList.remove('hidden');

    // Async Fetch Data: Call Logs, Questions, Scores
    await Promise.all([
      loadApplicantCallLogs(applicant.id),
      loadInterviewQuestionsAndScores(applicant.id)
    ]);
  }

  if (btnCloseAdminReviewModal) {
    btnCloseAdminReviewModal.addEventListener('click', () => {
      adminReviewModal.classList.add('hidden');
      currentReviewingApplicant = null;
    });
  }

  // Aadhaar Reveal Action (Task T5 / Step 7 - Master Admin ONLY)
  if (btnRevealAadhaar) {
    btnRevealAadhaar.addEventListener('click', async () => {
      if (!currentReviewingApplicant) return;

      btnRevealAadhaar.disabled = true;
      btnRevealAadhaar.textContent = 'Decrypting...';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (window.currentSessionToken) {
          headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
        }

        const res = await fetch('/api/admin/reveal-aadhaar', {
          method: 'POST',
          headers,
          body: JSON.stringify({ profile_id: currentReviewingApplicant.id })
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          alert(data.error || 'Access Denied: Master Admin credentials required.');
          btnRevealAadhaar.textContent = 'Reveal Failed';
          btnRevealAadhaar.disabled = false;
          return;
        }

        // Format 12-digit Aadhaar with clean spaces
        const raw = (data.aadhaar || '').replace(/\s+/g, '');
        const formatted = raw.length === 12 ? `${raw.slice(0, 4)} ${raw.slice(4, 8)} ${raw.slice(8, 12)}` : data.aadhaar;

        revAadhaarDisplay.textContent = formatted;
        btnRevealAadhaar.innerHTML = '&#9989; Revealed (Audited)';
        btnRevealAadhaar.className = 'btn-reveal-aadhaar revealed';
        revAadhaarAuditNotice.innerHTML = `<span style="color:#34d399; font-weight:600;">&#128274; Audited:</span> Decrypted via AES-256-GCM by Master Admin and logged to <code>audit_log</code> at ${new Date().toLocaleTimeString()}.`;

      } catch (err) {
        console.error('Reveal Aadhaar error:', err);
        btnRevealAadhaar.disabled = false;
        btnRevealAadhaar.textContent = 'Reveal Full Aadhaar';
      }
    });
  }

  // Call Outcome Controls (Task T6 / Steps 8 & 9)
  function updateModalCallBadge(status) {
    let cls = 'badge-call-not_called';
    let label = 'not_called';
    if (status === 'no_answer') { cls = 'badge-call-no_answer'; label = 'no_answer'; }
    if (status === 'scheduled') { cls = 'badge-call-scheduled'; label = 'scheduled'; }
    if (status === 'attended') { cls = 'badge-call-attended'; label = 'attended'; }

    revCurrentCallStatusBadge.className = `badge ${cls}`;
    revCurrentCallStatusBadge.textContent = label;
  }

  if (btnCallNoAnswer) {
    btnCallNoAnswer.addEventListener('click', async () => {
      if (!currentReviewingApplicant) return;
      if (!confirm(`Log "No Answer" call attempt for ${currentReviewingApplicant.full_name}?`)) return;

      await submitCallLog('no_answer', null, 'Applicant did not answer telephone call.');
    });
  }

  if (btnCallScheduled) {
    btnCallScheduled.addEventListener('click', () => {
      revScheduledBox.classList.remove('hidden');
      revAttendedBox.classList.add('hidden');
      
      // Default callback time: tomorrow at 10 AM
      const d = new Date(Date.now() + 24 * 3600 * 1000);
      d.setHours(10, 0, 0, 0);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      revCallbackTime.value = iso;
      revCallbackNote.focus();
    });
  }

  if (btnCancelScheduledCall) {
    btnCancelScheduledCall.addEventListener('click', () => {
      revScheduledBox.classList.add('hidden');
    });
  }

  if (btnSaveScheduledCall) {
    btnSaveScheduledCall.addEventListener('click', async () => {
      const cbTime = revCallbackTime.value;
      if (!cbTime) {
        alert('Please select a callback date and time.');
        revCallbackTime.focus();
        return;
      }
      const note = revCallbackNote.value.trim() || 'Callback agreed with applicant.';
      await submitCallLog('scheduled', new Date(cbTime).toISOString(), note);
      revScheduledBox.classList.add('hidden');
    });
  }

  if (btnCallAttended) {
    btnCallAttended.addEventListener('click', () => {
      revAttendedBox.classList.remove('hidden');
      revScheduledBox.classList.add('hidden');
      revAttendedNote.focus();
    });
  }

  if (btnCancelAttendedCall) {
    btnCancelAttendedCall.addEventListener('click', () => {
      revAttendedBox.classList.add('hidden');
    });
  }

  if (btnSaveAttendedCall) {
    btnSaveAttendedCall.addEventListener('click', async () => {
      const note = revAttendedNote.value.trim() || 'Telephone verification attended; completed questions.';
      await submitCallLog('attended', null, note);
      revAttendedBox.classList.add('hidden');
      
      // Scroll to scoring sheet
      const scoringCard = document.querySelector('.scoring-sheet-card');
      if (scoringCard) scoringCard.scrollIntoView({ behavior: 'smooth' });
    });
  }

  async function submitCallLog(outcome, callbackAt, note) {
    if (!currentReviewingApplicant) return;

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.currentSessionToken) {
        headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
      }

      const res = await fetch('/api/admin/log-call', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          profile_id: currentReviewingApplicant.id,
          outcome,
          callback_at: callbackAt,
          note
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to log call');
        return;
      }

      currentReviewingApplicant.call_status = outcome;
      updateModalCallBadge(outcome);
      await loadApplicantCallLogs(currentReviewingApplicant.id);
      loadFullAdminQueue(); // refresh queue table background

    } catch (err) {
      console.error('Call log error:', err);
    }
  }

  // Load Call History Logs for Applicant
  async function loadApplicantCallLogs(profileId) {
    revCallHistoryList.innerHTML = '<div class="call-log-item placeholder">Loading history...</div>';

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (window.currentSessionToken) {
        headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
      }

      const res = await fetch(`/api/admin/call-logs?profile_id=${profileId}`, { headers });
      const data = await res.json();
      const logs = data.logs || [];

      revCallHistoryList.innerHTML = '';
      if (logs.length === 0) {
        revCallHistoryList.innerHTML = '<div class="call-log-item placeholder">No call attempts logged yet.</div>';
        return;
      }

      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = `call-log-item outcome-${log.outcome}`;

        let outcomeLabel = 'Not Called';
        let outcomeBadge = 'badge-call-not_called';
        if (log.outcome === 'no_answer') { outcomeLabel = 'No Answer'; outcomeBadge = 'badge-call-no_answer'; }
        if (log.outcome === 'scheduled') { outcomeLabel = 'Scheduled Callback'; outcomeBadge = 'badge-call-scheduled'; }
        if (log.outcome === 'attended') { outcomeLabel = 'Attended'; outcomeBadge = 'badge-call-attended'; }

        const timeStr = log.created_at ? new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : '';
        const cbStr = log.callback_at ? ` &bull; Callback: ${new Date(log.callback_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}` : '';

        item.innerHTML = `
          <div>
            <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 2px;">
              <span class="badge ${outcomeBadge}" style="font-size: 11px;">${outcomeLabel}</span>
              <span class="call-log-time">${timeStr}</span>
            </div>
            <div style="font-size: 12px; color: var(--text-main);">${escapeHtml(log.note || '')}${cbStr}</div>
          </div>
        `;
        revCallHistoryList.appendChild(item);
      });

    } catch (err) {
      console.error('Failed to load call logs:', err);
    }
  }

  // Load Interview Questions & Scores (Tasks T7 & T8)
  async function loadInterviewQuestionsAndScores(profileId) {
    revQuestionsList.innerHTML = '<div class="queue-item placeholder">Loading interview questions...</div>';

    try {
      // 1. Fetch Questions
      if (interviewQuestionsCache.length === 0) {
        const qRes = await fetch('/api/admin/questions');
        const qData = await qRes.json();
        interviewQuestionsCache = qData.questions || [];
      }

      // 2. Fetch Existing Scores
      const headers = { 'Content-Type': 'application/json' };
      if (window.currentSessionToken) {
        headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
      }
      const sRes = await fetch(`/api/admin/scores?profile_id=${profileId}`, { headers });
      const sData = await sRes.json();
      const existingScores = sData.scores || [];

      applicantScoresMap = {};
      existingScores.forEach(s => {
        applicantScoresMap[s.question_id] = {
          score: parseFloat(s.score),
          note: s.note || ''
        };
      });

      renderQuestionsList();
      recalculateRunningScore();

    } catch (err) {
      console.error('Failed to load questions and scores:', err);
    }
  }

  function renderQuestionsList() {
    revQuestionsList.innerHTML = '';

    interviewQuestionsCache.forEach((q, idx) => {
      const qNum = q.position || (idx + 1);
      const existing = applicantScoresMap[q.id];
      const selectedScore = existing ? existing.score : null;
      const existingNote = existing ? existing.note : '';

      const card = document.createElement('div');
      card.className = 'question-card';
      card.innerHTML = `
        <div class="question-prompt">
          <strong style="color: #38bdf8;">Q${qNum}:</strong> ${escapeHtml(q.text)}
        </div>
        <div class="question-controls">
          <div class="score-btn-group" data-qid="${q.id}">
            <button type="button" class="btn-score-choice ${selectedScore === 0 ? 'active' : ''}" data-score="0">0 (No)</button>
            <button type="button" class="btn-score-choice ${selectedScore === 0.5 ? 'active' : ''}" data-score="0.5">0.5 (Partial)</button>
            <button type="button" class="btn-score-choice ${selectedScore === 1 ? 'active' : ''}" data-score="1">1.0 (Strong)</button>
          </div>
          <input type="text" class="question-note-input" placeholder="Notes (optional)" value="${escapeHtml(existingNote)}" data-qid="${q.id}">
        </div>
      `;

      // Wire Score Buttons
      const btnChoices = card.querySelectorAll('.btn-score-choice');
      btnChoices.forEach(btn => {
        btn.addEventListener('click', () => {
          btnChoices.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');

          const scVal = parseFloat(btn.getAttribute('data-score'));
          const noteInput = card.querySelector('.question-note-input');
          const noteVal = noteInput ? noteInput.value.trim() : '';

          applicantScoresMap[q.id] = {
            score: scVal,
            note: noteVal
          };

          recalculateRunningScore();
        });
      });

      // Wire Note Input
      const noteInput = card.querySelector('.question-note-input');
      noteInput.addEventListener('input', () => {
        if (!applicantScoresMap[q.id]) {
          applicantScoresMap[q.id] = { score: 0, note: '' };
        }
        applicantScoresMap[q.id].note = noteInput.value.trim();
      });

      revQuestionsList.appendChild(card);
    });
  }

  function recalculateRunningScore() {
    let total = 0;
    let scoredCount = 0;
    const totalQuestions = interviewQuestionsCache.length || 10;

    interviewQuestionsCache.forEach(q => {
      if (applicantScoresMap[q.id] !== undefined && applicantScoresMap[q.id].score !== null) {
        total += applicantScoresMap[q.id].score;
        scoredCount++;
      }
    });

    revRunningScore.textContent = total.toFixed(1);
    const pct = totalQuestions > 0 ? (total / totalQuestions) * 100 : 0;
    revScoreProgressBar.style.width = Math.min(100, Math.max(0, pct)) + '%';

    revScoredCount.textContent = `${scoredCount} / ${totalQuestions} Scored`;
    if (scoredCount === totalQuestions) {
      revScoredCount.className = 'bold text-success';
      revScoringCompleteCheck.className = 'readiness-item ready';
      revScoringCompleteCheck.innerHTML = `&#10004; All ${totalQuestions} leadership interview questions scored (Total: ${total.toFixed(1)} / 10.0)`;

      // Auto-suggest role based on score
      if (total >= 8.5) {
        revRoleSelect.value = 'district_coordinator';
        revRoleHint.textContent = 'Auto-suggested: District Coordinator (High evaluation score >= 8.5)';
      } else if (total >= 7.0) {
        revRoleSelect.value = 'wing_lead';
        revRoleHint.textContent = 'Auto-suggested: Wing Lead (Solid evaluation score >= 7.0)';
      } else {
        revRoleSelect.value = 'volunteer';
        revRoleHint.textContent = 'Auto-suggested: Volunteer (Standard evaluation score)';
      }

      // Enable Approval Button if applicant is pending
      if (currentReviewingApplicant && currentReviewingApplicant.status !== 'approved') {
        btnApproveApplicant.disabled = false;
      }
    } else {
      revScoredCount.className = 'bold text-warning';
      revScoringCompleteCheck.className = 'readiness-item';
      revScoringCompleteCheck.innerHTML = `&#8987; ${totalQuestions - scoredCount} questions remaining to be scored before approval.`;
      btnApproveApplicant.disabled = true;
    }
  }

  // Save Scores Draft (Task T7)
  if (btnSaveScoresDraft) {
    btnSaveScoresDraft.addEventListener('click', async () => {
      if (!currentReviewingApplicant) return;

      const scoresArray = Object.keys(applicantScoresMap).map(qId => ({
        question_id: parseInt(qId),
        score: applicantScoresMap[qId].score,
        note: applicantScoresMap[qId].note || ''
      }));

      if (scoresArray.length === 0) {
        alert('Please score at least one question before saving draft.');
        return;
      }

      btnSaveScoresDraft.disabled = true;
      btnSaveScoresDraft.textContent = 'Saving...';

      try {
        const headers = { 'Content-Type': 'application/json' };
        if (window.currentSessionToken) {
          headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
        }

        const res = await fetch('/api/admin/save-scores', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profile_id: currentReviewingApplicant.id,
            scores: scoresArray
          })
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || 'Failed to save scores draft');
          return;
        }

        btnSaveScoresDraft.innerHTML = '&#9989; Scores Draft Saved';
        setTimeout(() => {
          btnSaveScoresDraft.disabled = false;
          btnSaveScoresDraft.innerHTML = '&#128190; Save Scores Draft';
        }, 2000);

      } catch (err) {
        console.error('Save scores draft error:', err);
        btnSaveScoresDraft.disabled = false;
        btnSaveScoresDraft.innerHTML = '&#128190; Save Scores Draft';
      }
    });
  }

  // Mark Verified & Approve Applicant (Task T8 / Step 11)
  if (btnApproveApplicant) {
    btnApproveApplicant.addEventListener('click', async () => {
      if (!currentReviewingApplicant) return;

      const totalQuestions = interviewQuestionsCache.length || 10;
      const scoredCount = Object.keys(applicantScoresMap).length;

      if (scoredCount < totalQuestions) {
        alert(`Cannot approve applicant: all ${totalQuestions} questions must be scored first.`);
        return;
      }

      const assignedRole = revRoleSelect.value;
      const confirmMsg = `Approve ${currentReviewingApplicant.full_name} as official "${assignedRole}"?\n\nThis will atomically generate their official TNV Member ID, record the verification score in the database, and send their welcome email.`;

      if (!confirm(confirmMsg)) return;

      btnApproveApplicant.disabled = true;
      btnApproveApplicant.textContent = 'Verifying & Approving...';
      revApprovalAlert.className = 'alert hidden';

      try {
        // 1. First ensure scores are saved to the database
        const scoresArray = Object.keys(applicantScoresMap).map(qId => ({
          question_id: parseInt(qId),
          score: applicantScoresMap[qId].score,
          note: applicantScoresMap[qId].note || ''
        }));

        const headers = { 'Content-Type': 'application/json' };
        if (window.currentSessionToken) {
          headers['Authorization'] = 'Bearer ' + window.currentSessionToken;
        }

        await fetch('/api/admin/save-scores', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profile_id: currentReviewingApplicant.id,
            scores: scoresArray
          })
        });

        // 2. Call Approval Endpoint (Edge Function / atomic RPC)
        const approveRes = await fetch('/api/admin/approve', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            profile_id: currentReviewingApplicant.id,
            role: assignedRole,
            wing_id: currentReviewingApplicant.wing_id || null
          })
        });

        const approveData = await approveRes.json();

        if (!approveRes.ok || !approveData.success) {
          revApprovalAlert.className = 'alert alert-danger';
          revApprovalAlert.textContent = approveData.error || 'Approval failed. Ensure all questions are scored.';
          revApprovalAlert.classList.remove('hidden');
          btnApproveApplicant.disabled = false;
          btnApproveApplicant.textContent = 'Mark Verified & Approve Applicant';
          return;
        }

        // 3. Approval Success!
        currentReviewingApplicant.status = 'approved';
        currentReviewingApplicant.role = assignedRole;
        currentReviewingApplicant.tnv_id = approveData.tnv_id;

        revStatusBadge.textContent = 'approved';
        revStatusBadge.className = 'badge badge-success';

        revApprovalAlert.className = 'alert alert-success';
        revApprovalAlert.innerHTML = `
          <strong>&#10004; Applicant Successfully Verified & Approved!</strong><br>
          Assigned Official Member ID: <strong class="mono gold">${approveData.tnv_id || 'TNV-CHE-0001'}</strong> &bull; Role: <strong>${assignedRole}</strong><br>
          <span style="font-size: 11px;">Part C features (Digital ID Card, Appointment Letter, WhatsApp links) are now unlocked for this applicant.</span>
        `;
        revApprovalAlert.classList.remove('hidden');

        btnApproveApplicant.disabled = true;
        btnApproveApplicant.innerHTML = '&#9989; Applicant Verified & Approved';

        // Refresh Queue Table
        loadFullAdminQueue();

      } catch (err) {
        console.error('Approval error:', err);
        revApprovalAlert.className = 'alert alert-danger';
        revApprovalAlert.textContent = 'Approval failed: ' + err.message;
        revApprovalAlert.classList.remove('hidden');
        btnApproveApplicant.disabled = false;
        btnApproveApplicant.textContent = 'Mark Verified & Approve Applicant';
      }
    });
  }


  loadAdminQueue();
  updatePaymentUi();
});
