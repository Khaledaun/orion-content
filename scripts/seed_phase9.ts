
import { PrismaClient, Role, DraftStatus, ReviewAction } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Phase 9 seed...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@orion.dev' },
    update: {},
    create: {
      email: 'test@orion.dev',
      name: 'Test User',
      passwordHash: '$2a$10$example.hash.for.testing.purposes.only',
    },
  });
  console.log('✅ Created user:', user.email);

  // Create a test site
  const site = await prisma.site.upsert({
    where: { key: 'test-site' },
    update: {},
    create: {
      key: 'test-site',
      name: 'Test Site',
      timezone: 'UTC',
      publisher: 'Test Publisher',
      locales: { default: 'en', supported: ['en', 'es'] },
    },
  });
  console.log('✅ Created site:', site.name);

  // Create user role
  const userRole = await prisma.userRole.upsert({
    where: { 
      userId_siteId: { 
        userId: user.id, 
        siteId: site.id 
      } 
    },
    update: {},
    create: {
      userId: user.id,
      role: Role.EDITOR,
      siteId: site.id,
    },
  });
  console.log('✅ Created user role:', userRole.role);

  // Create scoped token
  const scopedToken = await prisma.scopedToken.create({
    data: {
      token: 'test_token_' + Date.now(),
      siteId: site.id,
      scopes: ['read:drafts', 'write:drafts'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });
  console.log('✅ Created scoped token:', scopedToken.token);

  // Create a draft
  const draft = await prisma.draft.create({
    data: {
      siteId: site.id,
      title: 'Test Draft Article',
      content: 'This is a test draft for Phase 9 validation.',
      score: 85.5,
      status: DraftStatus.NEEDS_REVIEW,
      violations: { grammar: 2, readability: 1 },
      externalId: 'wp_123',
    },
  });
  console.log('✅ Created draft:', draft.title);

  // Create a review
  const review = await prisma.review.create({
    data: {
      draftId: draft.id,
      userId: user.id,
      action: ReviewAction.APPROVE,
      reason: 'Looks good for publication',
    },
  });
  console.log('✅ Created review:', review.action);

  // Create TenWeb site connection
  const tenWebSite = await prisma.tenWebSite.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      tenWebSiteId: 'tw_site_123',
      tenWebUrl: 'https://test.10web.io',
      status: 'active',
      lastSync: new Date(),
    },
  });
  console.log('✅ Created TenWeb site:', tenWebSite.tenWebUrl);

  // Create GSC connection
  const gscConnection = await prisma.gscConnection.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      gscSiteUrl: 'https://test-site.com/',
      credentialsEnc: 'encrypted_gsc_credentials_here',
      verified: true,
    },
  });
  console.log('✅ Created GSC connection:', gscConnection.gscSiteUrl);

  // Create GA4 connection
  const ga4Connection = await prisma.ga4Connection.upsert({
    where: { siteId: site.id },
    update: {},
    create: {
      siteId: site.id,
      propertyId: 'GA4-123456789',
      credentialsEnc: 'encrypted_ga4_credentials_here',
      verified: true,
    },
  });
  console.log('✅ Created GA4 connection:', ga4Connection.propertyId);

  // Create webhook endpoint
  const webhookEndpoint = await prisma.webhookEndpoint.create({
    data: {
      url: 'https://api.example.com/webhooks/orion',
      secret: 'webhook_secret_123',
      events: ['draft_created', 'needs_review', 'approved'],
      active: true,
    },
  });
  console.log('✅ Created webhook endpoint:', webhookEndpoint.url);

  // Create webhook delivery
  const webhookDelivery = await prisma.webhookDelivery.create({
    data: {
      endpointId: webhookEndpoint.id,
      eventType: 'draft_created',
      payload: { draftId: draft.id, title: draft.title },
      success: true,
      httpStatus: 200,
      response: 'OK',
    },
  });
  console.log('✅ Created webhook delivery:', webhookDelivery.eventType);

  // Create audit log entry
  const auditLog = await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CREATE_DRAFT',
      resource: `draft:${draft.id}`,
      details: { title: draft.title, status: draft.status },
      ipAddress: '127.0.0.1',
      userAgent: 'Orion-Seed-Script/1.0',
    },
  });
  console.log('✅ Created audit log:', auditLog.action);

  console.log('🎉 Phase 9 seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
