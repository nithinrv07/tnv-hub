import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, USERNAME_RE, EMAIL_RE, PINCODE_RE } from '../lib/registerSchema.js';
import { api } from '../lib/api.js';
import { saveToken } from '../lib/session.js';
import { getCurrentUser, isAdminUser } from '../lib/authService.js';
import { ZONES } from '../data/site.js';
import FormField, { inputClass } from '../components/form/FormField.jsx';
import PasswordInput from '../components/form/PasswordInput.jsx';
import DistrictSelect from '../components/form/DistrictSelect.jsx';
import PastFieldWorkSelect from '../components/PastFieldWorkSelect.jsx';
import Spinner from '../components/Spinner.jsx';
import REGISTRATION from '../data/registrationOptions.json';

const FIELD_ORDER = [
  'full_name', 'phone', 'email', 'dob', 'gender', 'marital_status',
  'blood_group', 'affiliation', 'organization_name', 'work_study_status', 'employer_name',
  'company_area', 'occupation', 'address', 'district_id', 'assembly_constituency', 'panchayat',
  'pincode', 'wing_to_join', 'department', 'mode_of_work', 'preferred_designation',
  'past_field_work', 'previous_works', 'aadhaarNumber', 'username', 'password', 'confirm_password'
];

const AVAILABILITY = {
  username: {
    valid: v => USERNAME_RE.test(v),
    url: v => `/api/username-available?u=${encodeURIComponent(v)}`,
    taken: 'This username is taken. Try another.',
    free: 'Username is available.'
  },
  email: {
    valid: v => EMAIL_RE.test(v),
    url: v => `/api/email-available?e=${encodeURIComponent(v)}`,
    taken: 'An account already uses this email. Log in instead, or use another email.',
    free: null
  }
};

