import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

(async () => {
  const email = 'khaled.aun@gmail.com';
  const plain = '12341234';
  const u = await prisma.user.findUnique({ where: { email } });
  console.log('User row:', u ? { id: u.id, email: u.email, hasHash: !!u.passwordHash, hashPrefix: u.passwordHash?.slice(0,20) } : null);
  if (u?.passwordHash) {
    const ok = await bcrypt.compare(plain, u.passwordHash);
    console.log('Password compare OK?', ok);
  }
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
