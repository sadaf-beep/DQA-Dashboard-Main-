import bcrypt from 'bcryptjs';

// Existing accounts created before this change have a plaintext password
// stored in the `password` column. New/updated passwords are always stored
// as a bcrypt hash. isBcryptHash() lets callers tell the two apart so a
// legacy plaintext match can be silently upgraded to a hash on next login.

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

export const isBcryptHash = (value: string | undefined | null): boolean => {
  return !!value && BCRYPT_HASH_PATTERN.test(value);
};

export const hashPassword = async (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, 10);
};

// Verifies a plaintext password against a stored value that may be either
// a bcrypt hash (current format) or legacy plaintext (pre-migration accounts).
export const verifyPassword = async (plainPassword: string, stored: string | undefined | null): Promise<boolean> => {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plainPassword, stored);
  }
  // Legacy plaintext account: compare directly. Caller is responsible for
  // re-hashing and persisting the password after a successful legacy match.
  return plainPassword === stored;
};
