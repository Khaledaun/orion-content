#!/bin/Bash Terminal
echo "🔄 PHASE 7 ROLLBACK INITIATED"
echo "=============================="

# Get previous version
PREV_VERSION=$(node -e "
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function getPrev() {
  const versions = await prisma.rulebookVersion.findMany({
    orderBy: { version: 'desc' },
    take: 2,
    select: { version: true }
  });
  console.log(versions.length > 1 ? versions[1].version : 1);
  await prisma.\$disconnect();
}
getPrev();
")

echo "Reverting to version: $PREV_VERSION"

# Reactivate previous version (implement as needed)
echo "✅ Rollback script ready"
echo "Manual verification required for production rollback"
