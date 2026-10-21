// Comprehensive validation test for Step 3 Registration with Dropdowns
const CATEGORIES = ['General', 'OBC', 'SC', 'ST', 'Minority'];
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const OCCUPATIONS = [
  'Student', 'Government Employee', 'Private Employee', 'Business Owner / Entrepreneur',
  'Farmer', 'Homemaker', 'Daily Wage Worker', 'Self-Employed', 'Unemployed', 'Retired',
  'Teacher / Professor', 'Doctor / Healthcare Worker', 'Engineer / IT Professional',
  'Social Worker / NGO Worker', 'Police / Armed Forces', 'Artist / Creative Professional',
  'Driver / Transport Worker', 'Labourer', 'Other'
];
const DESIGNATIONS = [
  'Active Member', 'General Member', 'Event Coordinator', 'Social Worker',
  'District Coordinator', 'Block Coordinator', 'District President',
  'Branch Manager', 'HR Manager', 'Member', 'Volunteer'
];

const USERNAME_REGEX = /^[A-Za-z0-9_]{4,20}$/;
const PHONE_REGEX = /^[6-9][0-9]{9}$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegistrationInput(input) {
  if (!input.full_name || input.full_name.trim().length === 0) {
    return { valid: false, field: 'full_name', error: 'Full name is required' };
  }
  if (!input.username || !USERNAME_REGEX.test(input.username)) {
    return {
      valid: false,
      field: 'username',
      error: 'Username must be 4 to 20 characters and contain only letters, numbers, or underscores',
    };
  }
  if (!input.email || !EMAIL_REGEX.test(input.email.trim())) {
    return { valid: false, field: 'email', error: 'Valid email address is required' };
  }
  const phone = input.phone ? input.phone.replace(/[\s-]/g, '') : '';
  if (!phone || !PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      field: 'phone',
      error: 'Phone number must be exactly 10 digits starting with 6, 7, 8, or 9',
    };
  }
  if (!input.password || input.password.length < 6) {
    return {
      valid: false,
      field: 'password',
      error: 'Password must be at least 6 characters long',
    };
  }
  if (input.confirm_password !== undefined && input.confirm_password !== input.password) {
    return {
      valid: false,
      field: 'confirm_password',
      error: 'Password and Confirm Password do not match',
    };
  }
  const aadhaar = input.aadhaar ? input.aadhaar.replace(/[\s-]/g, '') : '';
  if (!aadhaar || !AADHAAR_REGEX.test(aadhaar)) {
    return {
      valid: false,
      field: 'aadhaar',
      error: 'Aadhaar number must be exactly 12 digits',
    };
  }
  if (!input.dob || input.dob.trim().length === 0) {
    return { valid: false, field: 'dob', error: 'Date of birth is required' };
  }
  if (!input.gender || input.gender.trim().length === 0) {
    return { valid: false, field: 'gender', error: 'Gender is required' };
  }
  if (!GENDERS.includes(input.gender.trim())) {
    return { valid: false, field: 'gender', error: `Gender must be one of: ${GENDERS.join(', ')}` };
  }
  if (!input.marital_status || input.marital_status.trim().length === 0) {
    return { valid: false, field: 'marital_status', error: 'Marital status is required' };
  }
  if (!MARITAL_STATUSES.includes(input.marital_status.trim())) {
    return { valid: false, field: 'marital_status', error: `Marital status must be one of: ${MARITAL_STATUSES.join(', ')}` };
  }
  if (!input.father_or_husband_name || input.father_or_husband_name.trim().length === 0) {
    return { valid: false, field: 'father_or_husband_name', error: 'Father / Husband name is required' };
  }
  if (!input.category || input.category.trim().length === 0) {
    return { valid: false, field: 'category', error: 'Category is required' };
  }
  if (!CATEGORIES.includes(input.category.trim())) {
    return { valid: false, field: 'category', error: `Category must be one of: ${CATEGORIES.join(', ')}` };
  }
  if (input.blood_group && input.blood_group.trim().length > 0) {
    if (!BLOOD_GROUPS.includes(input.blood_group.trim())) {
      return { valid: false, field: 'blood_group', error: `Blood group must be one of: ${BLOOD_GROUPS.join(', ')}` };
    }
  }
  if (!input.occupation || input.occupation.trim().length === 0) {
    return { valid: false, field: 'occupation', error: 'Occupation is required' };
  }
  if (!OCCUPATIONS.includes(input.occupation.trim())) {
    return { valid: false, field: 'occupation', error: 'Please select a valid occupation' };
  }
  if (!input.address || input.address.trim().length === 0) {
    return { valid: false, field: 'address', error: 'Residential address is required' };
  }
  if (input.pincode) {
    const pin = input.pincode.replace(/\s/g, '');
    if (!PINCODE_REGEX.test(pin)) {
      return { valid: false, field: 'pincode', error: 'Pin code must be exactly 6 digits' };
    }
  }
  if (!input.district_id || typeof input.district_id !== 'number' || input.district_id <= 0) {
    return { valid: false, field: 'district_id', error: 'A valid district must be selected' };
  }
  if (input.preferred_designation && input.preferred_designation.trim().length > 0) {
    if (!DESIGNATIONS.includes(input.preferred_designation.trim())) {
      return { valid: false, field: 'preferred_designation', error: 'Please select a valid designation' };
    }
  }
  return { valid: true };
}