function Section({ title, subtitle, children }) {
  return (
    // min-w-0 on the fieldset and its children: browsers size a fieldset to its widest
    // content by default, so a long <option> (wing names) pushed the page past phone width
    <fieldset className="grid min-w-0 gap-5 border-t border-brand-green-tint pt-6 sm:grid-cols-2 [&>*]:min-w-0">
      <legend className="float-left mb-1 w-full sm:col-span-2">
        <span className="block text-lg font-bold text-brand-green-dark">{title}</span>
        {subtitle && <span className="block text-xs font-normal text-neutral-500 mt-0.5">{subtitle}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

// Collaboration & partnership registration. Follows the volunteer workflow: save the
// application, create the applicant's account and dashboard, then go to the ₹365 payment page.
// Server: POST /api/collab/register -> { profile, session: { access_token } }
const COLLAB_INTERESTS = [
  'Campus Volunteer Chapter & Youth Leadership',
  'CSR Sponsorship & Social Development Projects',
  'Mega Tree Plantation (1 Crore Palm Mission)',
  'Disaster Relief Emergency Logistics Network',
  'Free Tuition Centres & Student Mentoring',
  'Anti-Drug & Civic Awareness Campaigns',
  'Medical Camps & Emergency Blood Donation'
];

const COLLAB_BLANK = {
  applicant_kind: 'organisation',
  organisation_name: '',
  category: '',
  reg_number: '',
  website: '',
  contact_name: '',
  designation: '',
  email: '',
  phone: '',
  district_name: '',
  address: '',
  volunteer_strength: '',
  interests: [],
  proposal: '',
  username: '',
  password: '',
  confirm_password: ''
};

function InstitutionForm({ districts }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(COLLAB_BLANK);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const isOrg = form.applicant_kind === 'organisation';

  const allDistrictNames = useMemo(() => {
    if (districts && districts.length) return districts.map(d => d.name || d);
    return ZONES.flatMap(z => z.districts).sort();
  }, [districts]);

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const toggleInterest = interest =>
    set('interests', form.interests.includes(interest) ? form.interests.filter(i => i !== interest) : [...form.interests, interest]);

  const validate = () => {
    const e = {};
    if (isOrg && !form.organisation_name.trim()) e.organisation_name = 'Enter the organisation name.';
    if (!form.contact_name.trim()) e.contact_name = 'Enter the contact person’s name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter a 10-digit mobile number.';
    if (!form.district_name) e.district_name = 'Choose a district.';
    if (form.interests.length === 0) e.interests = 'Choose at least one area of collaboration.';
    if (form.proposal.trim().length < 20) e.proposal = 'Describe your proposed initiative in a few sentences.';
    if (!USERNAME_RE.test(form.username.trim())) e.username = 'Use 4 to 20 letters, numbers or underscores (_).';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.';
    if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match.';
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setFormError('');
    const found = validate();
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`collab-${first}`)?.focus();
      return;
    }

    setLoading(true);
    const { confirm_password: _, ...body } = form;
    const res = await api('/api/collab/register', {
      method: 'POST',
      body: { ...body, email: body.email.trim().toLowerCase(), username: body.username.trim() }
    });
    setLoading(false);

    if (res.ok && res.data?.session?.access_token) {
      saveToken(res.data.session.access_token);
      navigate('/register/payment', { replace: true, state: { profile: res.data.profile } });
      return;
    }
    if (res.data?.field && res.data?.error) {
      setErrors({ [res.data.field]: res.data.error });
      document.getElementById(`collab-${res.data.field}`)?.focus();
      return;
    }
    const serverUnavailable = res.status === 0 || res.status === 404 || res.status === 405 || res.status >= 500;
    setFormError(
      serverUnavailable
        ? "We couldn't reach the TNV server, so your application wasn't saved. Your details are still here. Please try again later."
        : res.data?.error || 'Your application could not be submitted. Please check your entries and try again.'
    );
  };

  const field = (name, label, props = {}, required = false) => (
    <div className={props.wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={`collab-${name}`} className="mb-1 block text-sm font-semibold text-neutral-ink">
        {label}{required && <span className="text-status-no-answer"> *</span>}
      </label>
      <input
        id={`collab-${name}`}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        aria-invalid={Boolean(errors[name])}
        className={inputClass(errors[name])}
        type={props.type || 'text'}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        placeholder={props.placeholder}
      />
      {errors[name] && <p className="mt-1 text-xs font-medium text-status-no-answer">{errors[name]}</p>}
    </div>
  );

  const section = 'rounded-2xl bg-white p-5 sm:p-6 shadow-sm ring-1 ring-brand-green-tint/80 space-y-4 min-w-0';
  const heading = 'font-display text-base font-bold text-brand-green-dark';

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-6">
      <section className={section}>
        <h2 className={heading}>Who is applying?</h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'organisation', label: 'An organisation', hint: 'College, company, NGO or group' },
            { id: 'individual', label: 'An individual', hint: 'Applying in your own name' }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => set('applicant_kind', opt.id)}
              aria-pressed={form.applicant_kind === opt.id}
              className={`rounded-xl border p-3 text-left transition-colors ${form.applicant_kind === opt.id ? 'border-brand-green bg-brand-green-tint' : 'border-neutral-300 hover:border-brand-green'}`}
            >
              <span className="block text-sm font-bold text-neutral-ink">{opt.label}</span>
              <span className="block text-xs text-neutral-muted">{opt.hint}</span>
            </button>
          ))}
        </div>

        {isOrg && (
          <div className="grid gap-4 sm:grid-cols-2">
            {field('organisation_name', 'Organisation name', { wide: true }, true)}
            <div>
              <label htmlFor="collab-category" className="mb-1 block text-sm font-semibold text-neutral-ink">Type of organisation</label>
              <select id="collab-category" value={form.category} onChange={e => set('category', e.target.value)} className={inputClass(false)}>
                <option value="">Choose…</option>
                {['College / University', 'School', 'Company / CSR', 'NGO / Trust', 'Government body', 'Community group', 'Other'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {field('reg_number', 'Registration number')}
            {field('website', 'Website', { type: 'url', placeholder: 'https://', wide: true })}
            <div className="sm:col-span-2">
              <label htmlFor="collab-volunteer_strength" className="mb-1 block text-sm font-semibold text-neutral-ink">People who could take part</label>
              <select id="collab-volunteer_strength" value={form.volunteer_strength} onChange={e => set('volunteer_strength', e.target.value)} className={inputClass(false)}>
                <option value="">Choose…</option>
                {['Under 50', '50 - 100', '100 - 500', '500 - 1,000', 'Over 1,000'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      <section className={section}>
        <h2 className={heading}>Contact details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('contact_name', isOrg ? 'Contact person' : 'Full name', { autoComplete: 'name' }, true)}
          {isOrg && field('designation', 'Designation', { placeholder: 'e.g. Principal, CSR Head' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email' }, true)}
          {field('phone', 'Mobile number', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel' }, true)}
          <div>
            <label htmlFor="collab-district_name" className="mb-1 block text-sm font-semibold text-neutral-ink">
              District<span className="text-status-no-answer"> *</span>
            </label>
            <select
              id="collab-district_name"
              value={form.district_name}
              onChange={e => set('district_name', e.target.value)}
              aria-invalid={Boolean(errors.district_name)}
              className={inputClass(errors.district_name)}
            >
              <option value="">Choose a district…</option>
              {allDistrictNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.district_name && <p className="mt-1 text-xs font-medium text-status-no-answer">{errors.district_name}</p>}
          </div>
          {field('address', 'Address', { wide: true, autoComplete: 'street-address' })}
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>Collaboration interests<span className="text-status-no-answer"> *</span></h2>
        <div id="collab-interests" tabIndex={-1} className="grid gap-2 sm:grid-cols-2">
          {COLLAB_INTERESTS.map(interest => (
            <label key={interest} className="flex min-h-tap cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-200 p-3 text-sm hover:border-brand-green">
              <input
                type="checkbox"
                checked={form.interests.includes(interest)}
                onChange={() => toggleInterest(interest)}
                className="mt-0.5 h-4 w-4 accent-brand-green"
              />
              <span>{interest}</span>
            </label>
          ))}
        </div>
        {errors.interests && <p className="text-xs font-medium text-status-no-answer">{errors.interests}</p>}

        <div>
          <label htmlFor="collab-proposal" className="mb-1 block text-sm font-semibold text-neutral-ink">
            Proposed initiative<span className="text-status-no-answer"> *</span>
          </label>
          <textarea
            id="collab-proposal"
            rows={5}
            value={form.proposal}
            onChange={e => set('proposal', e.target.value)}
            aria-invalid={Boolean(errors.proposal)}
            placeholder="What would you like to do with Tamil Nadu Volunteers, where, and with how many people?"
            className={inputClass(errors.proposal)}
          />
          {errors.proposal && <p className="mt-1 text-xs font-medium text-status-no-answer">{errors.proposal}</p>}
        </div>
      </section>

      <section className={section}>
        <h2 className={heading}>Create your login</h2>
        <p className="text-xs text-neutral-muted">You'll use this to open your dashboard and follow your application.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('username', 'Username', { autoComplete: 'username', wide: true }, true)}
          <div>
            <label htmlFor="collab-password" className="mb-1 block text-sm font-semibold text-neutral-ink">Password<span className="text-status-no-answer"> *</span></label>
            <PasswordInput id="collab-password" value={form.password} onChange={e => set('password', e.target.value)} invalid={Boolean(errors.password)} autoComplete="new-password" />
            {errors.password && <p className="mt-1 text-xs font-medium text-status-no-answer">{errors.password}</p>}
          </div>
          <div>
            <label htmlFor="collab-confirm_password" className="mb-1 block text-sm font-semibold text-neutral-ink">Confirm password<span className="text-status-no-answer"> *</span></label>
            <PasswordInput id="collab-confirm_password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} invalid={Boolean(errors.confirm_password)} autoComplete="new-password" />
            {errors.confirm_password && <p className="mt-1 text-xs font-medium text-status-no-answer">{errors.confirm_password}</p>}
          </div>
        </div>
      </section>

      <div className="rounded-xl bg-brand-yellow-tint/60 p-4 text-sm text-neutral-ink">
        After you submit, your dashboard is created and you'll be taken to the ₹365 payment page. Our team reviews every collaboration application within 72 hours, whether or not the payment has gone through.
      </div>

      {formError && (
        <p role="alert" className="rounded-xl border border-status-no-answer/40 bg-white p-4 text-sm font-medium text-status-no-answer">{formError}</p>
      )}

      <button type="submit" disabled={loading} className="btn-register min-h-tap w-full text-base font-semibold">
        {loading ? <Spinner className="mr-2 h-5 w-5" /> : null}
        Submit Application
      </button>
    </form>
  );
}

export default function Register({ embeddedAdmin = false, onAdminSuccess }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Admin "Add Member" mode (/register?admin=1): an admin registers a volunteer on their
  // behalf, so the new member's session must not replace the admin's own sign-in.
 const adminMode =
  isAdminUser(getCurrentUser()) &&
  (embeddedAdmin || searchParams.get('admin') === '1');
  const initialType = !adminMode && searchParams.get('type') === 'institution' ? 'institution' : 'individual';
  const [regType, setRegType] = useState(initialType);

  useEffect(() => {
    const qType = searchParams.get('type');
    if (!adminMode && (qType === 'institution' || qType === 'individual')) {
      setRegType(qType);
    }
  }, [searchParams]);

  const handleSwitchType = type => {
    setRegType(type);
    setSearchParams({ type });
  };

  const [formError, setFormError] = useState('');
  const [available, setAvailable] = useState({ username: null, email: null });
  const lastChecked = useRef({ username: '', email: '' });

  // Dropdown options are bundled from server data (scripts/sync-registration-options.js)
  // so every list is ready immediately, including when the API is unreachable.
  const options = REGISTRATION.options;

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setFocus,
    getValues,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      full_name: '', phone: '', email: '', dob: '', gender: '', marital_status: '',
      blood_group: '', affiliation: '', organization_name: '',
      work_study_status: '', employer_name: '', company_area: '', occupation: '',
      address: '', district_id: '', assembly_constituency: '', panchayat: '', pincode: '',
      wing_to_join: '', department: '', mode_of_work: '', preferred_designation: '',
      past_field_work: [], previous_works: '', aadhaarNumber: '', aadhaar: '', username: '', password: '', confirm_password: ''
    }
  });

  // Watch form fields for dynamic dependencies
  const watchedDistrictId = watch('district_id');
  const watchedWing = watch('wing_to_join');
  const watchedDepartment = watch('department');
  const watchedAffiliation = watch('affiliation');
  const watchedWorkStatus = watch('work_study_status');
  const watchedDob = watch('dob');
  const watchedPassword = watch('password');
  const watchedConfirmPassword = watch('confirm_password');
  const watchedPastFieldWork = watch('past_field_work') || [];
  const watchedPrevWorks = watch('previous_works') || '';

  // Compute available constituencies for the selected district
  const availableConstituencies = useMemo(() => {
    if (!options || !options.constituencies_by_district || !watchedDistrictId) return [];
    return options.constituencies_by_district[watchedDistrictId] || [];
  }, [options, watchedDistrictId]);

  // Compute departments for the selected wing
  const availableDepartments = useMemo(() => {
    if (!options || !options.departments_by_wing || !watchedWing) return [];
    return options.departments_by_wing[watchedWing] || [];
  }, [options, watchedWing]);

  // Compute information items for the currently selected department
  const selectedDepartmentInfo = useMemo(() => {
    if (!availableDepartments.length || !watchedDepartment) return null;
    const found = availableDepartments.find(d => d.name === watchedDepartment);
    return found ? found.items : null;
  }, [availableDepartments, watchedDepartment]);

  // Live Age Calculation from DOB
  const calculatedAge = useMemo(() => {
    if (!watchedDob) return null;
    const birthDate = new Date(watchedDob);
    if (isNaN(birthDate.getTime())) return null;
    const diffMs = Date.now() - birthDate.getTime();
    const ageDate = new Date(diffMs);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);
    return isNaN(age) ? null : age;
  }, [watchedDob]);

  // Word count for previous works
  const previousWorksWordCount = useMemo(() => {
    const trimmed = watchedPrevWorks.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [watchedPrevWorks]);

  // Availability check on blur
  async function checkAvailability(field) {
    const cfg = AVAILABILITY[field];
    const raw = (getValues(field) || '').trim();
    const value = field === 'email' ? raw.toLowerCase() : raw;
    if (!cfg.valid(value) || lastChecked.current[field] === value) return;
    lastChecked.current[field] = value;
    setAvailable(a => ({ ...a, [field]: 'checking' }));

    const res = await api(cfg.url(value), { timeoutMs: 6000 });
    if (!res.ok) {
      setAvailable(a => ({ ...a, [field]: null }));
      lastChecked.current[field] = '';
      return;
    }
    if (res.data.available) {
      setAvailable(a => ({ ...a, [field]: 'free' }));
    } else {
      setAvailable(a => ({ ...a, [field]: 'taken' }));
      setError(field, { type: 'taken', message: cfg.taken });
    }
  }

  function availabilityProps(field) {
    const reg = register(field, {
      onChange: () => {
        if (available[field]) setAvailable(a => ({ ...a, [field]: null }));
        lastChecked.current[field] = '';
      }
    });
    return {
      ...reg,
      onBlur: async e => {
        await reg.onBlur(e);
        checkAvailability(field);
      }
    };
  }

  function statusText(field) {
    if (available[field] === 'checking') return 'Checking availability…';
    if (available[field] === 'free') return AVAILABILITY[field].free;
    return null;
  }

  const onSubmit = async values => {
    setFormError('');

    // Strict Password Confirmation Check
    if (values.password !== values.confirm_password) {
      setError('confirm_password', {
        type: 'manual',
        message: 'Password and Confirm Password do not match. Please verify.'
      });
      setFocus('confirm_password');
      return;
    }

    if (available.username === 'taken' || available.email === 'taken') {
      setFocus(available.username === 'taken' ? 'username' : 'email');
      return;
    }

    const { confirm_password: _, ...payload } = values;

    const pastArr = Array.isArray(payload.past_field_work) ? payload.past_field_work : [];
    const derivedPrevExperience = (payload.previous_works && payload.previous_works.trim())
      ? payload.previous_works.trim()
      : (pastArr.length ? (pastArr.includes('Fresher') ? 'Fresher' : pastArr.join(', ')) : 'Fresher');

    const res = await api('/api/register', {
      method: 'POST',
      body: {
        ...payload,
        aadhaarNumber: payload.aadhaarNumber || payload.aadhaar,
        aadhaar: payload.aadhaarNumber || payload.aadhaar,
        district_id: Number(payload.district_id),
        past_field_work: pastArr,
        previous_experience: derivedPrevExperience,
        previous_works: derivedPrevExperience
      }
    });

    if (res.ok && adminMode) {
  const memberName = res.data.profile?.full_name || values.full_name;

  if (onAdminSuccess) {
    onAdminSuccess(memberName);
  } else {
    navigate('/admin', {
      replace: true,
      state: { memberAdded: memberName },
    });
  }

  return;
}

    if (res.ok && res.data.session?.access_token) {
      saveToken(res.data.session.access_token);
      navigate('/register/payment', { replace: true, state: { profile: res.data.profile } });
      return;
    }

    const field = res.data?.field;
    if (field && FIELD_ORDER.includes(field) && res.data?.error) {
      setError(field, { type: 'server', message: res.data.error });
      setFocus(field);
      return;
    }

    // No response, no API at this address (404/405), or a server/proxy failure (5xx):
    // the entries aren't the problem, so don't tell the volunteer to check them
    const serverUnavailable = res.status === 0 || res.status === 404 || res.status === 405 || res.status >= 500;
    setFormError(
      serverUnavailable
        ? "We couldn't reach the TNV server, so your registration wasn't saved. Your details are still here. Please try again in a few minutes."
        : res.data?.error || 'Registration could not be completed. Please check your entries and try again.'
    );
  };

  const onInvalid = errs => {
    const first = FIELD_ORDER.find(f => errs[f]);
    if (first) setFocus(first);
  };

  return (
    <section className="bg-neutral-bg py-10 sm:py-14 antialiased">
      <div className="container-page max-w-3xl">
        <div className="text-center sm:text-left mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green/10 text-brand-green-dark mb-2">
            <svg className="w-3.5 h-3.5 text-brand-green shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Official Tamil Nadu Volunteers Portal</span>
          </span>
          <h1 className="text-2xl font-extrabold text-brand-green-dark sm:text-3xl lg:text-4xl font-display">
            {adminMode ? 'Add Member' : regType === 'institution' ? 'Institutional & Corporate Collaboration' : 'Register as Volunteer'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-muted max-w-prose">
            {adminMode ? (
              <>
                Register a volunteer on their behalf. They will appear under Pending Approval, and you stay signed in as admin.{' '}
                <Link to="/admin" className="font-semibold text-brand-green underline">Back to admin</Link>
              </>
            ) : regType === 'institution'
              ? 'Partner with Tamil Nadu Volunteers for campus chapters, CSR initiatives, disaster response and environmental programmes across all 38 districts.'
              : 'Join the statewide network of civic leaders across all 38 districts. After registering, our team will conduct a telephone interview to verify your details.'}
          </p>
        </div>

        {/* Pathway Switcher Tabs */}
        <div className={adminMode ? 'hidden' : undefined}>
        <div className="flex rounded-2xl bg-neutral-200/70 p-1.5 border border-neutral-300/80 shadow-xs mb-6">
          <button
            type="button"
            onClick={() => handleSwitchType('individual')}
            className={`flex-1 py-3 px-4 rounded-xl font-display text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              regType === 'individual'
                ? 'bg-brand-green-dark text-white shadow-sm'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <span className="text-base">👤</span>
            <span>Individual Volunteer</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchType('institution')}
            className={`flex-1 py-3 px-4 rounded-xl font-display text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              regType === 'institution'
                ? 'bg-brand-green-dark text-white shadow-sm'
                : 'text-neutral-700 hover:text-neutral-900'
            }`}
          >
            <span className="text-base">🏛️</span>
            <span>Institution / NGO Collaboration</span>
          </button>
        </div>
        </div>

        {regType === 'institution' ? (
          <InstitutionForm districts={REGISTRATION.districts} />
        ) : (
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="mt-6 space-y-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:p-8"
          onChange={() => formError && setFormError('')}
        >
          {/* 1. PERSONAL INFORMATION */}
          <Section title="1. Personal Information" subtitle="Basic details for volunteer verification and identity records">
            <FormField id="full_name" label="Full Name *" error={errors.full_name?.message} className="sm:col-span-2">
              {a => (
                <input
                  {...a}
                  type="text"
                  autoComplete="name"
                  className={inputClass(errors.full_name)}
                  {...register('full_name')}
                />
              )}
            </FormField>

            <FormField
              id="phone"
              label="Mobile Number *"
              hint="10 digits starting with 6, 7, 8 or 9. We will call this number for screening."
              error={errors.phone?.message}
            >
              {a => (
                <input
                  {...a}
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className={inputClass(errors.phone)}
                  {...register('phone')}
                />
              )}
            </FormField>

            <FormField
              id="email"
              label="Email Address *"
              hint="Your credentials, membership ID and receipts will be sent here."
              error={errors.email?.message}
              status={statusText('email')}
            >
              {a => (
                <input
                  {...a}
                  type="email"
                  autoComplete="email"
                  className={inputClass(errors.email)}
                  {...availabilityProps('email')}
                />
              )}
            </FormField>

            {/* Date of Birth with live age */}
            <FormField
              id="dob"
              label="Date of Birth"
              hint={
                calculatedAge !== null
                  ? `Calculated Age: ${calculatedAge} years ${calculatedAge >= 18 ? '(Eligible)' : '(Must be at least 18 years)'}`
                  : 'Volunteers must be 18 years or older.'
              }
              error={errors.dob?.message}
            >
              {a => (
                <input
                  {...a}
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className={inputClass(errors.dob)}
                  {...register('dob')}
                />
              )}
            </FormField>

            {/* Blood Group - MANDATORY */}
            <FormField id="blood_group" label="Blood Group *" hint="Used for district emergency blood donor network." error={errors.blood_group?.message}>
              {a => (
                <select {...a} className={inputClass(errors.blood_group)} {...register('blood_group')}>
                  <option value="">Select Blood Group</option>
                  {options.blood_groups.map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Gender */}
            <FormField id="gender" label="Gender" error={errors.gender?.message}>
              {a => (
                <select {...a} className={inputClass(errors.gender)} {...register('gender')}>
                  <option value="">Select gender</option>
                  {options.genders.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Marital Status */}
            <FormField id="marital_status" label="Marital Status" error={errors.marital_status?.message}>
              {a => (
                <select {...a} className={inputClass(errors.marital_status)} {...register('marital_status')}>
                  <option value="">Select marital status</option>
                  {options.marital_statuses.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </FormField>

          </Section>

          {/* 2. AFFILIATION & OCCUPATION */}
          <Section title="2. Affiliation & Occupation" subtitle="Your institutional background and professional status">
            {/* Affiliation Dropdown */}
            <FormField id="affiliation" label="Affiliation / Category *" error={errors.affiliation?.message}>
              {a => (
                <select {...a} className={inputClass(errors.affiliation)} {...register('affiliation')}>
                  <option value="">Select affiliation</option>
                  {options.affiliations.map(aff => (
                    <option key={aff} value={aff}>{aff}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Work / Study Status */}
            <FormField id="work_study_status" label="Work / Study Status *" error={errors.work_study_status?.message}>
              {a => (
                <select {...a} className={inputClass(errors.work_study_status)} {...register('work_study_status')}>
                  <option value="">Select work / study status</option>
                  {options.work_study_statuses.map(wss => (
                    <option key={wss} value={wss}>{wss}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Conditional Organization / Institution Name */}
            {watchedAffiliation && watchedAffiliation !== 'Individual' && (
              <FormField id="organization_name" label="Organization / Trust / College Name *" error={errors.organization_name?.message}>
                {a => (
                  <input
                    {...a}
                    type="text"
                    className={inputClass(errors.organization_name)}
                    {...register('organization_name')}
                  />
                )}
              </FormField>
            )}

            {/* Employer / College Name */}
            <FormField
              id="employer_name"
              label={watchedWorkStatus === 'Student' ? 'College / University Name' : 'Company / Workplace Name'}
              error={errors.employer_name?.message}
            >
              {a => (
                <input
                  {...a}
                  type="text"
                  className={inputClass(errors.employer_name)}
                  {...register('employer_name')}
                />
              )}
            </FormField>

            {/* Company / Work Location Area */}
            <FormField
              id="company_area"
              label="Work / College / Locality Area *"
              hint="Neighbourhood or area of your workplace, college or home."
              error={errors.company_area?.message}
            >
              {a => (
                <input
                  {...a}
                  type="text"
                  className={inputClass(errors.company_area)}
                  {...register('company_area')}
                />
              )}
            </FormField>

            {/* Occupation Dropdown */}
            <FormField id="occupation" label="Occupation / Field" error={errors.occupation?.message}>
              {a => (
                <select {...a} className={inputClass(errors.occupation)} {...register('occupation')}>
                  <option value="">Select occupation</option>
                  {options.occupations.map(occ => (
                    <option key={occ} value={occ}>{occ}</option>
                  ))}
                </select>
              )}
            </FormField>
          </Section>

          {/* 3. WHERE YOU LIVE */}
          <Section title="3. Where You Live" subtitle="Location mapping for taluk and district coordination">
            <FormField id="address" label="Street Address *" error={errors.address?.message} className="sm:col-span-2">
              {a => (
                <textarea
                  {...a}
                  rows={2}
                  autoComplete="street-address"
                  placeholder="Door No, Street Name, Locality"
                  className={inputClass(errors.address)}
                  {...register('address')}
                />
              )}
            </FormField>

            {/* Native District */}
            <FormField
              id="district_id"
              label="Native District *"
              hint="Determines your district volunteer WhatsApp chapter."
              error={errors.district_id?.message}
            >
              {a => <DistrictSelect {...a} invalid={!!errors.district_id} {...register('district_id')} />}
            </FormField>

            {/* Assembly Constituency (Dynamic based on selected district) */}
            <FormField
              id="assembly_constituency"
              label="Assembly Constituency"
              hint={watchedDistrictId ? `${availableConstituencies.length} constituencies in this district` : 'Select a district first'}
              error={errors.assembly_constituency?.message}
            >
              {a => (
                <select
                  {...a}
                  className={inputClass(errors.assembly_constituency)}
                  disabled={!watchedDistrictId || availableConstituencies.length === 0}
                  {...register('assembly_constituency')}
                >
                  <option value="">Select Constituency</option>
                  {availableConstituencies.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Panchayat / Ward */}
            <FormField id="panchayat" label="Panchayat / Town / Ward" error={errors.panchayat?.message}>
              {a => (
                <input
                  {...a}
                  type="text"
                  className={inputClass(errors.panchayat)}
                  {...register('panchayat')}
                />
              )}
            </FormField>

            {/* 6-Digit Numeric Pincode */}
            <FormField
              id="pincode"
              label="PIN Code *"
              hint="Exactly 6 digits (numbers only)."
              error={errors.pincode?.message}
            >
              {a => (
                <input
                  {...a}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={inputClass(errors.pincode)}
                  {...register('pincode', {
                    onChange: e => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    }
                  })}
                />
              )}
            </FormField>
          </Section>

          {/* 4. VOLUNTEERING PREFERENCES & WINGS */}
          <Section
            title="4. Volunteering Preferences & Wings"
            subtitle="Choose your preferred organizational wing and department"
          >
            {/* Wing Selection */}
            <FormField
              id="wing_to_join"
              label="Wing to Join *"
              hint="Select either Management or Operations wing"
              error={errors.wing_to_join?.message}
              className="sm:col-span-2"
            >
              {a => (
                <select {...a} className={inputClass(errors.wing_to_join)} {...register('wing_to_join')}>
                  <option value="">Select Wing</option>
                  {options.wings.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Department Selection (USER RULE: Only numbered headers are selectable, items are informational) */}
            <FormField
              id="department"
              label="Department *"
              hint="Select one numbered department header. Child cells are listed for reference."
              error={errors.department?.message}
              className="sm:col-span-2"
            >
              {a => (
                <select
                  {...a}
                  className={inputClass(errors.department)}
                  disabled={!watchedWing || availableDepartments.length === 0}
                  {...register('department')}
                >
                  <option value="">Select Numbered Department</option>
                  {availableDepartments.map(dept => (
                    <option key={dept.name} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Informational Sub-Items Preview Card */}
            {selectedDepartmentInfo && (
              <div className="sm:col-span-2 p-3.5 bg-brand-green-tint/40 border border-brand-green-tint rounded-xl text-xs text-brand-green-dark">
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-brand-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>This Department Encompasses the Following Focus Areas:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedDepartmentInfo.map(item => (
                    <span key={item} className="px-2 py-0.5 rounded-md bg-white border border-brand-green/20 text-neutral-800 text-[11px] font-medium shadow-2xs">
                      • {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mode of Work */}
            <FormField id="mode_of_work" label="Preferred Mode of Work *" error={errors.mode_of_work?.message}>
              {a => (
                <select {...a} className={inputClass(errors.mode_of_work)} {...register('mode_of_work')}>
                  <option value="">Select mode of work</option>
                  {options.modes_of_work.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Preferred Designation */}
            <FormField id="preferred_designation" label="Preferred Designation" error={errors.preferred_designation?.message}>
              {a => (
                <select {...a} className={inputClass(errors.preferred_designation)} {...register('preferred_designation')}>
                  <option value="">Select designation</option>
                  {options.designations.map(des => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Past Field Work Dropdown (Backend /api/options past_field_work_departments) */}
            <div className="sm:col-span-2">
              <label htmlFor="past_field_work" className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1.5 font-display flex items-center justify-between">
                <span>Past Field Work Experience * <span className="font-normal text-neutral-400 capitalize">(select all that apply)</span></span>
                <span className="text-[11px] font-semibold text-brand-green">TNV Central Registry Options</span>
              </label>
              <PastFieldWorkSelect
                departments={options.past_field_work_departments}
                value={watchedPastFieldWork}
                onChange={(next) => setValue('past_field_work', next, { shouldValidate: true, shouldDirty: true })}
                error={errors.past_field_work?.message}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                Choose &ldquo;Fresher&rdquo; if you are new to volunteering, or select the specific initiatives and focus areas you have worked on.
              </p>
            </div>

            {/* Additional Volunteering Notes (Optional) */}
            <FormField
              id="previous_works"
              label="Additional Field Work Details (Optional)"
              hint={previousWorksWordCount > 0 ? `Word count: ${previousWorksWordCount} words (max 150 words)` : "Optional: mention past organizations, NSS units, or specific campaigns."}
              error={errors.previous_works?.message}
              className="sm:col-span-2"
            >
              {a => (
                <textarea
                  {...a}
                  rows={2}
                  className={inputClass(errors.previous_works)}
                  {...register('previous_works')}
                />
              )}
            </FormField>
          </Section>

          {/* 5. IDENTITY & CREDENTIALS */}
          <Section title="5. Identity & Security" subtitle="Aadhaar verification (AES-256 encrypted) and account login setup">
            <FormField
              id="aadhaarNumber"
              label="Aadhaar Card Number *"
              hint="Stored strictly encrypted under AES-256. Masked from all public views."
              error={errors.aadhaarNumber?.message}
              className="sm:col-span-2"
            >
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.aadhaarNumber}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={12}
                  placeholder="12-digit Aadhaar card number"
                  {...register('aadhaarNumber', {
                    onChange: e => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 12);
                      e.target.value = clean;
                    }
                  })}
                />
              )}
            </FormField>

            <FormField
              id="username"
              label="Username *"
              hint="4 to 20 letters, numbers or underscores."
              error={errors.username?.message}
              status={statusText('username')}
              className="sm:col-span-2"
            >
              {a => (
                <input
                  {...a}
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  className={inputClass(errors.username)}
                  {...availabilityProps('username')}
                />
              )}
            </FormField>

            <FormField
              id="password"
              label="Password *"
              hint="At least 6 characters."
              error={errors.password?.message}
            >
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.password}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password', {
                    onChange: () => getValues('confirm_password') && clearErrors('confirm_password')
                  })}
                />
              )}
            </FormField>

            <FormField
              id="confirm_password"
              label="Confirm Password *"
              hint={
                watchedPassword && watchedConfirmPassword
                  ? watchedPassword === watchedConfirmPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'
                  : 'Re-enter your password'
              }
              error={errors.confirm_password?.message}
            >
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.confirm_password}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('confirm_password')}
                />
              )}
            </FormField>
          </Section>

          {/* Form Error Banner */}
          {formError && (
            <div role="alert" className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          {/* Footer Submit & Sign In Redirect */}
          <div className="flex flex-col gap-4 border-t border-brand-green-tint pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-muted">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-brand-green hover:underline">
                Sign in here
              </Link>
            </p>
            <button
              type="submit"
              className="btn-register gap-2 px-8 py-3.5 text-base font-bold shadow-md hover:shadow-lg transition-all"
              disabled={isSubmitting}
            >
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Verifying & Registering…' : 'Complete Volunteer Registration'}
            </button>
          </div>
        </form>
        )}
      </div>
    </section>
  );
}
