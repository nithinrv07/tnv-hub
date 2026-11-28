import { z } from 'zod';
import { CHENNAI_DISTRICT_ID } from '../data/chennaiZones.js';

export const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PINCODE_RE = /^\d{6}$/;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Enter your full name (at least 2 characters).')
      .max(80, 'Full name can be at most 80 characters.'),
    // Tamil Nadu, another state in India, or outside India
    residency: z.enum(['tamil_nadu', 'india', 'abroad']).default('tamil_nadu'),
    registration_type: z.enum(['volunteer', 'club']).default('volunteer'),
    country: z.string().min(1, 'Select your country.'),
    custom_country: z.string().optional().nullable(),
    nationality: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    home_district: z.string().optional().nullable(),
    city: z.string().trim().min(2, 'Enter your town or city.'),
    passport_number: z.string().optional().nullable(),
    willing_to_lead: z.string().optional().nullable(),
    // Checked below against where the volunteer lives
    phone: z
      .string()
      .transform(v => v.replace(/[\s\-()]/g, '')),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(EMAIL_RE, 'Enter a valid email address.'),
    photo_path: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    marital_status: z.string().optional().nullable(),
    blood_group: z
      .string()
      .min(1, 'Please select your blood group.'),
    affiliation: z.string().min(1, 'Select your affiliation / category.'),
    organization_name: z.string().optional().nullable(),
    work_study_status: z.string().min(1, 'Select your work / study status.'),
    employer_name: z.string().optional().nullable(),
    company_area: z.string().optional().nullable(),
    occupation: z.string().optional().nullable(),
    address: z
      .string()
      .trim()
      .min(5, 'Enter your address.')
      .max(300, 'Address can be at most 300 characters.'),
    district_id: z
      .string()
      .min(1, 'Select your native district.'),
    assembly_constituency: z.string().optional().nullable(),
    panchayat: z.string().optional().nullable(),
    pincode: z.string().trim(),
    wing_to_join: z.string().min(1, 'Select the wing you want to join.'),
    department: z.string().min(1, 'Select a department.'),
    mode_of_work: z.string().min(1, 'Select your preferred mode of work.'),
    preferred_designation: z.string().optional().nullable(),
    past_field_work: z
      .array(z.string())
      .min(1, 'Select the field work you have done, or choose Fresher.'),
    skills: z.array(z.string()).optional().default([]),
    previous_works: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine(v => {
        if (!v) return true;
        const trimmed = v.trim();
        if (/^(nil|none|na|n\/a|fresher)$/i.test(trimmed)) return true;
        const words = trimmed.split(/\s+/).filter(Boolean);
        return words.length >= 1 && words.length <= 150;
      }, {
        message: 'Previous experience can have at most 150 words.'
      }),
    aadhaarNumber: z
      .string()
      .transform(v => (v || '').replace(/[\s-]/g, '')),
    aadhaar: z
      .string()
      .transform(v => (v || '').replace(/[\s-]/g, ''))
      .optional()
      .nullable(),
    // Chennai only: Greater Chennai Corporation zone and ward
    zone: z.string().optional().nullable(),
    ward: z.string().optional().nullable(),
    // Set when the volunteer picks a registered organisation from the list
    ngo_id: z.string().optional().nullable(),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.'),
    confirm_password: z
      .string()
      .min(1, 'Type your password again to confirm.')
  })
  .superRefine((d, ctx) => {
    const abroad = d.residency === 'abroad';
    const add = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (abroad) {
      if (!/^\+[1-9]\d{6,14}$/.test(d.phone)) add('phone', 'Enter your number with the country code, for example +971501234567.');
      if (!/^[A-Za-z0-9]{6,12}$/.test((d.passport_number || '').replace(/\s/g, ''))) add('passport_number', 'Enter your passport number (6 to 12 letters and numbers).');
      if (!d.country) add('country', 'Choose the country you live in.');
      if (d.country === 'Other' && !(d.custom_country || '').trim()) add('custom_country', 'Enter the country you live in.');
      if (!d.nationality) add('nationality', 'Choose your nationality.');
      if (!/^[A-Za-z0-9 -]{3,10}$/.test(d.pincode || '')) add('pincode', 'Enter your postal code.');
    } else {
      if (!/^[6-9]\d{9}$/.test(d.phone)) add('phone', 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.');
      if (!/^\d{12}$/.test(d.aadhaarNumber || '')) add('aadhaarNumber', 'Aadhaar card number must be exactly 12 digits (numbers only).');
      if (!PINCODE_RE.test(d.pincode || '')) add('pincode', 'PIN code must contain exactly 6 digits (numbers only).');
    }
    if (d.country === 'India' && !d.state) add('state', 'Choose the state you live in.');
    if (d.residency === 'india' && !(d.home_district || '').trim()) add('home_district', 'Enter your district.');
    if (!d.willing_to_lead) add('willing_to_lead', 'Choose Yes or No.');
  })
  .refine(d => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords do not match. Please verify both passwords."
  })
  // Same conditional rules the server applies on /api/register
  .refine(d => !d.affiliation || d.affiliation === 'Individual' || (d.organization_name || '').trim(), {
    path: ['organization_name'],
    message: 'Enter the name of your organization, trust or college.'
  })
  .refine(d => !d.work_study_status || (d.company_area || '').trim(), {
    path: ['company_area'],
    message: 'Enter the area of your workplace, college or home.'
  })
  .refine(d => String(d.district_id) !== String(CHENNAI_DISTRICT_ID) || Boolean(d.zone), {
    path: ['zone'],
    message: 'Choose your Chennai Corporation zone.'
  })
  .refine(d => String(d.district_id) !== String(CHENNAI_DISTRICT_ID) || Boolean(d.ward), {
    path: ['ward'],
    message: 'Choose your ward.'
  });
