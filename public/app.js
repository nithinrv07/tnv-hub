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
    landingPageView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    registrationView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showLandingPage() {
    registrationView.classList.add('hidden');
    dashboardView.classList.add('hidden');
    landingPageView.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadAdminQueue();
  }

  function showApplicantDashboard(profile) {
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
  usernameInput.addEventListener('input', () => {
    const val = usernameInput.value.trim();
    clearTimeout(usernameDebounceTimer);

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
      try {
        const res = await fetch(`/api/username-available?u=${encodeURIComponent(val)}`);
        const data = await res.json();
        
        if (data.available) {
          usernameBadge.className = 'username-badge available';
          usernameBadge.textContent = '✓ Available';
        } else {
          usernameBadge.className = 'username-badge taken';
          usernameBadge.textContent = '✕ Already Taken';
        }
      } catch (err) {
        usernameBadge.className = 'username-badge invalid';
        usernameBadge.textContent = 'Error checking';
      }
    }, 300);
  });

  // =========================================================================
  // Live Email Uniqueness Check (Only one account per email rule)
  // =========================================================================
  let emailDebounceTimer = null;
  emailInput.addEventListener('input', () => {
    const val = emailInput.value.trim().toLowerCase();
    clearTimeout(emailDebounceTimer);

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
      try {
        const res = await fetch(`/api/email-available?e=${encodeURIComponent(val)}`);
        const data = await res.json();

        if (data.available) {
          emailBadge.className = 'username-badge available';
          emailBadge.textContent = '✓ Available';
          emailInput.classList.remove('is-invalid');
          emailInput.classList.add('is-valid');
        } else {
          emailBadge.className = 'username-badge taken';
          emailBadge.textContent = '✕ Already Taken (1 Account/Email)';
          emailInput.classList.add('is-invalid');
          emailInput.classList.remove('is-valid');
        }
      } catch (err) {
        emailBadge.className = 'username-badge invalid';
        emailBadge.textContent = 'Error checking';
      }
    }, 250);
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
  loadAdminQueue();
  updatePaymentUi();
});
