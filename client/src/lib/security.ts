
// Security Utilities for Code Vortex
// Implements AES-256 encryption for credentials and SHA-256 for password hashing

const SALT_length = 16;
const IV_length = 12;

export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, password: string): Promise<string> {
  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_length));
    const iv = crypto.getRandomValues(new Uint8Array(IV_length));
    const key = await deriveKey(password, salt);
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoded
    );

    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    combined.set(salt);
    combined.set(iv, salt.length);
    combined.set(encryptedArray, salt.length + iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed", e);
    throw new Error("Encryption failed");
  }
}

export async function decryptData(encryptedData: string, password: string): Promise<string> {
  try {
    const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const salt = combined.slice(0, SALT_length);
    const iv = combined.slice(SALT_length, SALT_length + IV_length);
    const data = combined.slice(SALT_length + IV_length);

    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Invalid password or corrupted data");
  }
}

// Session management helpers
export const SESSION_KEY = 'cv_session_key';
export const MASTER_HASH_KEY = 'cv_master_hash';

export function isSessionActive(): boolean {
  const lastActive = sessionStorage.getItem('cv_last_active');
  if (!lastActive) return false;
  
  const now = Date.now();
  const diff = now - parseInt(lastActive, 10);
  // 30 minutes = 30 * 60 * 1000 = 1800000 ms
  if (diff > 1800000) {
    logout();
    return false;
  }
  
  sessionStorage.setItem('cv_last_active', now.toString());
  return true;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('cv_last_active');
  window.location.reload();
}
