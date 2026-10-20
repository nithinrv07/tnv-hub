/**
 * TNV Hub Portal - Aadhaar Encryption / Decryption Module
 * 
 * Spec: TNV_Hub_Backend_Database_Spec (1).pdf (Sections 3, 6.1, 11, 12)
 * Rules:
 * - Aadhaar is stored encrypted using AES-256-GCM.
 * - Displayed masked (last 4 digits stored in aadhaar_last4).
 * - Plain number is NEVER stored in database, logged, or sent to client.
 * - Key is kept strictly in environment secrets (AADHAAR_ENCRYPTION_KEY).
 */

// Helper to convert Uint8Array to Hex string
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper to convert Hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Derives a 256-bit CryptoKey for AES-GCM from a secret string or hex key.
 */
async function getCryptoKey(secretKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  let keyBytes: Uint8Array;

  // If secret is 64 hex characters (32 bytes), decode directly; otherwise hash with SHA-256
  if (/^[0-9a-fA-F]{64}$/.test(secretKey)) {
    keyBytes = hexToBytes(secretKey);
  } else {
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secretKey));
    keyBytes = new Uint8Array(hash);
  }

  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a 12-digit Aadhaar number using AES-256-GCM.
 * Returns both the encrypted representation (IV + ciphertext) and the last 4 digits.
 * 
 * @param aadhaarPlain 12-digit Aadhaar string
 * @param secretKey 32-byte secret encryption key
 */
export async function encryptAadhaar(
  aadhaarPlain: string,
  secretKey?: string
): Promise<{ aadhaar_enc: string; aadhaar_last4: string }> {
  const keyStr = secretKey || Deno?.env?.get('AADHAAR_ENCRYPTION_KEY') || process?.env?.AADHAAR_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('AADHAAR_ENCRYPTION_KEY is not configured');
  }

  if (!/^[0-9]{12}$/.test(aadhaarPlain)) {
    throw new Error('Invalid Aadhaar number: must be exactly 12 digits');
  }

  const cryptoKey = await getCryptoKey(keyStr);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encoder = new TextEncoder();
  const encodedPlain = encoder.encode(aadhaarPlain);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    encodedPlain
  );

  const cipherBytes = new Uint8Array(cipherBuffer);
  const ivHex = bytesToHex(iv);
  const cipherHex = bytesToHex(cipherBytes);

  return {
    aadhaar_enc: `${ivHex}:${cipherHex}`,
    aadhaar_last4: aadhaarPlain.slice(-4),
  };
}

/**
 * Decrypts an encrypted Aadhaar string back to the 12-digit number.
 * Used exclusively by the Master Admin reveal_aadhaar operation.
 * 
 * @param aadhaarEnc Encrypted string in format "<ivHex>:<cipherHex>"
 * @param secretKey 32-byte secret encryption key
 */
export async function decryptAadhaar(
  aadhaarEnc: string,
  secretKey?: string
): Promise<string> {
  const keyStr = secretKey || Deno?.env?.get('AADHAAR_ENCRYPTION_KEY') || process?.env?.AADHAAR_ENCRYPTION_KEY;
  if (!keyStr) {
    throw new Error('AADHAAR_ENCRYPTION_KEY is not configured');
  }

  const parts = aadhaarEnc.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid encrypted Aadhaar format');
  }

  const [ivHex, cipherHex] = parts;
  const iv = hexToBytes(ivHex);
  const cipherBytes = hexToBytes(cipherHex);

  const cryptoKey = await getCryptoKey(keyStr);
  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    cryptoKey,
    cipherBytes
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
