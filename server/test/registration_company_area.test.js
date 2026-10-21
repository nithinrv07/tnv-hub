const assert = require('assert');

// Logic to test
function calculateAge(dobStr) {
  if (!dobStr) return null;
  const birth = new Date(dobStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function countWords(str) {
  if (!str) return 0;
  return str.trim() ? str.trim().split(/\s+/).length : 0;
}

function validateEnhancedRegistration(input) {
  // 1. Father/husband name is REMOVED/OPTIONAL
  // 2. Blood group is MANDATORY
  if (!input.blood_group || input.blood_group.trim().length === 0) {
    return { valid: false, field: 'blood_group', error: 'Blood group is required' };
  }

  // 3. Company Area is MANDATORY
  if (!input.company_area || input.company_area.trim().length === 0) {
    return { valid: false, field: 'company_area', error: 'Company / Work / Residence Location Area is required' };
  }

  // 4. Previous experience: min 5 words unless 'Nil'/'None'/'NA'/'Fresher'
  const prevExp = (input.previous_experience || '').trim();
  const isNil = /^(nil|none|na|n\/a|fresher)$/i.test(prevExp);
  if (!prevExp) {
    return { valid: false, field: 'previous_experience', error: 'Previous experience is required' };
  }
  const words = countWords(prevExp);
  if (!isNil && words < 5) {
    return { valid: false, field: 'previous_experience', error: 'Please describe previous works with at least 5 words, or specify Nil' };
  }
  if (words > 150) {
    return { valid: false, field: 'previous_experience', error: 'Previous experience must not exceed 150 words' };
  }

  return { valid: true };
}

// Tests
console.log('Running Registration Form Alignment Tests...');

// Test 1: Dynamic Age calculation
const birthDate = '2000-01-15';
const age = calculateAge(birthDate);
assert(typeof age === 'number' && age >= 24, `Age should be calculated correctly, got: ${age}`);
assert.strictEqual(calculateAge(''), null);
assert.strictEqual(calculateAge(null), null);
console.log('✓ calculateAge works accurately');

// Test 2: Validation without father_or_husband_name passes
const validPayload = {
  full_name: 'Kavitha S',
  phone: '9876543210',
  email: 'kavitha@example.com',
  blood_group: 'O+',
  company_area: 'Guindy, Chennai',
  previous_experience: 'Nil'
};
const res1 = validateEnhancedRegistration(validPayload);
assert.strictEqual(res1.valid, true, 'Valid payload without father_or_husband_name must pass');
console.log('✓ father_or_husband_name is not required');

// Test 3: Missing blood_group fails
const missingBlood = { ...validPayload, blood_group: '' };
const res2 = validateEnhancedRegistration(missingBlood);
assert.strictEqual(res2.valid, false);
assert.strictEqual(res2.field, 'blood_group');
console.log('✓ blood_group is strictly required');

// Test 4: Missing company_area fails
const missingArea = { ...validPayload, company_area: '' };
const res3 = validateEnhancedRegistration(missingArea);
assert.strictEqual(res3.valid, false);
assert.strictEqual(res3.field, 'company_area');
console.log('✓ company_area is strictly required');

// Test 5: Previous works word count rules
const shortExp = { ...validPayload, previous_experience: 'Only three words' };
const res4 = validateEnhancedRegistration(shortExp);
assert.strictEqual(res4.valid, false);
assert.strictEqual(res4.field, 'previous_experience');

const detailedExp = { ...validPayload, previous_experience: 'Conducted five medical camps and distributed relief packages locally.' };
const res5 = validateEnhancedRegistration(detailedExp);
assert.strictEqual(res5.valid, true);

const naExp = { ...validPayload, previous_experience: 'Fresher' };
const res6 = validateEnhancedRegistration(naExp);
assert.strictEqual(res6.valid, true);
console.log('✓ previous_works word count validation (5 words min or Nil/Fresher) verified');

console.log('All Registration Alignment Unit Tests Passed!');
