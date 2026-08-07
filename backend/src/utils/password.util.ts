import bcrypt from 'bcrypt';
import { env } from '../config/env';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * سياسة كلمة المرور: 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم، ورمز خاص.
 */
export function isPasswordStrong(password: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
  return regex.test(password);
}
