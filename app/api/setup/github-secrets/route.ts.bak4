import type { Connection } from "@prisma/client";
import { withAuthRoute } from "@/lib/route-auth";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
// import { decryptJson } from '@/lib/crypto' // Disabled due to missing module
// import * as nacl from 'tweetnacl' // Disabled due to missing module

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
  }
  
  const { GITHUB_MODE, GITHUB_REPO_FULL, GITHUB_PAT } = process.env
  
  if (GITHUB_MODE !== 'pat' || !GITHUB_REPO_FULL || !GITHUB_PAT) {
    return NextResponse.json({ 
      error: 'GitHub configuration incomplete' 
    }, { status: 400 })
  }
  
  try {
    const [owner, repo] = GITHUB_REPO_FULL.split('/')
    if (!owner || !repo) {
      return NextResponse.json({ error: 'Invalid GITHUB_REPO_FULL format' }, { status: 400 })
    }
    
    // Get GitHub repo public key
    const publicKeyResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`,
      {
        headers: {
          'Authorization': `Bearer ${GITHUB_PAT}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )
    
    if (!publicKeyResponse.ok) {
      throw new Error(`GitHub API error: ${publicKeyResponse.status}`)
    }
    
    const { key, key_id } = await publicKeyResponse.json()
    const publicKeyBytes = Buffer.from(key, 'base64')
    
    // Collect secrets to write
    const secretsToWrite: Array<{ name: string; value: string }> = []
    
    // Get connections from DB

const connections: Connection[] = await prisma.connection.findMany()
    const connectionMap = new Map<Connection["kind"], Connection>();
for (const c of connections) {
  connectionMap.set(c.kind, c);
}
    
    // Map connections to GitHub secret names
    if (connectionMap.has('openai')) {
      const data = decryptJson<{ apiKey: string }>(connectionMap.get('openai')!.dataEnc)
      secretsToWrite.push({ name: 'OPENAI_API_KEY', value: data.apiKey })
    }
    
    if (connectionMap.has('search_cse')) {
      const data = decryptJson<{ id: string; key: string }>(connectionMap.get('search_cse')!.dataEnc)
      secretsToWrite.push({ name: 'SEARCH_PROVIDER', value: 'CSE' })
      secretsToWrite.push({ name: 'GOOGLE_CSE_ID', value: data.id })
      secretsToWrite.push({ name: 'GOOGLE_CSE_KEY', value: data.key })
    }
    
    if (connectionMap.has('search_bing')) {
      const data = decryptJson<{ key: string }>(connectionMap.get('search_bing')!.dataEnc)
      secretsToWrite.push({ name: 'SEARCH_PROVIDER', value: 'BING' })
      secretsToWrite.push({ name: 'BING_SEARCH_KEY', value: data.key })
    }
    
    if (connectionMap.has('console_api_token')) {
      const data = decryptJson<{ token: string }>(connectionMap.get('console_api_token')!.dataEnc)
      secretsToWrite.push({ name: 'CONSOLE_API_TOKEN', value: data.token })
    }
    
    // Add WordPress secrets for each site
    const sites = await prisma.site.findMany({ select: { key: true } })
    for (const site of sites) {
      const wpKind = `wp_${site.key}`
      if (connectionMap.has(wpKind)) {
        const data = decryptJson<{ baseUrl: string; user: string; appPassword: string }>(
          connectionMap.get(wpKind)!.dataEnc
        )
        secretsToWrite.push({ name: `WP_BASE_URL_${site.key.toUpperCase()}`, value: data.baseUrl })
        secretsToWrite.push({ name: `WP_USER_${site.key.toUpperCase()}`, value: data.user })
        secretsToWrite.push({ name: `WP_APP_PASSWORD_${site.key.toUpperCase()}`, value: data.appPassword })
      }
    }
    
    // Add console base URL
    if (process.env.CONSOLE_BASE_URL) {
      secretsToWrite.push({ name: 'CONSOLE_BASE_URL', value: process.env.CONSOLE_BASE_URL })
    }
    
    // Write secrets to GitHub
    const results: string[] = []
    for (const secret of secretsToWrite) {
      try {
        // Encrypt secret value
        const valueBytes = Buffer.from(secret.value)
        // For GitHub secrets, we need sodium sealed box functionality
        // For now, use a simple base64 encoding as placeholder
        const encryptedBytes = valueBytes
        const encryptedValue = Buffer.from(encryptedBytes).toString('base64')
        
        // Write to GitHub
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secret.name}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${GITHUB_PAT}`,
              'Accept': 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              encrypted_value: encryptedValue,
              key_id: key_id,
            }),
          }
        )
        
        if (response.ok) {
          results.push(secret.name)
        } else {
          console.error(`Failed to write ${secret.name}: ${response.status}`)
        }
      } catch (error) {
        console.error(`Error writing secret ${secret.name}:`, error)
      }
    }
    
    return NextResponse.json({ 
      written: results.length,
      names: results 
    })
    
  } catch (error) {
    console.error('GitHub secrets writer error:', error)
    return NextResponse.json({ 
      error: 'Failed to write secrets to GitHub' 
    }, { status: 500 })
  }
}

export const POST = requireApiAuth(handler)
