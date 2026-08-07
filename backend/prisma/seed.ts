import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@tradingplatform.local';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existing) {
    const hashedPassword = await bcrypt.hash('Admin@12345', 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });
    console.log('✅ تم إنشاء حساب المسؤول الافتراضي:', adminEmail, '(كلمة المرور: Admin@12345 - غيّرها فوراً)');
  } else {
    console.log('ℹ️ حساب المسؤول موجود مسبقاً');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
