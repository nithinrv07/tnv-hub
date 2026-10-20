/**
 * TNV Hub Portal - Live Supabase Bridge
 * 
 * Automatically activates when SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
 * are provided in the environment or .env file.
 * 
 * Directly interacts with:
 * - Supabase Auth (GoTrue API)
 * - Supabase PostgREST (Tables & Views)
 * - Supabase Database RPCs (username_available, email_available, my_links, generate_receipt_no, etc.)
 * - Supabase Storage (receipts private bucket)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Auto-load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SECRET_KEY = process.env.AADHAAR_ENCRYPTION_KEY || 'tnv_phase1_super_secret_encryption_key_2026';

function isConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
}

function getServiceHeaders() {
  return {
    'apikey': SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

function getAnonHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };
}

function getUserHeaders(jwt) {
  return {
    'apikey': SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  };
}

// AES-256-GCM Aadhaar Encryption (Same algorithm as Edge Functions & SQL)
function encryptAadhaar(aadhaarPlain) {
  const clean = aadhaarPlain.replace(/[\s-]/g, '');
  const keyBytes = crypto.createHash('sha256').update(SECRET_KEY).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);

  let encrypted = cipher.update(clean, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    aadhaar_enc: `${iv.toString('hex')}:${encrypted}${authTag}`,
    aadhaar_last4: clean.slice(-4)
  };
}

// AES-256-GCM Aadhaar Decryption (Matches Edge Function & testDecrypt)
function decryptAadhaar(aadhaarEnc) {
  if (!aadhaarEnc || typeof aadhaarEnc !== 'string') return '';
  const parts = aadhaarEnc.split(':');
  if (parts.length !== 2) return '';
  const iv = Buffer.from(parts[0], 'hex');
  const raw = Buffer.from(parts[1], 'hex');
  if (raw.length < 16) return '';
  const tag = raw.subarray(raw.length - 16);
  const ciphertext = raw.subarray(0, raw.length - 16);
  const keyBytes = crypto.createHash('sha256').update(SECRET_KEY).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(tag);
  let dec = decipher.update(ciphertext, null, 'utf8');
  dec += decipher.final('utf8');
  return dec;
}


/**
 * 1. Ping Supabase
 */
