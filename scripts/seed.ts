
import { prisma } from '../lib/prisma'
import bcrypt from 'bcrypt'

async function main() {
  console.log('Starting seed...')

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required')
  }

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  })

  if (existingAdmin) {
    console.log('Admin user already exists')
    return
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 12)
  
  const admin = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      passwordHash: hashedPassword,
    },
  })

  console.log(`Created admin user: ${admin.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
