// Unit test for Aadhaar AES-256-GCM encryption and decryption
const crypto = require('crypto');

// Simulated AES-256-GCM using Node.js crypto to verify algorithm symmetry
function encryptAadhaar(aadhaarPlain, secretKey) {
  if (!/^[0-9]{12}$/.test(aadhaarPlain)) {
    throw new Error('Invalid Aadhaar number: must be exactly 12 digits');
  }

  const keyBytes = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(12); // 96-bit IV
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBytes, iv);

  let encrypted = cipher.update(aadhaarPlain, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    aadhaar_enc: `${iv.toString('hex')}:${encrypted}${authTag}`,
    aadhaar_last4: aadhaarPlain.slice(-4),
  };
}

function decryptAadhaar(aadhaarEnc, secretKey) {
  const parts = aadhaarEnc.split(':');
  if (parts.length !== 2) throw new Error('Invalid format');
  const iv = Buffer.from(parts[0], 'hex');
  const cipherWithTag = Buffer.from(parts[1], 'hex');

  // Last 16 bytes is GCM auth tag
  const tagLength = 16;
  const ciphertext = cipherWithTag.subarray(0, cipherWithTag.length - tagLength);
  const authTag = cipherWithTag.subarray(cipherWithTag.length - tagLength);

  const keyBytes = crypto.createHash('sha256').update(secretKey).digest();
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBytes, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, null, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const secretKey = 'tnv_super_secret_aadhaar_encryption_key_2026';
const testAadhaar = '987654321098';

console.log('--- Testing Aadhaar AES-256-GCM Encryption / Decryption ---');
const encrypted = encryptAadhaar(testAadhaar, secretKey);
console.log('Plain Aadhaar:', testAadhaar);
console.log('Encrypted Cipher (aadhaar_enc):', encrypted.aadhaar_enc);
console.log('Last 4 Digits (aadhaar_last4):', encrypted.aadhaar_last4);

if (encrypted.aadhaar_last4 !== '1098') {
  console.error('FAIL: aadhaar_last4 does not match last 4 digits');
  process.exit(1);
}

const decrypted = decryptAadhaar(encrypted.aadhaar_enc, secretKey);
console.log('Decrypted Plaintext:', decrypted);

if (decrypted !== testAadhaar) {
  console.error(`FAIL: Decrypted (${decrypted}) !== Original (${testAadhaar})`);
  process.exit(1);
}

console.log('[PASS] Aadhaar encryption & decryption verified successfully.');

// Test invalid Aadhaar error handling
try {
  encryptAadhaar('12345678901', secretKey); // 11 digits
  console.error('FAIL: 11-digit Aadhaar was not rejected');
  process.exit(1);
} catch (e) {
  console.log('[PASS] 11-digit Aadhaar properly rejected with error:', e.message);
}
