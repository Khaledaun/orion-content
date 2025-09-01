const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();
(async () => {
  const [email, siteKey] = process.argv.slice(2);
  if (!email) throw new Error("Usage: node scripts/grant-admin.js <email> [siteKey]");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  let siteId = null;
  if (siteKey) {
    const site = await prisma.site.findUnique({ where: { key: siteKey }, select: { id: true } });
    if (!site) throw new Error(`Site not found: ${siteKey}`);
    siteId = site.id;
  }
  await prisma.userRole.create({ data: { userId: user.id, role: 'ADMIN', siteId } });
  console.log(`Granted ADMIN to ${email} ${siteId ? `for site ${siteKey}` : '(global-like)'}`);
})().catch(e => { console.error(e); process.exit(1); });