async function pingSupabase() {
  if (!isConfigured()) return { ok: false, error: 'Supabase credentials not configured in environment' };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/districts?select=id&limit=1`, {
      headers: getAnonHeaders()
    });
    return { ok: res.ok, status: res.status, statusText: res.statusText };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 2. Fetch 38 Districts from Supabase table
 */
async function getDistricts() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/districts?select=*&order=id.asc`, {
    headers: getAnonHeaders()
  });
  if (!res.ok) {
    throw new Error(`Supabase districts error: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * 3. Live Username Availability RPC
 */
async function checkUsernameAvailable(username) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/username_available`, {
    method: 'POST',
    headers: getAnonHeaders(),
    body: JSON.stringify({ u: username })
  });
  if (!res.ok) {
    throw new Error(`Supabase username_available RPC error: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * 4. Live Email Availability RPC
 */
async function checkEmailAvailable(email) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/email_available`, {
    method: 'POST',
    headers: getAnonHeaders(),
    body: JSON.stringify({ e: email })
  });
  if (!res.ok) {
    throw new Error(`Supabase email_available RPC error: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * 5. Register Volunteer in Supabase Auth & Profiles table
 */
async function registerUser(payload) {
  const email = payload.email.trim().toLowerCase();
  const username = payload.username.trim();
  const password = payload.password;

  // 1. Check duplicate username
  const uAvail = await checkUsernameAvailable(username);
  if (!uAvail) {
    return { error: 'Username is already taken. Please choose another username.', field: 'username', status: 409 };
  }

  // 2. Check duplicate email
  const eAvail = await checkEmailAvailable(email);
  if (!eAvail) {
    return { error: 'This email address is already registered. Only one account can be created per email ID.', field: 'email', status: 409 };
  }

  // 3. Create user in Supabase Auth (admin API)
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: username,
        full_name: payload.full_name.trim()
      }
    })
  });

  const authData = await authRes.json();
  if (!authRes.ok || !authData?.id) {
    return { error: authData?.message || 'Authentication user creation failed', status: 400 };
  }

  const userId = authData.id;

  try {
    // 4. Encrypt Aadhaar
    const { aadhaar_enc, aadhaar_last4 } = encryptAadhaar(payload.aadhaar);

    // 5. Insert profile record
    const profileRow = {
      id: userId,
      username: username,
      full_name: payload.full_name.trim(),
      email: email,
      phone: payload.phone.replace(/[\s-]/g, ''),
      address: payload.address.trim(),
      district_id: payload.district_id,
      aadhaar_enc: aadhaar_enc,
      aadhaar_last4: aadhaar_last4,
      status: 'pending',
      role: null,
      membership_paid: false,
      dob: payload.dob || null,
      gender: payload.gender || null,
      marital_status: payload.marital_status || null,
      father_or_husband_name: payload.father_or_husband_name || null,
      category: payload.category || payload.affiliation || null,
      affiliation: payload.affiliation || payload.category || null,
      organization_name: payload.organization_name || null,
      work_study_status: payload.work_study_status || null,
      employer_name: payload.employer_name || null,
      blood_group: payload.blood_group || null,
      occupation: payload.occupation || null,
      assembly_constituency: payload.assembly_constituency || null,
      panchayat: payload.panchayat || null,
      previous_experience: payload.previous_experience || null,
      past_field_work: Array.isArray(payload.past_field_work) ? payload.past_field_work : (payload.past_field_work ? [payload.past_field_work] : []),
      wing_to_join: payload.wing_to_join || null,
      department: payload.department || null,
      mode_of_work: payload.mode_of_work || null,
      pincode: payload.pincode || null,
      preferred_designation: payload.preferred_designation || null,
      photo_path: payload.photo_path || null
    };

    const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...getServiceHeaders(),
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(profileRow)
    });

    if (!profileRes.ok) {
      const errBody = await profileRes.text();
      throw new Error(`Profile insert failed: ${errBody}`);
    }

    const createdProfiles = await profileRes.json();
    const publicProfile = createdProfiles[0];

    // 6. Insert notification for admin queue
    await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify({
        kind: 'new_registration',
        profile_id: userId,
        read: false
      })
    }).catch(e => console.error('Notification log error:', e));

    // 7. Sign in via GoTrue to get active user JWT session
    const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: getAnonHeaders(),
      body: JSON.stringify({ email: email, password: password })
    });
    const sessionData = await tokenRes.json();

    const { aadhaar_enc: _, ...safeProfile } = publicProfile || profileRow;

    return {
      success: true,
      status: 201,
      message: 'Registration successful. Application is under review.',
      user: { id: userId, email: email, username: username },
      session: sessionData?.access_token ? {
        access_token: sessionData.access_token,
        token_type: 'bearer',
        expires_in: sessionData.expires_in || 3600
      } : null,
      profile: safeProfile
    };

  } catch (err) {
    // Rollback: delete Auth user if profile insertion failed
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getServiceHeaders()
    }).catch(delErr => console.error('Rollback error:', delErr));

    return { error: err.message, status: 500 };
  }
}

/**
 * 6. Login via Supabase Auth (Username -> email -> GoTrue sign in)
 */
async function loginUser(username, password) {
  // 1. Resolve username to email using login_email_for RPC
  const emailRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/login_email_for`, {
    method: 'POST',
    headers: getAnonHeaders(),
    body: JSON.stringify({ username: username.trim() })
  });

  const email = await emailRes.json();
  if (!email) {
    return { error: 'Invalid username or password.', status: 401 };
  }

  // 2. Authenticate with Supabase Auth
  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: getAnonHeaders(),
    body: JSON.stringify({ email: email, password: password })
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData?.access_token) {
    return { error: 'Invalid username or password.', status: 401 };
  }

  // 3. Load user's profile
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles_public?id=eq.${tokenData.user.id}&limit=1`, {
    headers: getUserHeaders(tokenData.access_token)
  });

  const profiles = await profileRes.json();
  const profile = profiles && profiles[0];

  return {
    success: true,
    status: 200,
    message: 'Sign in successful',
    session: {
      access_token: tokenData.access_token,
      token_type: 'bearer',
      expires_in: tokenData.expires_in || 3600
    },
    profile: profile || { id: tokenData.user.id, email: email, username: username }
  };
}

/**
 * 7. Get user profile from JWT
 */
async function getProfileFromToken(token) {
  // 1. Verify user with Supabase Auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: getUserHeaders(token)
  });

  if (!userRes.ok) return null;
  const user = await userRes.json();
  if (!user || !user.id) return null;

  // 2. Fetch profile from public view
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles_public?id=eq.${user.id}&limit=1`, {
    headers: getUserHeaders(token)
  });

  if (!profileRes.ok) return null;
  const profiles = await profileRes.json();
  return profiles && profiles[0] ? profiles[0] : null;
}

