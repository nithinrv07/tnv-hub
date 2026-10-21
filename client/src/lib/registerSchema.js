import { z } from 'zod';

// Field rules from Frontend Spec 3.2
export const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Enter your full name (at least 2 characters).')
      .max(80, 'Full name can be at most 80 characters.'),
    address: z.string().trim().min(5, 'Enter your address.').max(300, 'Address can be at most 300 characters.'),
    district_id: z.string().min(1, 'Select your district.'),
    phone: z
      .string()
      .transform(v => v.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number starting with 6, 7, 8 or 9.')),
    email: z.string().trim().toLowerCase().regex(EMAIL_RE, 'Enter a valid email address, like name@example.com.'),
    aadhaar: z
      .string()
      .transform(v => v.replace(/\s/g, ''))
      .pipe(z.string().regex(/^\d{12}$/, 'Aadhaar number must be exactly 12 digits.')),
    username: z
      .string()
      .trim()
      .regex(USERNAME_RE, 'Use 4 to 20 letters, numbers or underscores (_).'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirm_password: z.string().min(1, 'Type your password again.')
  })
  .refine(d => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords don't match."
  });
