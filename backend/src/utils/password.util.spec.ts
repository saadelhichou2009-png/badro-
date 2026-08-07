import { hashPassword, comparePassword, isPasswordStrong } from './password.util';

describe('password.util', () => {
  it('يجب أن يشفر كلمة المرور بشكل مختلف عن النص الأصلي', async () => {
    const hashed = await hashPassword('MyP@ssw0rd');
    expect(hashed).not.toEqual('MyP@ssw0rd');
  });

  it('يجب أن تنجح المقارنة عند إدخال كلمة المرور الصحيحة', async () => {
    const hashed = await hashPassword('MyP@ssw0rd');
    const isValid = await comparePassword('MyP@ssw0rd', hashed);
    expect(isValid).toBe(true);
  });

  it('يجب أن تفشل المقارنة عند إدخال كلمة مرور خاطئة', async () => {
    const hashed = await hashPassword('MyP@ssw0rd');
    const isValid = await comparePassword('WrongPassword', hashed);
    expect(isValid).toBe(false);
  });

  it('يرفض كلمات المرور الضعيفة', () => {
    expect(isPasswordStrong('weak')).toBe(false);
    expect(isPasswordStrong('alllowercase123')).toBe(false);
    expect(isPasswordStrong('Str0ng@Pass')).toBe(true);
  });
});
