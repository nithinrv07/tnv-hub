import { useEffect, useRef, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, USERNAME_RE, EMAIL_RE, PINCODE_RE } from '../lib/registerSchema.js';
import { api } from '../lib/api.js';
import { saveToken } from '../lib/session.js';
import FormField, { inputClass } from '../components/form/FormField.jsx';
import PasswordInput from '../components/form/PasswordInput.jsx';
import DistrictSelect from '../components/form/DistrictSelect.jsx';
import PastFieldWorkSelect from '../components/PastFieldWorkSelect.jsx';
import Spinner from '../components/Spinner.jsx';

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
    <fieldset className="grid gap-5 border-t border-brand-green-tint pt-6 sm:grid-cols-2">
      <legend className="float-left mb-1 w-full sm:col-span-2">
        <span className="block text-lg font-bold text-brand-green-dark">{title}</span>
        {subtitle && <span className="block text-xs font-normal text-neutral-500 mt-0.5">{subtitle}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

export default function Register() {
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const [available, setAvailable] = useState({ username: null, email: null });
  const lastChecked = useRef({ username: '', email: '' });

  // Backend Dynamic Options
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

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
      full_name: '', phone: '', email: '', dob: '', gender: 'Male', marital_status: 'Single',
      blood_group: '', affiliation: 'Individual', organization_name: '',
      work_study_status: 'Working', employer_name: '', company_area: '', occupation: 'Private Employee',
      address: '', district_id: '', assembly_constituency: '', panchayat: '', pincode: '',
      wing_to_join: '', department: '', mode_of_work: 'Both', preferred_designation: 'Active Member',
      past_field_work: ['Fresher'], previous_works: 'Fresher', aadhaarNumber: '', aadhaar: '', username: '', password: '', confirm_password: ''
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

  // Load backend options
  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await api('/api/options');
        if (res.ok && res.data) {
          setOptions(res.data);
        }
      } catch (err) {
        console.warn('Failed to fetch backend options:', err);
      } finally {
        setLoadingOptions(false);
      }
    }
    fetchOptions();
  }, []);

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

    setFormError(
      res.data?.error ||
      "Registration could not be completed. Please check your entries and try again."
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
            <span>Official Tamil Nadu Volunteers Enrolment</span>
          </span>
          <h1 className="text-3xl font-extrabold text-brand-green-dark sm:text-4xl font-display">
            Register as Volunteer
          </h1>
          <p className="mt-2 text-base text-neutral-muted max-w-prose">
            Join the statewide network of civic leaders across all 38 districts. After registering, our team will conduct a telephone interview to verify your details.
          </p>
        </div>

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
                  placeholder="e.g. Senthamizh Selvan S"
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
                  placeholder="98401 23456"
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
                  placeholder="name@example.com"
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
                  {(options?.blood_groups || ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Gender */}
            <FormField id="gender" label="Gender" error={errors.gender?.message}>
              {a => (
                <select {...a} className={inputClass(errors.gender)} {...register('gender')}>
                  {(options?.genders || ['Male', 'Female', 'Other']).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Marital Status */}
            <FormField id="marital_status" label="Marital Status" error={errors.marital_status?.message}>
              {a => (
                <select {...a} className={inputClass(errors.marital_status)} {...register('marital_status')}>
                  {(options?.marital_statuses || ['Single', 'Married', 'Divorced', 'Widowed']).map(m => (
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
                  {(options?.affiliations || ['Individual', 'NGO', 'Trust', 'Club', 'School', 'College', 'Association', 'Company', 'Other']).map(aff => (
                    <option key={aff} value={aff}>{aff}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Work / Study Status */}
            <FormField id="work_study_status" label="Work / Study Status *" error={errors.work_study_status?.message}>
              {a => (
                <select {...a} className={inputClass(errors.work_study_status)} {...register('work_study_status')}>
                  {(options?.work_study_statuses || ['Working', 'Student', 'Other']).map(wss => (
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
                    placeholder="e.g. Loyola College NSS / Rotary Club Central"
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
                  placeholder={watchedWorkStatus === 'Student' ? 'e.g. Madras Christian College' : 'e.g. Infosys / TCS / Self'}
                  className={inputClass(errors.employer_name)}
                  {...register('employer_name')}
                />
              )}
            </FormField>

            {/* Company / Work Location Area */}
            <FormField
              id="company_area"
              label="Work / College / Locality Area *"
              hint="Neighbourhood or industrial area (e.g. Guindy, Velachery, Anna Nagar)"
              error={errors.company_area?.message}
            >
              {a => (
                <input
                  {...a}
                  type="text"
                  placeholder="e.g. T. Nagar, Chennai"
                  className={inputClass(errors.company_area)}
                  {...register('company_area')}
                />
              )}
            </FormField>

            {/* Occupation Dropdown */}
            <FormField id="occupation" label="Occupation / Field" error={errors.occupation?.message}>
              {a => (
                <select {...a} className={inputClass(errors.occupation)} {...register('occupation')}>
                  {(options?.occupations || ['Student', 'Private Employee', 'Government Employee', 'Self-Employed', 'Business Owner', 'Other']).map(occ => (
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
                  placeholder="e.g. Ward 142 / Madambakkam"
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
                  placeholder="600028"
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
                  {(options?.wings || [
                    "Management Wing — Governance, Systems & Organizational Support",
                    "Operations Wing — Programs, Public Service & Social Impact"
                  ]).map(w => (
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
                  {(options?.modes_of_work || ['Online Volunteering', 'Field Volunteering', 'Both']).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Preferred Designation */}
            <FormField id="preferred_designation" label="Preferred Designation" error={errors.preferred_designation?.message}>
              {a => (
                <select {...a} className={inputClass(errors.preferred_designation)} {...register('preferred_designation')}>
                  {(options?.designations || ['Active Member', 'District Coordinator', 'Social Worker', 'Volunteer']).map(des => (
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
                departments={options?.past_field_work_departments || []}
                value={watchedPastFieldWork}
                onChange={(next) => setValue('past_field_work', next, { shouldValidate: true, shouldDirty: true })}
                error={errors.past_field_work?.message}
                disabled={loadingOptions}
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
                  placeholder="e.g. Led relief distribution in Cuddalore flood camps, active blood donor with Red Cross (optional)."
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
                  placeholder="e.g. senthil_tnv"
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
      </div>
    </section>
  );
}
