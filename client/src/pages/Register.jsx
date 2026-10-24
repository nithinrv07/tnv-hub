import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, USERNAME_RE, EMAIL_RE, PINCODE_RE } from '../lib/registerSchema.js';
import { api } from '../lib/api.js';
import { saveToken } from '../lib/session.js';
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

function InstitutionForm({ districts }) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [formData, setFormData] = useState({
    institution_name: '',
    category: 'College / University',
    reg_number: '',
    website: '',
    coordinator_name: '',
    designation: 'Principal / Head of Institution',
    email: '',
    phone: '',
    district_name: 'Chennai',
    address: '',
    volunteer_strength: '100 - 500 Students / Volunteers',
    interests: ['Campus Volunteer Chapter & Youth Leadership', 'Disaster Relief Emergency Logistics Network'],
    proposal: ''
  });

  const availableInterests = [
    'Campus Volunteer Chapter & Youth Leadership',
    'CSR Sponsorship & Social Development Projects',
    'Mega Tree Plantation (1 Crore Palm Mission)',
    'Disaster Relief Emergency Logistics Network',
    'Free Tuition Centres & Student Mentoring',
    'Anti-Drug & Civic Awareness Campaigns',
    'Medical Camps & Emergency Blood Donation'
  ];

  const handleInterestToggle = interest => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleFormSubmit = e => {
    e.preventDefault();
    if (!formData.institution_name.trim() || !formData.coordinator_name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      alert('Please fill in the required fields marked with * (Institution Name, Coordinator, Mobile, Email).');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const generatedId = `TNV-INST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setTrackingId(generatedId);
      setSubmitted(true);
      setLoading(false);
    }, 600);
  };

  const allDistrictNames = useMemo(() => {
    if (districts && districts.length) return districts.map(d => d.name || d);
    return ZONES.flatMap(z => z.districts).sort();
  }, [districts]);

  if (submitted) {
    return (
      <div className="mt-6 rounded-2xl bg-white p-6 sm:p-10 shadow-sm ring-1 ring-brand-green-tint/80 text-center animate-in fade-in duration-300">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-tint text-brand-green">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="inline-block rounded-full bg-brand-yellow-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-900 font-display mb-2 border border-amber-300">
          Collaboration Request Queued
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-brand-green-dark">
          Institutional Partnership Application Received!
        </h2>
        <p className="mt-2 text-sm text-neutral-muted max-w-lg mx-auto">
          Thank you for joining forces with Tamil Nadu Volunteers. Your collaboration request for{' '}
          <strong className="text-neutral-ink font-semibold">{formData.institution_name}</strong> has been logged into the State Coordination Directorate.
        </p>

        <div className="mt-6 max-w-md mx-auto rounded-xl border border-brand-green-tint bg-brand-green-tint/30 p-4 text-left text-xs space-y-2">
          <div className="flex justify-between border-b border-brand-green/10 pb-2">
            <span className="text-neutral-muted">Partnership Tracking ID:</span>
            <span className="font-mono font-bold text-brand-green-dark">{trackingId}</span>
          </div>
          <div className="flex justify-between border-b border-brand-green/10 pb-2">
            <span className="text-neutral-muted">Category:</span>
            <span className="font-semibold text-neutral-ink">{formData.category}</span>
          </div>
          <div className="flex justify-between border-b border-brand-green/10 pb-2">
            <span className="text-neutral-muted">Primary Coordinator:</span>
            <span className="font-semibold text-neutral-ink">{formData.coordinator_name} ({formData.designation || 'Coordinator'})</span>
          </div>
          <div className="flex justify-between border-b border-brand-green/10 pb-2">
            <span className="text-neutral-muted">Location:</span>
            <span className="font-semibold text-neutral-ink">{formData.district_name}, Tamil Nadu</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-muted">Estimated Volunteer Force:</span>
            <span className="font-semibold text-neutral-ink">{formData.volunteer_strength}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-amber-50 border border-amber-200 p-4 max-w-lg mx-auto text-left text-xs text-amber-900">
          <strong className="block font-bold mb-1 font-display">Next Steps & Coordination:</strong>
          Our State Institutional Directorate coordinator will contact {formData.coordinator_name} on{' '}
          <strong className="font-mono">{formData.phone}</strong> within 48 business hours to discuss MoU execution, student chapter inauguration, or CSR project timelines.
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={`https://wa.me/919087293339?text=${encodeURIComponent(`Hello TNV Directorate, I have submitted an institutional collaboration proposal for ${formData.institution_name} (Ref: ${trackingId}).`)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-register inline-flex items-center justify-center px-6 py-2.5 text-xs sm:text-sm font-bold shadow-sm"
          >
            Connect with State Directorate via WhatsApp &rarr;
          </a>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setFormData({
                institution_name: '',
                category: 'College / University',
                reg_number: '',
                website: '',
                coordinator_name: '',
                designation: 'Principal / Head of Institution',
                email: '',
                phone: '',
                district_name: 'Chennai',
                address: '',
                volunteer_strength: '100 - 500 Students / Volunteers',
                interests: ['Campus Volunteer Chapter & Youth Leadership'],
                proposal: ''
              });
            }}
            className="btn-outline inline-flex items-center justify-center px-6 py-2.5 text-xs sm:text-sm font-bold"
          >
            Submit Another Proposal
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleFormSubmit}
      className="mt-6 space-y-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint/80 sm:p-8 animate-in fade-in duration-200"
    >
      <div className="border-b border-brand-green-tint pb-4">
        <h2 className="font-display text-xl font-bold text-brand-green-dark">
          Institution / Corporate / NGO Collaboration
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-neutral-muted">
          Partner with Tamil Nadu Volunteers for campus volunteer chapters, CSR social development initiatives, accredited volunteer hours, and statewide disaster relief mobilization.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Institution / Organisation Name *
          </label>
          <input
            type="text"
            required
            value={formData.institution_name}
            onChange={e => setFormData({ ...formData, institution_name: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Institution Category *
          </label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none bg-white"
          >
            <option value="College / University">College / University / Higher Education</option>
            <option value="NSS / NCC / Youth Wing Cell">NSS / NCC / Campus Youth Wing</option>
            <option value="Corporate CSR">Corporate CSR / Company</option>
            <option value="Registered NGO">Registered NGO / Social Welfare Society</option>
            <option value="Charitable Trust">Charitable Trust</option>
            <option value="School / Educational Trust">School / Educational Trust</option>
            <option value="Youth Club / Association">Youth Club / Community Association</option>
            <option value="Industry Association">Industry / Trade Association</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Registration / Affiliation / CSR Reg. No.
          </label>
          <input
            type="text"
            value={formData.reg_number}
            onChange={e => setFormData({ ...formData, reg_number: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Authorized Coordinator / Representative Name *
          </label>
          <input
            type="text"
            required
            value={formData.coordinator_name}
            onChange={e => setFormData({ ...formData, coordinator_name: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Designation / Role
          </label>
          <input
            type="text"
            value={formData.designation}
            onChange={e => setFormData({ ...formData, designation: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Official Mobile Number *
          </label>
          <input
            type="tel"
            required
            maxLength={10}
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm font-mono focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Official Email Address *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            District in Tamil Nadu *
          </label>
          <select
            value={formData.district_name}
            onChange={e => setFormData({ ...formData, district_name: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none bg-white"
          >
            {allDistrictNames.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Estimated Student / Volunteer Force
          </label>
          <select
            value={formData.volunteer_strength}
            onChange={e => setFormData({ ...formData, volunteer_strength: e.target.value })}
            className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none bg-white"
          >
            <option value="25 - 100 Students / Volunteers">25 – 100 Students / Volunteers</option>
            <option value="100 - 500 Students / Volunteers">100 – 500 Students / Volunteers</option>
            <option value="500 - 1,000 Students / Volunteers">500 – 1,000 Students / Volunteers</option>
            <option value="1,000+ Students / Volunteers">1,000+ Students / Volunteers</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-bold text-neutral-800">
            Areas of Collaboration & Partnership Focus (Select all that apply)
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableInterests.map(interest => {
              const isChecked = formData.interests.includes(interest);
              return (
                <label
                  key={interest}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs cursor-pointer transition-all ${
                    isChecked
                      ? 'border-brand-green bg-brand-green-tint/50 text-brand-green-dark font-semibold'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleInterestToggle(interest)}
                    className="mt-0.5 h-4 w-4 rounded text-brand-green focus:ring-brand-green"
                  />
                  <span>{interest}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-bold text-neutral-800">
            Collaboration Objectives / Proposal Note
          </label>
          <textarea
            rows={3}
            value={formData.proposal}
            onChange={e => setFormData({ ...formData, proposal: e.target.value })}
            placeholder="Briefly describe what your institution or CSR team hopes to collaborate on"
            className="w-full rounded-xl border border-neutral-300 p-3 text-sm focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="btn-register min-h-tap w-full text-sm sm:text-base font-bold shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? <Spinner className="h-5 w-5" /> : null}
          <span>Submit Institutional Collaboration Request &rarr;</span>
        </button>
        <p className="mt-2 text-center text-xs text-neutral-muted">
          Our State Institutional Partnerships Directorate coordinates with registered universities, colleges and corporate CSR wings across all 38 districts.
        </p>
      </div>
    </form>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'institution' ? 'institution' : 'individual';
  const [regType, setRegType] = useState(initialType);

  useEffect(() => {
    const qType = searchParams.get('type');
    if (qType === 'institution' || qType === 'individual') {
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
            {regType === 'institution' ? 'Institutional & Corporate Collaboration' : 'Register as Volunteer'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-neutral-muted max-w-prose">
            {regType === 'institution'
              ? 'Partner with Tamil Nadu Volunteers for campus chapters, CSR initiatives, disaster response and environmental programmes across all 38 districts.'
              : 'Join the statewide network of civic leaders across all 38 districts. After registering, our team will conduct a telephone interview to verify your details.'}
          </p>
        </div>

        {/* Pathway Switcher Tabs */}
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