/**
 * 8. Call my_links() RPC with user's JWT
 */
async function getMyLinks(token) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/my_links`, {
    method: 'POST',
    headers: getUserHeaders(token),
    body: JSON.stringify({})
  });

  if (!res.ok) {
    return { links: [], status: 'error' };
  }

  const links = await res.json();
  return { links: Array.isArray(links) ? links : [] };
}

/**
 * 9. Record Payment in Supabase (payments table, profiles.membership_paid = true)
 */
async function recordPayment(token, gatewayRef) {
  const profile = await getProfileFromToken(token);
  if (!profile) return { error: 'Unauthorized: invalid session', status: 401 };

  // 1. Generate receipt number from sequence
  const seqRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/generate_receipt_no`, {
    method: 'POST',
    headers: getServiceHeaders(),
    body: JSON.stringify({})
  });
  const receiptNo = await seqRes.json();

  // 2. Insert payments record
  const payRes = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
    method: 'POST',
    headers: getServiceHeaders(),
    body: JSON.stringify({
      profile_id: profile.id,
      amount_inr: 365,
      status: 'paid',
      gateway_ref: gatewayRef,
      receipt_no: receiptNo,
      paid_at: new Date().toISOString()
    })
  });

  if (!payRes.ok) {
    const errText = await payRes.text();
    return { error: `Payment record failed: ${errText}`, status: 500 };
  }

  // 3. Update profiles.membership_paid
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${profile.id}`, {
    method: 'PATCH',
    headers: getServiceHeaders(),
    body: JSON.stringify({ membership_paid: true })
  });

  return {
    success: true,
    status: 200,
    receipt_no: receiptNo,
    amount_inr: 365,
    message: 'Payment of ₹365 recorded successfully in Supabase'
  };
}

/**
 * 10. Fetch Live Public Admin Queue from Supabase view
 */
async function getPublicProfiles() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles_public?select=*&order=created_at.desc&limit=50`, {
    headers: getAnonHeaders()
  });
  if (!res.ok) return [];
  return await res.json();
}


/**
 * 11. Fetch Admin Queue with RLS
 */
async function getAdminQueue(jwt) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_queue?select=*&order=created_at.desc`, { headers });
  if (!res.ok) {
    const fallback = await fetch(`${SUPABASE_URL}/rest/v1/admin_queue?select=*&order=created_at.desc`, { headers: getServiceHeaders() });
    if (!fallback.ok) return [];
    return await fallback.json();
  }
  return await res.json();
}

/**
 * 12. Fetch Admin Followups
 */
async function getAdminFollowups(jwt) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/admin_followups?select=*&order=latest_call_at.desc`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * 13. Master Admin Reveal Aadhaar RPC + Decryption
 */
async function revealAadhaar(jwt, profileId) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/reveal_aadhaar`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ id: profileId })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message || 'Access Denied: Master Admin role required to reveal Aadhaar', status: res.status };
  }
  const data = await res.json();
  const decrypted = decryptAadhaar(data.aadhaar_enc);
  return {
    success: true,
    profile_id: data.profile_id,
    full_name: data.full_name,
    aadhaar: decrypted,
    aadhaar_last4: data.aadhaar_last4,
    audited: true
  };
}

/**
 * 14. Log Call Attempt RPC
 */
async function logCall(jwt, { profile_id, outcome, callback_at, note }) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_call`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      profile_id,
      outcome,
      callback_at: callback_at || null,
      note: note || null
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message || 'Failed to log call', status: res.status };
  }
  return await res.json();
}

