import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('Setup secrets - received request')
    const body = await request.json()
    const { kind, data } = body

    if (!kind || !data) {
      return NextResponse.json(
        { error: 'Missing kind or data' },
        { status: 400 }
      )
    }

    console.log('Setup secrets - processing:', { kind })

    // For now, store data as JSON string in dataEnc field
    // In a real app, you would encrypt this data
    const dataStr = JSON.stringify(data)
    
    // Upsert the connection record
    const connection = await prisma.connection.upsert({
      where: {
        kind: kind,
      },
      update: {
        dataEnc: dataStr,
        updatedAt: new Date(),
      },
      create: {
        kind: kind,
        dataEnc: dataStr,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log('Setup secrets - success:', { kind, connectionId: connection.id })
    return NextResponse.json({ success: true, connectionId: connection.id })
  } catch (error) {
    console.error('Setup secrets error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
