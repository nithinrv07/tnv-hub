import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, USERNAME_RE, EMAIL_RE } from '../lib/registerSchema.js';
import { api } from '../lib/api.js';
import { saveToken } from '../lib/session.js';
import FormField, { inputClass } from '../components/form/FormField.jsx';
import PasswordInput from '../components/form/PasswordInput.jsx';
import DistrictSelect from '../components/form/DistrictSelect.jsx';
import Spinner from '../components/Spinner.jsx';

const FIELD_ORDER = [
  'full_name', 'phone', 'email', 'address', 'district_id',
  'aadhaar', 'username', 'password', 'confirm_password'
];

// Availability checks for username and email, run on blur (spec 3.2)
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

function Section({ title, children }) {
  return (
    <fieldset className="grid gap-5 border-t border-brand-green-tint pt-6 sm:grid-cols-2">
      <legend className="float-left mb-1 w-full text-lg font-bold text-brand-green-dark sm:col-span-2">
        {title}
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

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setFocus,
    getValues,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
    defaultValues: {
      full_name: '', address: '', district_id: '', phone: '', email: '',
      aadhaar: '', username: '', password: '', confirm_password: ''
    }
  });

  async function checkAvailability(field) {
    const cfg = AVAILABILITY[field];
    const raw = getValues(field).trim();
    const value = field === 'email' ? raw.toLowerCase() : raw;
    if (!cfg.valid(value) || lastChecked.current[field] === value) return;
    lastChecked.current[field] = value;
    setAvailable(a => ({ ...a, [field]: 'checking' }));

    const res = await api(cfg.url(value), { timeoutMs: 6000 });
    // A failed check doesn't block the form; the server checks again on submit
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
    if (available[field] === 'checking') return 'Checking…';
    if (available[field] === 'free') return AVAILABILITY[field].free;
    return null;
  }

  const onSubmit = async values => {
    setFormError('');
    if (available.username === 'taken' || available.email === 'taken') {
      setFocus(available.username === 'taken' ? 'username' : 'email');
      return;
    }

    const { confirm_password: _, ...payload } = values;
    const res = await api('/api/register', {
      method: 'POST',
      body: { ...payload, district_id: Number(payload.district_id) }
    });

    if (res.ok && res.data.session?.access_token) {
      saveToken(res.data.session.access_token);
      navigate('/register/payment', { replace: true, state: { profile: res.data.profile } });
      return;
    }

    // Field errors from the server map onto the matching field
    const field = res.data.field;
    if (field && FIELD_ORDER.includes(field) && res.data.error) {
      setError(field, { type: 'server', message: res.data.error });
      setFocus(field);
      return;
    }

    setFormError(
      res.status === 0
        ? "We couldn't reach the server. Check your connection and try again. Your details are still here."
        : 'Registration didn’t go through. Please try again in a moment. Your details are still here.'
    );
  };

  const onInvalid = errs => {
    const first = FIELD_ORDER.find(f => errs[f]);
    if (first) setFocus(first);
  };

  return (
    <section className="bg-neutral-bg py-10 sm:py-14">
      <div className="container-page max-w-3xl">
        <h1 className="text-3xl font-bold text-brand-green-dark sm:text-4xl">Register as Volunteer</h1>
        <p className="mt-3 max-w-prose text-lg text-neutral-muted">
          Takes about five minutes. After you register, our team calls you to verify your details.
        </p>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit, onInvalid)}
          className="mt-8 space-y-8 rounded-xl bg-white p-5 shadow-sm ring-1 ring-brand-green-tint sm:p-8"
          onChange={() => formError && setFormError('')}
        >
          <Section title="About you">
            <FormField id="full_name" label="Full name" error={errors.full_name?.message} className="sm:col-span-2">
              {a => (
                <input {...a} type="text" autoComplete="name" className={inputClass(errors.full_name)} {...register('full_name')} />
              )}
            </FormField>

            <FormField
              id="phone"
              label="Mobile number"
              hint="Our team will call this number to verify you."
              error={errors.phone?.message}
            >
              {a => (
                <input
                  {...a}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={12}
                  placeholder="98400 12345"
                  className={inputClass(errors.phone)}
                  {...register('phone')}
                />
              )}
            </FormField>

            <FormField
              id="email"
              label="Email"
              hint="We send your login details and password reset links here."
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
          </Section>

          <Section title="Where you live">
            <FormField id="address" label="Address" error={errors.address?.message} className="sm:col-span-2">
              {a => (
                <textarea
                  {...a}
                  rows={3}
                  autoComplete="street-address"
                  className={inputClass(errors.address)}
                  {...register('address')}
                />
              )}
            </FormField>

            <FormField
              id="district_id"
              label="Native district"
              hint="Decides which district group you join after approval."
              error={errors.district_id?.message}
            >
              {a => <DistrictSelect {...a} invalid={!!errors.district_id} {...register('district_id')} />}
            </FormField>
          </Section>

          <Section title="Identity">
            <FormField
              id="aadhaar"
              label="Aadhaar number"
              hint="Used only to verify your identity. It is stored encrypted and shown to no one else."
              error={errors.aadhaar?.message}
            >
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.aadhaar}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={14}
                  {...register('aadhaar')}
                />
              )}
            </FormField>
          </Section>

          <Section title="Your login">
            <FormField
              id="username"
              label="Username"
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

            <FormField id="password" label="Password" hint="At least 8 characters." error={errors.password?.message}>
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.password}
                  autoComplete="new-password"
                  {...register('password', {
                    onChange: () => getValues('confirm_password') && clearErrors('confirm_password')
                  })}
                />
              )}
            </FormField>

            <FormField id="confirm_password" label="Confirm password" error={errors.confirm_password?.message}>
              {a => (
                <PasswordInput
                  {...a}
                  invalid={!!errors.confirm_password}
                  autoComplete="new-password"
                  {...register('confirm_password')}
                />
              )}
            </FormField>
          </Section>

          {formError && (
            <p role="alert" className="rounded-lg bg-[#FDECEA] px-4 py-3 font-medium text-status-no-answer">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-4 border-t border-brand-green-tint pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-neutral-muted">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-brand-green underline">
                Log in
              </Link>
            </p>
            <button type="submit" className="btn-register gap-2 px-8 text-lg" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              {isSubmitting ? 'Creating your account…' : 'Create account'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