/**
 * 15. Fetch Call Logs for an applicant
 */
async function getCallLogs(jwt, profileId) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/call_logs?profile_id=eq.${profileId}&order=created_at.desc&select=*`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * 16. Fetch Active Interview Questions
 */
async function getInterviewQuestions() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/interview_questions?active=eq.true&order=position.asc&select=*`, {
    headers: getServiceHeaders()
  });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * 17. Fetch Existing Scores for an applicant
 */
async function getInterviewScores(jwt, profileId) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/interview_scores?profile_id=eq.${profileId}&select=*`, { headers });
  if (!res.ok) return [];
  return await res.json();
}

/**
 * 18. Save Interview Scores RPC
 */
async function saveScores(jwt, profileId, scores) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/save_scores`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_profile_id: profileId,
      scores
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.message || 'Failed to save scores', status: res.status };
  }
  return await res.json();
}

/**
 * 19. Approve Applicant (Edge Function with RPC fallback)
 */
async function approveApplicant(jwt, { profile_id, role, wing_id }) {
  const headers = jwt ? getUserHeaders(jwt) : getServiceHeaders();
  try {
    const efRes = await fetch(`${SUPABASE_URL}/functions/v1/approve_applicant`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ profile_id, role: role || 'volunteer', wing_id: wing_id || null })
    });
    if (efRes.ok) return await efRes.json();
    if (efRes.status === 400) {
      const err = await efRes.json().catch(() => ({}));
      return { error: err.error || 'All interview questions must be scored', missing_question_ids: err.missing_question_ids, status: 400 };
    }
  } catch (_e) {}

  const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/approve_applicant_tx`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      p_profile_id: profile_id,
      p_role: role || 'volunteer',
      p_wing_id: wing_id || null
    })
  });
  if (!rpcRes.ok) {
    const err = await rpcRes.json().catch(() => ({}));
    return { error: err.message || 'Approval failed', status: rpcRes.status };
  }
  return await rpcRes.json();
}

/**
 * 20. Ensure Demo Master Admin exists
 */
async function ensureDemoAdmin() {
  if (!isConfigured()) return null;
  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?username=eq.masteradmin&select=id,role`, {
      headers: getServiceHeaders()
    });
    const existing = await checkRes.json();
    if (existing && existing.length > 0) return existing[0];
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify({
        email: 'masteradmin@tnv.org',
        password: 'AdminPassword2026!',
        email_confirm: true,
        user_metadata: { username: 'masteradmin', full_name: 'Master Administrator' }
      })
    });
    const authUser = await authRes.json();
    if (!authUser || !authUser.id) return null;
    const enc = encryptAadhaar('999988887777');
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: getServiceHeaders(),
      body: JSON.stringify({
        id: authUser.id,
        username: 'masteradmin',
        full_name: 'Master Administrator',
        email: 'masteradmin@tnv.org',
        phone: '9840199999',
        district_id: 3,
        aadhaar_enc: enc.aadhaar_enc,
        aadhaar_last4: enc.aadhaar_last4,
        status: 'approved',
        role: 'master_admin',
        membership_paid: true
      })
    });
    return { id: authUser.id, username: 'masteradmin', role: 'master_admin' };
  } catch (err) {
    console.error('ensureDemoAdmin error:', err.message);
    return null;
  }
}


module.exports = {
  decryptAadhaar,
  getAdminQueue,
  getAdminFollowups,
  revealAadhaar,
  logCall,
  getCallLogs,
  getInterviewQuestions,
  getInterviewScores,
  saveScores,
  approveApplicant,
  ensureDemoAdmin,
  isConfigured,
  pingSupabase,
  getDistricts,
  checkUsernameAvailable,
  checkEmailAvailable,
  registerUser,
  loginUser,
  getProfileFromToken,
  getMyLinks,
  recordPayment,
  getPublicProfiles,
  encryptAadhaar,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY
};
