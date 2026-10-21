/**
 * TNV Hub Portal - Registration Input Validation
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Section 6.1 Step 1)
 * Forms: Personal, Demographic, Professional, Residential Address
 * 
 * Rules:
 * - Clean English options (No Hindi, No fees/money in designations)
 * - Reject with a clear message on the first failure; create nothing.
 */

import { RegisterInput } from './types.ts';
import {
  CATEGORIES,
  BLOOD_GROUPS,
  GENDERS,
  MARITAL_STATUSES,
  OCCUPATIONS,
  DESIGNATIONS,
} from './constants.ts';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

export const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;
export const PHONE_REGEX = /^[6-9][0-9]{9}$/;
export const AADHAAR_REGEX = /^[0-9]{12}$/;
export const PINCODE_REGEX = /^[0-9]{6}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates registration input fields.
 * Returns the first failing validation with a user-friendly error message.
 */
export function validateRegistrationInput(input: Partial<RegisterInput>): ValidationResult {
  // 1. Full Name
  if (!input.full_name || input.full_name.trim().length === 0) {
    return { valid: false, field: 'full_name', error: 'Full name is required' };
  }

  // 2. Username (4 to 20 letters, digits or underscore)
  if (!input.username || !USERNAME_REGEX.test(input.username)) {
    return {
      valid: false,
      field: 'username',
      error: 'Username must be 4 to 20 characters and contain only letters, numbers, or underscores',
    };
  }

  // 3. Email Address
  if (!input.email || !EMAIL_REGEX.test(input.email.trim())) {
    return { valid: false, field: 'email', error: 'Valid email address is required' };
  }

  // 4. Phone Number (10 digits starting with 6 to 9)
  const phone = input.phone ? input.phone.replace(/[\s-]/g, '') : '';
  if (!phone || !PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      field: 'phone',
      error: 'Phone number must be exactly 10 digits starting with 6, 7, 8, or 9',
    };
  }

  // 5. Password (Minimum 6 characters)
  if (!input.password || input.password.length < 6) {
    return {
      valid: false,
      field: 'password',
      error: 'Password must be at least 6 characters long',
    };
  }

  // Confirm Password check (if supplied)
  if (input.confirm_password !== undefined && input.confirm_password !== input.password) {
    return {
      valid: false,
      field: 'confirm_password',
      error: 'Password and Confirm Password do not match',
    };
  }

  // 6. Aadhaar Number (Exactly 12 digits)
  const aadhaar = input.aadhaar ? input.aadhaar.replace(/[\s-]/g, '') : '';
  if (!aadhaar || !AADHAAR_REGEX.test(aadhaar)) {
    return {
      valid: false,
      field: 'aadhaar',
      error: 'Aadhaar number must be exactly 12 digits',
    };
  }

  // 7. Date of Birth
  if (!input.dob || input.dob.trim().length === 0) {
    return { valid: false, field: 'dob', error: 'Date of birth is required' };
  }

  // 8. Gender (Dropdown check)
  if (!input.gender || input.gender.trim().length === 0) {
    return { valid: false, field: 'gender', error: 'Gender is required' };
  }
  if (!GENDERS.includes(input.gender.trim() as any)) {
    return { valid: false, field: 'gender', error: `Gender must be one of: ${GENDERS.join(', ')}` };
  }

  // 9. Marital Status (Dropdown check)
  if (!input.marital_status || input.marital_status.trim().length === 0) {
    return { valid: false, field: 'marital_status', error: 'Marital status is required' };
  }
  if (!MARITAL_STATUSES.includes(input.marital_status.trim() as any)) {
    return { valid: false, field: 'marital_status', error: `Marital status must be one of: ${MARITAL_STATUSES.join(', ')}` };
  }

  // 10. Father / Husband Name
  if (!input.father_or_husband_name || input.father_or_husband_name.trim().length === 0) {
    return { valid: false, field: 'father_or_husband_name', error: 'Father / Husband name is required' };
  }

  // 11. Category (Dropdown check - No Hindi)
  if (!input.category || input.category.trim().length === 0) {
    return { valid: false, field: 'category', error: 'Category is required' };
  }
  if (!CATEGORIES.includes(input.category.trim() as any)) {
    return { valid: false, field: 'category', error: `Category must be one of: ${CATEGORIES.join(', ')}` };
  }

  // 12. Blood Group (Optional dropdown check)
  if (input.blood_group && input.blood_group.trim().length > 0) {
    if (!BLOOD_GROUPS.includes(input.blood_group.trim() as any)) {
      return { valid: false, field: 'blood_group', error: `Blood group must be one of: ${BLOOD_GROUPS.join(', ')}` };
    }
  }

  // 13. Occupation (Dropdown check)
  if (!input.occupation || input.occupation.trim().length === 0) {
    return { valid: false, field: 'occupation', error: 'Occupation is required' };
  }
  if (!OCCUPATIONS.includes(input.occupation.trim() as any)) {
    return { valid: false, field: 'occupation', error: 'Please select a valid occupation' };
  }

  // 14. Residential Address
  if (!input.address || input.address.trim().length === 0) {
    return { valid: false, field: 'address', error: 'Residential address is required' };
  }

  // 15. Pin Code (6 digits)
  if (input.pincode) {
    const pin = input.pincode.replace(/\s/g, '');
    if (!PINCODE_REGEX.test(pin)) {
      return { valid: false, field: 'pincode', error: 'Pin code must be exactly 6 digits' };
    }
  }

  // 16. District ID (Must be positive integer from 38 districts)
  if (!input.district_id || typeof input.district_id !== 'number' || input.district_id <= 0) {
    return { valid: false, field: 'district_id', error: 'A valid district must be selected' };
  }

  // 17. Designation (Optional selection - No fee/money)
  if (input.preferred_designation && input.preferred_designation.trim().length > 0) {
    if (!DESIGNATIONS.includes(input.preferred_designation.trim() as any)) {
      return { valid: false, field: 'preferred_designation', error: 'Please select a valid designation' };
    }
  }

  return { valid: true };
}
