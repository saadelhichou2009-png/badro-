import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
  if (!env.SMTP_HOST) {
    // في بيئة التطوير بدون SMTP مُعد، فقط نسجل الرسالة بدلاً من إرسالها
    logger.warn('SMTP غير مُعد - تخطي الإرسال الفعلي', { to, subject });
    return;
  }
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  } catch (err) {
    logger.error('فشل إرسال البريد الإلكتروني', { to, subject, error: (err as Error).message });
    throw err;
  }
}

export function verifyEmailTemplate(name: string, link: string): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
    <h2>مرحباً ${name} 👋</h2>
    <p>شكراً لتسجيلك في منصة تحليل حسابات التداول. الرجاء تفعيل بريدك الإلكتروني بالضغط على الرابط أدناه:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;">تفعيل البريد الإلكتروني</a>
    <p>الرابط صالح لمدة 24 ساعة.</p>
  </div>`;
}

export function resetPasswordTemplate(name: string, link: string): string {
  return `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;">
    <h2>مرحباً ${name}</h2>
    <p>تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. اضغط الرابط أدناه لإنشاء كلمة مرور جديدة:</p>
    <a href="${link}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;">إعادة تعيين كلمة المرور</a>
    <p>إن لم تطلب هذا الإجراء، تجاهل هذه الرسالة. الرابط صالح لمدة ساعة واحدة.</p>
  </div>`;
}
