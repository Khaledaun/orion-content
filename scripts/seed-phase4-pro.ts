
import { PrismaClient, SubscriptionTier } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { DEFAULT_FEATURE_FLAGS } from '../lib/feature-flags';
import { DEFAULT_PROMPT_TEMPLATES } from '../lib/ai-prompt-engineer';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Phase 4-Pro database seed...');

  try {
    // 1. Create Feature Flags
    console.log('📋 Creating feature flags...');
    for (const flagData of DEFAULT_FEATURE_FLAGS) {
      await prisma.featureFlag.upsert({
        where: { key: flagData.key },
        update: {
          name: flagData.name,
          description: flagData.description,
          isEnabled: flagData.isEnabled,
          requiredTier: flagData.requiredTier,
          configuration: flagData.configuration
        },
        create: {
          key: flagData.key,
          name: flagData.name,
          description: flagData.description,
          isEnabled: flagData.isEnabled,
          requiredTier: flagData.requiredTier,
          configuration: flagData.configuration
        }
      });
    }
    console.log(`✅ Created/updated ${DEFAULT_FEATURE_FLAGS.length} feature flags`);

    // 2. Create Onboarding Steps
    console.log('📚 Creating onboarding steps...');
    const onboardingSteps = [
      {
        key: 'welcome',
        title: 'Welcome to Orion CMS',
        description: 'Get started with your content management journey',
        category: 'setup',
        order: 1,
        isRequired: true,
        requiredTier: SubscriptionTier.STARTER,
        configuration: {
          video: '/videos/welcome.mp4',
          duration: '2 minutes'
        }
      },
      {
        key: 'create-first-site',
        title: 'Create Your First Site',
        description: 'Set up your content site with basic information',
        category: 'setup',
        order: 2,
        isRequired: true,
        requiredTier: SubscriptionTier.STARTER,
        configuration: {
          helpText: 'Choose a descriptive name and timezone for your site'
        }
      },
      {
        key: 'configure-content-strategy',
        title: 'Configure Content Strategy',
        description: 'Define your content pillars and target audience',
        category: 'content',
        order: 3,
        isRequired: false,
        requiredTier: SubscriptionTier.STARTER,
        configuration: {
          examples: ['Blog posts', 'Tutorials', 'News articles']
        }
      },
      {
        key: 'connect-analytics',
        title: 'Connect Analytics',
        description: 'Link your Google Analytics 4 for insights',
        category: 'integration',
        order: 4,
        isRequired: false,
        requiredTier: SubscriptionTier.PRO,
        configuration: {
          benefits: ['Traffic insights', 'Audience data', 'Performance tracking']
        }
      },
      {
        key: 'connect-search-console',
        title: 'Connect Search Console',
        description: 'Link Google Search Console for SEO insights',
        category: 'integration',
        order: 5,
        isRequired: false,
        requiredTier: SubscriptionTier.PRO,
        configuration: {
          benefits: ['Keyword data', 'Click-through rates', 'Search performance']
        }
      },
      {
        key: 'setup-ai-prompts',
        title: 'Customize AI Prompts',
        description: 'Personalize AI prompts for your content style',
        category: 'content',
        order: 6,
        isRequired: false,
        requiredTier: SubscriptionTier.PRO,
        configuration: {
          defaultPrompts: ['Blog post generation', 'SEO optimization', 'Social media']
        }
      },
      {
        key: 'configure-monetization',
        title: 'Configure Monetization',
        description: 'Set up affiliate networks and product recommendations',
        category: 'integration',
        order: 7,
        isRequired: false,
        requiredTier: SubscriptionTier.GURU,
        configuration: {
          networks: ['Amazon Associates', 'Commission Junction', 'ShareASale']
        }
      }
    ];

    for (const step of onboardingSteps) {
      await prisma.onboardingStep.upsert({
        where: { key: step.key },
        update: step,
        create: step
      });
    }
    console.log(`✅ Created/updated ${onboardingSteps.length} onboarding steps`);

    // 3. Create AI Prompt Templates
    console.log('🤖 Creating AI prompt templates...');
    for (const templateData of DEFAULT_PROMPT_TEMPLATES) {
      // Check if template already exists
      const existingTemplate = await prisma.promptTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (existingTemplate) {
        await prisma.promptTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            description: templateData.description,
            category: templateData.category,
            systemPrompt: templateData.systemPrompt,
            userPromptSchema: templateData.userPromptSchema,
            roles: templateData.roles || [],
            isActive: templateData.isActive !== false,
            version: existingTemplate.version + 1
          }
        });
      } else {
        await prisma.promptTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            systemPrompt: templateData.systemPrompt,
            userPromptSchema: templateData.userPromptSchema,
            roles: templateData.roles || [],
            isActive: templateData.isActive !== false,
            isSystemManaged: true,
            version: 1
          }
        });
      }
    }
    console.log(`✅ Created/updated ${DEFAULT_PROMPT_TEMPLATES.length} AI prompt templates`);

    // 4. Create Test Users with Different Subscription Tiers
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        email: 'starter@example.com',
        password: 'starter123',
        name: 'Starter User',
        tier: SubscriptionTier.STARTER
      },
      {
        email: 'pro@example.com',
        password: 'pro123',
        name: 'Pro User',
        tier: SubscriptionTier.PRO
      },
      {
        email: 'guru@example.com',
        password: 'guru123',
        name: 'Guru User',
        tier: SubscriptionTier.GURU
      }
    ];

    for (const userData of testUsers) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          passwordHash: hashedPassword
        },
        create: {
          email: userData.email,
          name: userData.name,
          passwordHash: hashedPassword
        }
      });

      // Create subscription for user
      await prisma.userSubscription.upsert({
        where: { userId: user.id },
        update: {
          tier: userData.tier,
          features: [],
          limits: getDefaultLimitsForTier(userData.tier),
          isActive: true
        },
        create: {
          userId: user.id,
          tier: userData.tier,
          features: [],
          limits: getDefaultLimitsForTier(userData.tier),
          isActive: true
        }
      });

      // Add basic role
      const existingRole = await prisma.userRole.findFirst({
        where: {
          userId: user.id,
          siteId: null
        }
      });

      const roleToAssign = userData.tier === SubscriptionTier.GURU ? 'ADMIN' : 'EDITOR';

      if (existingRole) {
        await prisma.userRole.update({
          where: { id: existingRole.id },
          data: { role: roleToAssign }
        });
      } else {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            siteId: null,
            role: roleToAssign
          }
        });
      }

      console.log(`✅ Created test user: ${userData.email} (${userData.tier})`);
    }

    // 5. Create Demo Site with Content Strategy
    console.log('🏢 Creating demo site...');
    const demoSite = await prisma.site.upsert({
      where: { key: 'demo-phase4-pro' },
      update: {
        name: 'Phase 4-Pro Demo Site',
        timezone: 'UTC',
        publisher: 'Orion CMS Demo'
      },
      create: {
        key: 'demo-phase4-pro',
        name: 'Phase 4-Pro Demo Site',
        timezone: 'UTC',
        publisher: 'Orion CMS Demo'
      }
    });

    // Add content strategy to demo site
    await prisma.contentStrategy.upsert({
      where: { siteId: demoSite.id },
      update: {
        focusChart: {
          niches: ['Technology', 'Digital Marketing', 'Content Creation'],
          targetAudience: 'Content creators and digital marketers',
          competitiveAnalysis: 'Medium to high competition'
        },
        targetAudience: {
          demographics: ['25-45 years', 'Content creators', 'Small business owners'],
          interests: ['SEO', 'Content marketing', 'Automation tools'],
          painPoints: ['Time management', 'Content quality', 'SEO optimization']
        },
        contentPillars: [
          'SEO Optimization',
          'Content Creation',
          'Marketing Automation',
          'Analytics & Insights'
        ],
        competitorUrls: [
          'https://contentmarketinginstitute.com',
          'https://blog.hubspot.com',
          'https://moz.com/blog'
        ],
        keywords: [
          'content management',
          'SEO optimization',
          'content creation tools',
          'marketing automation'
        ],
        goals: {
          monthlyTraffic: 50000,
          conversionRate: 2.5,
          emailSignups: 1000,
          socialShares: 5000
        }
      },
      create: {
        siteId: demoSite.id,
        focusChart: {
          niches: ['Technology', 'Digital Marketing', 'Content Creation'],
          targetAudience: 'Content creators and digital marketers',
          competitiveAnalysis: 'Medium to high competition'
        },
        targetAudience: {
          demographics: ['25-45 years', 'Content creators', 'Small business owners'],
          interests: ['SEO', 'Content marketing', 'Automation tools'],
          painPoints: ['Time management', 'Content quality', 'SEO optimization']
        },
        contentPillars: [
          'SEO Optimization',
          'Content Creation',
          'Marketing Automation',
          'Analytics & Insights'
        ],
        competitorUrls: [
          'https://contentmarketinginstitute.com',
          'https://blog.hubspot.com',
          'https://moz.com/blog'
        ],
        keywords: [
          'content management',
          'SEO optimization',
          'content creation tools',
          'marketing automation'
        ],
        goals: {
          monthlyTraffic: 50000,
          conversionRate: 2.5,
          emailSignups: 1000,
          socialShares: 5000
        }
      }
    });

    console.log('✅ Created demo site with content strategy');

    // 6. Create Sample Categories and Topics
    console.log('📂 Creating sample categories and topics...');
    const categories = [
      'SEO & Optimization',
      'Content Creation',
      'Analytics & Insights',
      'Marketing Automation'
    ];

    for (const categoryName of categories) {
      const existingCategory = await prisma.category.findFirst({
        where: {
          siteId: demoSite.id,
          name: categoryName
        }
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: {
            siteId: demoSite.id,
            name: categoryName
          }
        });
      }
    }

    // Create current week
    const currentWeek = getCurrentWeek();
    const week = await prisma.week.upsert({
      where: { isoWeek: currentWeek },
      update: { status: 'PENDING' },
      create: {
        isoWeek: currentWeek,
        status: 'PENDING'
      }
    });

    console.log(`✅ Created ${categories.length} categories and current week ${currentWeek}`);

    console.log('🎉 Phase 4-Pro database seed completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('- starter@example.com / starter123 (Starter tier)');
    console.log('- pro@example.com / pro123 (Pro tier)');
    console.log('- guru@example.com / guru123 (Guru tier)');
    console.log('\n🚀 You can now start the application and test Phase 4-Pro features!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

function getDefaultLimitsForTier(tier: SubscriptionTier): Record<string, any> {
  switch (tier) {
    case SubscriptionTier.STARTER:
      return {
        maxSites: 1,
        maxDrafts: 10,
        maxPrompts: 5,
        maxSeoAudits: 1,
        storageGB: 1
      };
    case SubscriptionTier.PRO:
      return {
        maxSites: 5,
        maxDrafts: 100,
        maxPrompts: 50,
        maxSeoAudits: 10,
        storageGB: 10
      };
    case SubscriptionTier.GURU:
      return {
        maxSites: -1, // Unlimited
        maxDrafts: -1,
        maxPrompts: -1,
        maxSeoAudits: -1,
        storageGB: 100
      };
    default:
      return {};
  }
}

function getCurrentWeek(): string {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((now.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7);
  return `${now.getFullYear()}-${weekNumber.toString().padStart(2, '0')}`;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
