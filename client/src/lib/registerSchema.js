import { z } from 'zod';

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
    phone: z
      .string()
      .transform(v => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.')),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(EMAIL_RE, 'Enter a valid email address (e.g. name@example.com).'),
    dob: z.string().optional().nullable(),
    gender: z.string().optional().nullable(),
    marital_status: z.string().optional().nullable(),
    blood_group: z
      .string()
      .min(1, 'Please select your blood group.'),
    affiliation: z.string().optional().nullable(),
    organization_name: z.string().optional().nullable(),
    work_study_status: z.string().optional().nullable(),
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
    pincode: z
      .string()
      .trim()
      .refine(v => !v || PINCODE_RE.test(v), {
        message: 'PIN code must contain exactly 6 digits (numbers only).'
      })
      .optional()
      .nullable(),
    wing_to_join: z.string().optional().nullable(),
    department: z.string().optional().nullable(),
    mode_of_work: z.string().optional().nullable(),
    preferred_designation: z.string().optional().nullable(),
    past_field_work: z.array(z.string()).optional().default([]),
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
      .transform(v => (v || '').replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar card number must be exactly 12 digits (numbers only).')),
    aadhaar: z
      .string()
      .transform(v => (v || '').replace(/[\s-]/g, ''))
      .optional()
      .nullable(),
    username: z
      .string()
      .trim()
      .regex(USERNAME_RE, 'Use 4 to 20 letters, numbers or underscores (_).'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters.'),
    confirm_password: z
      .string()
      .min(1, 'Type your password again to confirm.')
  })
  .refine(d => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords do not match. Please verify both passwords."
  });
