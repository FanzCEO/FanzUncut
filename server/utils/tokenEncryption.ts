import crypto from 'crypto';
import { logger } from '../logger';

// Use a consistent encryption algorithm
const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const envKey = process.env.OAUTH_TOKEN_ENCRYPTION_KEY;
  
  if (envKey) {
    // Use provided key, ensuring it's the right length
    const key = Buffer.from(envKey, 'hex');
    if (key.length !== KEY_LENGTH) {
      throw new Error(`OAUTH_TOKEN_ENCRYPTION_KEY must be exactly ${KEY_LENGTH * 2} hex characters (${KEY_LENGTH} bytes)`);
    }
    return key;
  }
  
  // In development, generate a consistent key based on a seed
  // In production, this should be provided via environment variable
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OAUTH_TOKEN_ENCRYPTION_KEY environment variable is required in production');
  }
  
  // Generate deterministic key for development
  const seed = 'boyfanz-oauth-dev-key-seed';
  return crypto.pbkdf2Sync(seed, 'salt', 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypts OAuth tokens before storing in database
 * @param token - The token to encrypt (access or refresh token)
 * @returns Encrypted token as hex string or null if token is null/empty
 */
export function encryptToken(token: string | null): string | null {
  if (!token || token.trim() === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Combine IV + encrypted data
    const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
    
    return combined.toString('hex');
  } catch (error) {
    logger.error('Token encryption failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    throw new Error('Failed to encrypt OAuth token');
  }
}

/**
 * Decrypts OAuth tokens when retrieving from database
 * @param encryptedToken - The encrypted token as hex string
 * @returns Decrypted token or null if token is null/empty
 */
export function decryptToken(encryptedToken: string | null): string | null {
  if (!encryptedToken || encryptedToken.trim() === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedToken, 'hex');
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Token decryption failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    // For backward compatibility, if decryption fails, assume it's a plaintext token
    // This allows migration from plaintext to encrypted tokens
    logger.warn('Assuming plaintext token for backward compatibility', { tokenLength: encryptedToken.length });
    return encryptedToken;
  }
}

/**
 * Checks if a token appears to be encrypted (hex format with expected length)
 * @param token - Token to check
 * @returns true if token appears encrypted
 */
export function isTokenEncrypted(token: string | null): boolean {
  if (!token) return false;
  
  // Encrypted tokens will be hex strings with specific minimum length
  // IV (16) + minimum encrypted content = at least 32 hex chars
  const hexPattern = /^[0-9a-fA-F]+$/;
  return hexPattern.test(token) && token.length >= 32;
}

/**
 * Migrates a plaintext token to encrypted format
 * @param plaintextToken - The plaintext token to encrypt
 * @returns Encrypted token or null
 */
export function migrateTokenToEncrypted(plaintextToken: string | null): string | null {
  if (!plaintextToken || isTokenEncrypted(plaintextToken)) {
    return plaintextToken;
  }
  
  logger.info('Migrating plaintext token to encrypted format');
  return encryptToken(plaintextToken);
}