const baseValidInput = {
  full_name: 'Murugan Sundaram',
  username: 'murugan_tnv',
  email: 'murugan@example.com',
  phone: '9840123456',
  password: 'securePassword123',
  confirm_password: 'securePassword123',
  aadhaar: '123456789012',
  dob: '1995-05-15',
  gender: 'Male',
  marital_status: 'Married',
  father_or_husband_name: 'Sundaram K',
  category: 'OBC', // English only, no Hindi
  blood_group: 'O+',
  occupation: 'Engineer / IT Professional',
  address: '123 Anna Salai, Guindy',
  pincode: '600032',
  district_id: 3,
  preferred_designation: 'Active Member', // No fees / money mentioned
};

const testCases = [
  {
    name: 'Valid submission with clean English dropdowns',
    input: { ...baseValidInput },
    expectedValid: true,
  },
  {
    name: 'Rejects Hindi Category text: "General / सामान्य"',
    input: { ...baseValidInput, category: 'General / सामान्य' },
    expectedValid: false,
    expectedField: 'category',
  },
  {
    name: 'Rejects Designation with fee/money text: "Active Member — (Fee/शुल्क ₹599)"',
    input: { ...baseValidInput, preferred_designation: 'Active Member — (Fee/शुल्क ₹599)' },
    expectedValid: false,
    expectedField: 'preferred_designation',
  },
  {
    name: 'Rejects Invalid Blood Group: "C+"',
    input: { ...baseValidInput, blood_group: 'C+' },
    expectedValid: false,
    expectedField: 'blood_group',
  },
  {
    name: 'Accepts Optional Empty Blood Group',
    input: { ...baseValidInput, blood_group: '' },
    expectedValid: true,
  },
  {
    name: 'Accepts "Social Worker" Designation without money',
    input: { ...baseValidInput, preferred_designation: 'Social Worker' },
    expectedValid: true,
  },
  {
    name: 'Rejects Invalid Gender: "Unknown"',
    input: { ...baseValidInput, gender: 'Unknown' },
    expectedValid: false,
    expectedField: 'gender',
  },
];

console.log('--- Running Dropdown Options Validation Tests ---');
let passed = 0;
let failed = 0;

for (const tc of testCases) {
  const result = validateRegistrationInput(tc.input);
  if (result.valid === tc.expectedValid) {
    if (!tc.expectedValid && tc.expectedField && result.field !== tc.expectedField) {
      console.error(`[FAIL] ${tc.name}: expected field ${tc.expectedField}, got ${result.field}`);
      failed++;
    } else {
      console.log(`[PASS] ${tc.name} -> valid: ${result.valid}${result.error ? ' (' + result.error + ')' : ''}`);
      passed++;
    }
  } else {
    console.error(`[FAIL] ${tc.name}: expected valid=${tc.expectedValid}, got ${result.valid}`);
    failed++;
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
