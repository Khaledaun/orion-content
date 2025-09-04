import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'khaled.aun@gmail.com'
  const plain = '12341234'
  const passwordHash = await bcrypt.hash(plain, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: 'Khaled Aun' },
  })

  console.log('Seeded user:', { id: user.id, email: user.email })
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
