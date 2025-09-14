
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // TODO: Implement actual content performance data fetching
    // For now, return mock data
    const content = [
      {
        contentId: '1',
        title: 'Getting Started with AI Content Generation',
        views: Math.floor(Math.random() * 5000) + 1000,
        engagement: Math.floor(Math.random() * 40) + 60,
        shares: Math.floor(Math.random() * 200) + 50,
        comments: Math.floor(Math.random() * 50) + 10,
        conversionRate: Math.floor(Math.random() * 8) + 2,
        publishedAt: new Date('2024-01-15'),
        lastUpdated: new Date('2024-01-20'),
      },
      {
        contentId: '2',
        title: 'Advanced SEO Techniques for 2024',
        views: Math.floor(Math.random() * 4000) + 800,
        engagement: Math.floor(Math.random() * 35) + 65,
        shares: Math.floor(Math.random() * 250) + 100,
        comments: Math.floor(Math.random() * 60) + 20,
        conversionRate: Math.floor(Math.random() * 10) + 3,
        publishedAt: new Date('2024-01-10'),
        lastUpdated: new Date('2024-01-18'),
      },
      {
        contentId: '3',
        title: 'Content Marketing Automation Guide',
        views: Math.floor(Math.random() * 3000) + 600,
        engagement: Math.floor(Math.random() * 30) + 55,
        shares: Math.floor(Math.random() * 150) + 30,
        comments: Math.floor(Math.random() * 30) + 5,
        conversionRate: Math.floor(Math.random() * 6) + 2,
        publishedAt: new Date('2024-01-08'),
        lastUpdated: new Date('2024-01-15'),
      },
    ];

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Failed to get content performance:', error);
    return NextResponse.json(
      { error: 'Failed to get content performance' },
      { status: 500 }
    );
  }
}
