/**
 * Simple Forum Seeding Script
 * Creates forum categories and sample threads via the backend API
 */

const FORUM_CATEGORIES = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'New to AI? Start here! Learn the basics and get help with your first AI projects.',
    icon: '🚀',
    displayOrder: 1,
  },
  {
    name: 'AI Tools & Platforms',
    slug: 'ai-tools-platforms',
    description: 'Discuss AI tools, platforms, and services. Share reviews, comparisons, and recommendations.',
    icon: '🛠️',
    displayOrder: 2,
  },
  {
    name: 'Prompt Engineering',
    slug: 'prompt-engineering',
    description: 'Master the art of crafting effective prompts. Share techniques, templates, and best practices.',
    icon: '✍️',
    displayOrder: 3,
  },
  {
    name: 'AI for Content Creation',
    slug: 'ai-content-creation',
    description: 'Using AI for writing, video, images, and multimedia content. Share workflows and results.',
    icon: '🎨',
    displayOrder: 4,
  },
  {
    name: 'Business & Marketing',
    slug: 'business-marketing',
    description: 'Leverage AI for business growth, marketing automation, and customer engagement.',
    icon: '📈',
    displayOrder: 5,
  },
  {
    name: 'AI Development & Technical',
    slug: 'ai-development',
    description: 'For developers: APIs, models, fine-tuning, and technical implementations.',
    icon: '💻',
    displayOrder: 6,
  },
  {
    name: 'AI News & Updates',
    slug: 'ai-news',
    description: 'Latest AI announcements, model releases, and industry news. What\'s happening in AI?',
    icon: '📰',
    displayOrder: 7,
  },
  {
    name: 'Use Cases & Success Stories',
    slug: 'use-cases',
    description: 'Real-world AI applications and success stories. Share your wins and learn from others.',
    icon: '🏆',
    displayOrder: 8,
  },
  {
    name: 'AI Ethics & Future',
    slug: 'ai-ethics',
    description: 'Discuss AI ethics, safety, regulations, and the future of artificial intelligence.',
    icon: '🤔',
    displayOrder: 9,
  },
  {
    name: 'Community & General',
    slug: 'community',
    description: 'Off-topic discussions, introductions, and community announcements.',
    icon: '👥',
    displayOrder: 10,
  },
];

const SAMPLE_THREADS = [
  {
    categorySlug: 'getting-started',
    title: 'Welcome to Mike\'s AI Forge Community! 👋',
    content: `# Welcome to the Community!

We're thrilled to have you here! This is your space to learn, share, and grow with AI.

## What You'll Find Here
- **Expert guidance** on AI tools and techniques
- **Friendly community** ready to help
- **Real-world examples** and use cases
- **Latest AI news** and updates

## Getting Started
1. Introduce yourself in this thread
2. Explore our utilities and tools
3. Ask questions - no question is too basic!
4. Share your AI journey

Drop a comment below and introduce yourself! 🚀`,
    isPinned: true,
  },
  {
    categorySlug: 'getting-started',
    title: 'What AI Tool Should I Start With?',
    content: `I'm completely new to AI and feeling overwhelmed by all the options. ChatGPT, Claude, Gemini, Midjourney...

Where should a complete beginner start? What would you recommend as the first tool to learn?

Any guidance would be appreciated!`,
    isPinned: false,
  },
  {
    categorySlug: 'ai-tools-platforms',
    title: 'ChatGPT vs Claude vs Gemini: Which is Best?',
    content: `I've been testing all three major AI assistants. Here's my quick comparison:

**ChatGPT**: Great for general tasks and coding
**Claude**: Best for creative writing and analysis
**Gemini**: Good for research with real-time web access

What's your experience? Which do you prefer?`,
    isPinned: false,
  },
  {
    categorySlug: 'prompt-engineering',
    title: 'Share Your Best Prompt Templates',
    content: `Let's build a collection of proven prompt templates!

I'll start with my content creation template:
\`\`\`
Act as a [role] with expertise in [domain].
Create [output] that includes:
- [requirement 1]
- [requirement 2]
Tone: [tone]
\`\`\`

Share yours!`,
    isPinned: false,
  },
  {
    categorySlug: 'ai-content-creation',
    title: 'My AI Content Workflow (10x Faster)',
    content: `After months of experimentation, here's my workflow:

1. **Ideation** (5 mins) - ChatGPT brainstorm
2. **Research** (10 mins) - Gemini for facts
3. **Outline** (5 mins) - Claude structures it
4. **Draft** (15 mins) - AI writes, I edit
5. **Repurpose** (10 mins) - Create social posts

Total: ~1 hour vs 8-10 hours before AI!

What's your workflow?`,
    isPinned: false,
  },
];

async function seedForum() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    console.log('🌱 Starting forum seed...');

    // Create categories
    console.log('\n📁 Creating categories...');
    for (const category of FORUM_CATEGORIES) {
      const created = await prisma.forumCategory.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
      console.log(`✅ Created: ${created.name}`);
    }

    // Get admin user for authoring threads
    const adminUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (!adminUser) {
      console.error('❌ Admin user not found. Please run the main seed script first.');
      process.exit(1);
    }

    // Create sample threads
    console.log('\n💬 Creating sample threads...');
    for (const thread of SAMPLE_THREADS) {
      const category = await prisma.forumCategory.findUnique({
        where: { slug: thread.categorySlug },
      });

      if (!category) {
        console.error(`❌ Category ${thread.categorySlug} not found`);
        continue;
      }

      const created = await prisma.forumThread.create({
        data: {
          title: thread.title,
          slug: thread.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          content: thread.content,
          isPinned: thread.isPinned,
          categoryId: category.id,
          authorId: adminUser.id,
        },
      });
      console.log(`✅ Created thread: ${created.title}`);
    }

    console.log('\n✨ Forum seeding complete!');
    console.log(`   - ${FORUM_CATEGORIES.length} categories created`);
    console.log(`   - ${SAMPLE_THREADS.length} threads created`);
    console.log('\n🎉 Refresh your browser to see the new forum content!');

  } catch (error) {
    console.error('❌ Error seeding forum:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedForum();