import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

const prisma = new PrismaClient();

const AI_TOOLS_DATA = [
  {
    id: '1',
    slug: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    summary: "Google's fast and versatile multimodal model, great for a wide range of tasks.",
    websiteUrl: 'https://deepmind.google/technologies/gemini/',
    logoUrl: 'https://picsum.photos/seed/gemini/100',
    pricingModel: 'USAGE_BASED',
    freeTier: true,
    rating: 4.8,
    verdict:
      'The best all-around model for speed and capability. Excellent for creative text generation and multimodal inputs.',
    pros: 'Extremely fast, High context window, Strong multimodal capabilities',
    cons: 'Can be less nuanced than larger models, Still in preview for some features',
    bestFor: 'Chatbots, content summarization, and quick analysis.',
    quickstart: 'Get an API key from Google AI Studio., Use the @google/genai SDK., Call `ai.models.generateContent` with your prompt.',
    categories: 'Language Models, Multimodal',
    tags: 'Google, LLM, Fast, API',
    youtubeReviewId: 'KkEMg-a_o5k',
  },
  {
    id: '2',
    slug: 'claude-3-opus',
    name: 'Claude 3 Opus',
    summary: "Anthropic's most powerful model, excelling at complex reasoning and long-context tasks.",
    websiteUrl: 'https://www.anthropic.com/news/claude-3-family',
    logoUrl: 'https://picsum.photos/seed/claude/100',
    pricingModel: 'USAGE_BASED',
    freeTier: false,
    rating: 4.9,
    verdict:
      'The top choice for tasks requiring deep reasoning, analysis of large documents, and enterprise-level reliability.',
    pros: 'Superior reasoning skills, Industry-leading context window (200K), Fewer refusals and higher accuracy',
    cons: 'Higher cost per token, Slightly slower than smaller models',
    bestFor: 'Legal document analysis, financial modeling, and research paper reviews.',
    quickstart: 'Sign up for the Claude API., Choose the `claude-3-opus-20240229` model., Structure your prompt for complex analysis.',
    categories: 'Language Models',
    tags: 'Anthropic, Reasoning, Long Context, Enterprise',
  },
  {
    id: '3',
    slug: 'midjourney',
    name: 'Midjourney',
    summary: 'A premier AI image generator known for its artistic and highly detailed outputs.',
    websiteUrl: 'https://www.midjourney.com/',
    logoUrl: 'https://picsum.photos/seed/midjourney/100',
    pricingModel: 'SUBSCRIPTION',
    freeTier: false,
    rating: 4.7,
    verdict:
      'Unmatched for creating artistic, stylistic, and professional-grade imagery. The go-to for designers and artists.',
    pros: 'Incredible artistic quality, Coherent and detailed images, Active community and frequent updates',
    cons: 'Interface is via Discord, Steep learning curve for advanced prompting',
    bestFor: 'Concept art, illustrations, and photorealistic marketing visuals.',
    quickstart: 'Join the Midjourney Discord server., Use the `/imagine` command in a newbie channel., Experiment with style and aspect ratio parameters.',
    categories: 'Image Generation',
    tags: 'Art, Design, Creative, Discord',
    youtubeReviewId: 'O5nsc3f30bU',
  },
  {
    id: '4',
    slug: 'elevenlabs',
    name: 'ElevenLabs',
    summary: 'Realistic and versatile text-to-speech (TTS) and voice cloning AI.',
    websiteUrl: 'https://elevenlabs.io/',
    logoUrl: 'https://picsum.photos/seed/elevenlabs/100',
    pricingModel: 'FREEMIUM',
    freeTier: true,
    rating: 4.8,
    verdict:
      "The industry standard for lifelike AI voices. Perfect for narration, podcasts, and character voices.",
    pros: 'Extremely realistic voices, Low-latency API, Instant voice cloning capabilities',
    cons: 'Free tier is limited, Cloning requires clear audio samples',
    bestFor: 'YouTube narration, audiobooks, and accessibility tools.',
    quickstart: 'Sign up and get a free API key., Use the Speech Synthesis endpoint to convert text., For cloning upload a 1-minute audio sample without background noise.',
    categories: 'Audio, Text-to-Speech',
    tags: 'Voice, TTS, API, Audiobook',
  },
  {
    id: '5',
    slug: 'routellm',
    name: 'RouteLLM',
    summary: 'A unified API gateway to access and benchmark hundreds of LLMs from various providers.',
    websiteUrl: 'https://abacus.ai/app/route-llm-apis',
    logoUrl: 'https://picsum.photos/seed/routellm/100',
    pricingModel: 'USAGE_BASED',
    freeTier: true,
    rating: 4.6,
    verdict:
      'An essential developer tool for abstracting away AI provider complexity and optimizing for cost and performance.',
    pros: 'Single API for many models, Automatic fallbacks and retries, Cost and latency optimization',
    cons: 'Adds a small layer of latency, Model availability depends on upstream providers',
    bestFor: 'Developers building AI-powered applications who need flexibility.',
    quickstart: 'Sign up and get a RouteLLM API key., Replace your provider-specific SDK with a simple HTTP request., Specify the model you want in the request body.',
    categories: 'Developer Tools, API',
    tags: 'LLM, Gateway, DevTool, Optimization',
  },
  {
    id: '6',
    slug: 'make-com',
    name: 'Make.com',
    summary: 'A powerful no-code automation platform to connect apps and services.',
    websiteUrl: 'https://www.make.com/',
    logoUrl: 'https://picsum.photos/seed/make/100',
    pricingModel: 'FREEMIUM',
    freeTier: true,
    rating: 4.7,
    verdict:
      'The best visual automation builder for complex, multi-step workflows without writing any code.',
    pros: 'Intuitive visual interface, Extensive library of app integrations, Powerful logic and error handling features',
    cons: 'Can get expensive with high operation counts, Some advanced features require learning',
    bestFor: 'Automating business processes, marketing funnels, and content pipelines.',
    quickstart: 'Sign up for a free account., Create a new scenario and add your first module., Connect modules by dragging and dropping.',
    categories: 'Automation, No-Code',
    tags: 'Workflow, Integration, Productivity',
    youtubeReviewId: 'L8gV83G2b4o',
  },
];

const WORKFLOWS_DATA = [
  {
    id: '1',
    slug: 'youtube-to-blog',
    name: 'YouTube Video to Blog Post',
    description:
      'Automatically transcribe a YouTube video, generate a summary with Gemini, and create a draft blog post in Google Docs.',
    services: 'YouTube, Gemini, Google Docs, Make',
    icon: 'RocketLaunchIcon',
    deploymentUrl: 'https://www.make.com/en/templates/1943-create-a-blog-post-from-a-youtube-video-using-gemini',
  },
  {
    id: '2',
    slug: 'newsletter-automation',
    name: 'AI-Powered Newsletter',
    description:
      'Summarize a list of articles using Gemini, format it into a newsletter template, and send it via Mailchimp.',
    services: 'RSS, Gemini, Mailchimp, Zapier',
    icon: 'RocketLaunchIcon',
    deploymentUrl: 'https://zapier.com/apps/gemini/integrations',
  },
  {
    id: '3',
    slug: 'social-media-content-pipeline',
    name: 'Social Media Content Pipeline',
    description:
      'Take a long-form article, generate 5 unique social media posts with Gemini, and schedule them to be posted on Twitter.',
    services: 'Web Page, Gemini, Buffer, Make',
    icon: 'RocketLaunchIcon',
    deploymentUrl: 'https://www.make.com/en/templates/1943-create-a-blog-post-from-a-youtube-video-using-gemini',
  },
  {
    id: '4',
    slug: 'customer-support-tagging',
    name: 'Automated Support Ticket Tagging',
    description:
      'When a new support ticket arrives in Zendesk, use Gemini to analyze the content and automatically apply relevant tags.',
    services: 'Zendesk, Gemini, Zapier',
    icon: 'RocketLaunchIcon',
    deploymentUrl: 'https://zapier.com/apps/gemini/integrations/zendesk',
  },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function seed() {
  try {
    logger.info('Starting database seed...');

    // --- Users ---
    const adminPassword = await bcrypt.hash('password', 12);
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        name: 'Admin User',
        role: 'ADMIN',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
      create: {
        email: 'admin@example.com',
        password: adminPassword,
        name: 'Admin User',
        role: 'ADMIN',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
    });

    const testPassword = await bcrypt.hash('password', 12);
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        name: 'Test User',
        bio: "I am a test user for Mike's AI Forge.",
        profilePictureUrl: 'https://i.pravatar.cc/150?u=1',
        role: 'USER',
        subscriptionTier: 'FREE',
        emailVerified: true,
      },
      create: {
        email: 'test@example.com',
        password: testPassword,
        name: 'Test User',
        bio: "I am a test user for Mike's AI Forge.",
        profilePictureUrl: 'https://i.pravatar.cc/150?u=1',
        role: 'USER',
        subscriptionTier: 'FREE',
        emailVerified: true,
      },
    });

    // Additional sample users for forum posts
    const alicePassword = await bcrypt.hash('password', 12);
    const aliceUser = await prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {
        name: 'Alice Contributor',
        bio: 'Designer and prompt engineer.',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=alice',
        role: 'USER',
        subscriptionTier: 'FREE',
        emailVerified: true,
      },
      create: {
        email: 'alice@example.com',
        password: alicePassword,
        name: 'Alice Contributor',
        bio: 'Designer and prompt engineer.',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=alice',
        role: 'USER',
        subscriptionTier: 'FREE',
        emailVerified: true,
      },
    });

    const bobPassword = await bcrypt.hash('password', 12);
    const bobUser = await prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {
        name: 'Bob Tester',
        bio: 'Developer and integrations specialist.',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=bob',
        role: 'USER',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
      create: {
        email: 'bob@example.com',
        password: bobPassword,
        name: 'Bob Tester',
        bio: 'Developer and integrations specialist.',
        profilePictureUrl: 'https://i.pravatar.cc/150?u=bob',
        role: 'USER',
        subscriptionTier: 'PRO',
        emailVerified: true,
      },
    });

    logger.info('Users upserted.');

    // --- Tools ---
    for (const tool of AI_TOOLS_DATA) {
      const { id, ...toolData } = tool;
      await prisma.tool.upsert({
        where: { slug: tool.slug },
        update: toolData,
        create: {
          id,
          ...toolData,
        },
      });
    }
    logger.info('AI tools seeded.');

    // --- Workflows ---
    for (const workflow of WORKFLOWS_DATA) {
      const { id, deploymentUrl, ...workflowData } = workflow;
      await prisma.workflow.upsert({
        where: { slug: workflow.slug },
        update: {
          ...workflowData,
          deploymentUrl: deploymentUrl ?? null,
        },
        create: {
          id,
          ...workflowData,
          deploymentUrl: deploymentUrl ?? null,
        },
      });
    }
    logger.info('Workflows seeded.');

    // --- Forum Categories ---
    const FORUM_CATEGORIES = [
      {
        name: 'General Discussion',
        slug: 'general-discussion',
        description: 'Talk about anything related to AI Forge, tools, workflows, and best practices.',
        icon: '💬',
        displayOrder: 1,
      },
      {
        name: 'Tool Reviews',
        slug: 'tool-reviews',
        description: 'Share your experiences, reviews, and tips for AI tools and services.',
        icon: '⭐',
        displayOrder: 2,
      },
      {
        name: 'Workflow Sharing',
        slug: 'workflow-sharing',
        description: 'Share and discuss workflows, automations, and integrations.',
        icon: '🔁',
        displayOrder: 3,
      },
      {
        name: 'Feature Requests',
        slug: 'feature-requests',
        description: 'Request new features, improvements, or integrations for the platform.',
        icon: '🚀',
        displayOrder: 4,
      },
      {
        name: 'Help & Support',
        slug: 'help-support',
        description: 'Get help, ask questions, and troubleshoot issues with the community.',
        icon: '🛠️',
        displayOrder: 5,
      },
      {
        name: 'Showcase',
        slug: 'showcase',
        description: 'Show off projects, demos, and impressive results created with AI Forge tools.',
        icon: '🏆',
        displayOrder: 6,
      },
    ];

    const categoryRecords: Record<string, any> = {};
    for (const cat of FORUM_CATEGORIES) {
      const rec = await prisma.forumCategory.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          description: cat.description,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
        },
        create: {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          displayOrder: cat.displayOrder,
        },
      });
      categoryRecords[cat.slug] = rec;
    }
    logger.info('Forum categories seeded.');

    // --- Sample Forum Threads ---
    const SAMPLE_THREADS = [
      {
        title: 'Welcome to the Community! Introduce yourself 👋',
        slug: 'welcome-to-the-community-introduce-yourself',
        content:
          "Welcome to the AI Forge community! Share a little about yourself — what you build, your favorite AI tool, or something you're learning. Let's make this space helpful and kind.",
        categorySlug: 'general-discussion',
        authorEmail: 'admin@example.com',
        createdAt: daysAgo(14),
        lastActivityAt: daysAgo(2),
        isPinned: true,
        isLocked: false,
      },
      {
        title: 'Best tools for transcribing long videos?',
        slug: 'best-tools-for-transcribing-long-videos',
        content:
          'I have long-form lectures (2+ hours) that I want to transcribe and summarize. What tools or workflows do you recommend that balance cost and accuracy?',
        categorySlug: 'tool-reviews',
        authorEmail: 'alice@example.com',
        createdAt: daysAgo(10),
        lastActivityAt: daysAgo(4),
        isPinned: false,
        isLocked: false,
      },
      {
        title: 'Share your favorite Make.com scenarios for content',
        slug: 'share-your-favorite-make-scenarios-for-content',
        content:
          'I\'m looking to build a pipeline that ingests a YouTube video, transcribes it, creates chapters, and drafts a blog post automatically. Show me your scenarios and tips!',
        categorySlug: 'workflow-sharing',
        authorEmail: 'bob@example.com',
        createdAt: daysAgo(7),
        lastActivityAt: daysAgo(1),
        isPinned: false,
        isLocked: false,
      },
      {
        title: 'Feature request: Bulk import tools via CSV',
        slug: 'feature-request-bulk-import-tools-via-csv',
        content:
          'It would be great to allow admins to bulk import tools and workflows via CSV/JSON to speed up population of the directory. Any thoughts or additional fields we should include?',
        categorySlug: 'feature-requests',
        authorEmail: 'test@example.com',
        createdAt: daysAgo(20),
        lastActivityAt: daysAgo(5),
        isPinned: false,
        isLocked: false,
      },
    ];

    const threadRecords: Record<string, any> = {};
    for (const t of SAMPLE_THREADS) {
      // resolve author
      const author = await prisma.user.findUnique({ where: { email: t.authorEmail } });
      if (!author) {
        logger.warn(`Author with email ${t.authorEmail} not found, defaulting to admin`);
      }
      const category = categoryRecords[t.categorySlug];
      if (!category) {
        logger.warn(`Category ${t.categorySlug} not found, skipping thread ${t.title}`);
        continue;
      }

      const rec = await prisma.forumThread.upsert({
        where: { slug: t.slug },
        update: {
          title: t.title,
          content: t.content,
          isPinned: t.isPinned ?? false,
          isLocked: t.isLocked ?? false,
          lastActivityAt: t.lastActivityAt ?? new Date(),
          updatedAt: new Date(),
        },
        create: {
          title: t.title,
          slug: t.slug,
          content: t.content,
          categoryId: category.id,
          authorId: (author && author.id) || adminUser.id,
          isPinned: t.isPinned ?? false,
          isLocked: t.isLocked ?? false,
          viewCount: Math.floor(Math.random() * 200),
          replyCount: 0,
          createdAt: t.createdAt ?? new Date(),
          lastActivityAt: t.lastActivityAt ?? t.createdAt ?? new Date(),
        },
      });

      threadRecords[t.slug] = rec;
    }
    logger.info('Sample forum threads seeded.');

    // --- Sample Forum Posts (replies) ---
    const SAMPLE_POSTS = [
      {
        threadSlug: 'welcome-to-the-community-introduce-yourself',
        authorEmail: 'alice@example.com',
        content:
          "Hi everyone! I'm Alice — designer and prompt engineer. I mainly work on marketing assets and image prompts. Excited to learn from you all!",
        createdAt: daysAgo(13),
      },
      {
        threadSlug: 'welcome-to-the-community-introduce-yourself',
        authorEmail: 'bob@example.com',
        content:
          "Hey! Bob here. I integrate tools and build automation. Happy to help with Make.com and Zapier questions.",
        createdAt: daysAgo(12),
      },
      {
        threadSlug: 'best-tools-for-transcribing-long-videos',
        authorEmail: 'admin@example.com',
        content:
          "For long videos I usually chunk them into 15-20 minute segments, run a high-accuracy transcription model (like Whisper or ElevenLabs transcription), then stitch and summarize with an LLM. Cost-wise, batching and lower sampling rates help.",
        createdAt: daysAgo(9),
      },
      {
        threadSlug: 'share-your-favorite-make-scenarios-for-content',
        authorEmail: 'alice@example.com',
        content:
          "I have a scenario where a webhook triggers a YouTube download, then a transcription step, then Gemini creates a draft. I add a QA step to check for profanity and then push to Google Docs.",
        createdAt: daysAgo(6),
      },
      {
        threadSlug: 'feature-request-bulk-import-tools-via-csv',
        authorEmail: 'bob@example.com',
        content:
          "Bulk import would be fantastic. I'd suggest supporting fields for name, slug, websiteUrl, categories (comma-separated), and an optional imageUrl.",
        createdAt: daysAgo(19),
      },
      {
        threadSlug: 'best-tools-for-transcribing-long-videos',
        authorEmail: 'test@example.com',
        content:
          "You might also try RouteLLM as a gateway to compare providers and pick the most cost-effective transcription model programmatically.",
        createdAt: daysAgo(8),
      },
    ];

    for (const p of SAMPLE_POSTS) {
      const thread = threadRecords[p.threadSlug];
      if (!thread) {
        logger.warn(`Thread ${p.threadSlug} not found for post, skipping.`);
        continue;
      }
      const author = await prisma.user.findUnique({ where: { email: p.authorEmail } });
      const createdAuthorId = (author && author.id) || adminUser.id;

      await prisma.forumPost.create({
        data: {
          threadId: thread.id,
          content: p.content,
          authorId: createdAuthorId,
          isEdited: false,
          createdAt: p.createdAt ?? new Date(),
        },
      });

      // update thread replyCount and lastActivityAt
      await prisma.forumThread.update({
        where: { id: thread.id },
        data: {
          replyCount: { increment: 1 } as any, // Prisma types may require explicit cast for increment
          lastActivityAt: p.createdAt ?? new Date(),
        },
      });
    }
    logger.info('Sample forum posts seeded.');

    // --- News Articles ---
    const NEWS_CATEGORIES = ['AI Tools', 'Industry News', 'Tutorials', 'Product Updates', 'Research'];

    // Generate a list of sample news articles
    const SAMPLE_NEWS = [
      {
        title: 'Gemini 2.5 Flash: Faster Multimodal Model Released',
        slug: 'gemini-2-5-flash-faster-multimodal-model',
        summary:
          'Google releases Gemini 2.5 Flash, bringing lower latency and improved multimodal performance for creative tasks.',
        content:
          'Gemini 2.5 Flash is designed to offer a balance between speed and capability. Early benchmarks show strong performance on summarization and image understanding tasks. Developers can access it via Google AI Studio.',
        imageUrl: 'https://picsum.photos/seed/news1/800/450',
        source: 'Google AI Blog',
        sourceUrl: 'https://ai.googleblog.com/',
        category: 'AI Tools',
        tags: ['Google', 'Gemini', 'Multimodal'],
        publishedAt: daysAgo(2),
        isFeatured: true,
      },
      {
        title: 'Startups Embrace Multimodal Workflows for Content',
        slug: 'startups-embrace-multimodal-workflows',
        summary:
          'An increasing number of startups are combining video, audio, and text models to build holistic content pipelines.',
        content:
          'From automated podcast production to video summarization, multimodal approaches are enabling teams to repurpose content efficiently. Investors are taking notice.',
        imageUrl: 'https://picsum.photos/seed/news2/800/450',
        source: 'TechCrunch',
        sourceUrl: 'https://techcrunch.com/',
        category: 'Industry News',
        tags: ['Startups', 'Multimodal', 'Content'],
        publishedAt: daysAgo(5),
        isFeatured: false,
      },
      {
        title: 'Tutorial: Building a YouTube-to-Blog Pipeline with Make.com',
        slug: 'tutorial-building-youtube-to-blog-pipeline',
        summary:
          'Step-by-step guide to transcribing videos, generating summaries with LLMs, and publishing drafts to Google Docs.',
        content:
          'This tutorial walks you through setting up webhooks, using a transcription service, and calling an LLM to generate SEO-friendly blog drafts. Includes example scenarios and tips for error handling.',
        imageUrl: 'https://picsum.photos/seed/news3/800/450',
        source: 'AI Forge Tutorials',
        sourceUrl: 'https://example.com/tutorials/youtube-to-blog',
        category: 'Tutorials',
        tags: ['Make', 'Tutorial', 'Workflow'],
        publishedAt: daysAgo(8),
        isFeatured: false,
      },
      {
        title: 'ElevenLabs Improves TTS Naturalness with New Voices',
        slug: 'elevenlabs-improves-tts-naturalness',
        summary:
          'ElevenLabs continues to push TTS quality forward with more expressive and natural-sounding voices.',
        content:
          'The new voice models provide better prosody and expressiveness. Use cases include audiobooks, narration, and accessibility tools.',
        imageUrl: 'https://picsum.photos/seed/news4/800/450',
        source: 'ElevenLabs Blog',
        sourceUrl: 'https://elevenlabs.io/blog',
        category: 'Product Updates',
        tags: ['ElevenLabs', 'TTS', 'Voice'],
        publishedAt: daysAgo(3),
        isFeatured: true,
      },
      {
        title: 'Research: New Techniques for Low-Resource Fine-Tuning',
        slug: 'research-new-techniques-low-resource-fine-tuning',
        summary:
          'Researchers propose efficient fine-tuning methods that reduce compute requirements while maintaining performance.',
        content:
          'Low-resource fine-tuning approaches make it feasible to adapt large models on smaller budgets. This has implications for smaller companies and researchers.',
        imageUrl: 'https://picsum.photos/seed/news5/800/450',
        source: 'ArXiv',
        sourceUrl: 'https://arxiv.org/',
        category: 'Research',
        tags: ['Research', 'Fine-Tuning', 'Efficiency'],
        publishedAt: daysAgo(12),
        isFeatured: false,
      },
      {
        title: 'RouteLLM Adds Provider Monitoring Dashboard',
        slug: 'routellm-adds-provider-monitoring-dashboard',
        summary:
          'RouteLLM introduces a dashboard to monitor provider latencies and failures in real-time.',
        content:
          'The dashboard helps developers choose fallback strategies and manage costs by surfacing provider performance metrics.',
        imageUrl: 'https://picsum.photos/seed/news6/800/450',
        source: 'RouteLLM Announcements',
        sourceUrl: 'https://example.com/routellm/blog',
        category: 'Product Updates',
        tags: ['RouteLLM', 'Monitoring', 'DevTools'],
        publishedAt: daysAgo(6),
        isFeatured: false,
      },
      {
        title: 'How to Choose the Right Transcription Model',
        slug: 'how-to-choose-the-right-transcription-model',
        summary:
          'A practical guide comparing accuracy, cost, and latency for popular transcription models.',
        content:
          'Choosing the right transcription model depends on audio quality, budget, and desired accuracy. This guide provides benchmarks and recommendations.',
        imageUrl: 'https://picsum.photos/seed/news7/800/450',
        source: 'AI Forge Insights',
        sourceUrl: 'https://example.com/insights/transcription-guide',
        category: 'Tutorials',
        tags: ['Transcription', 'Guide', 'Accuracy'],
        publishedAt: daysAgo(9),
        isFeatured: false,
      },
      {
        title: 'Startup Spotlight: Automating Content at Scale',
        slug: 'startup-spotlight-automating-content-at-scale',
        summary:
          'A deep dive into a startup that built an automated content engine using multimodal AI services.',
        content:
          'The spotlight covers architecture, growth metrics, and lessons learned while scaling automated content pipelines.',
        imageUrl: 'https://picsum.photos/seed/news8/800/450',
        source: 'VentureBeat',
        sourceUrl: 'https://venturebeat.com/',
        category: 'Industry News',
        tags: ['Startup', 'Automation', 'Case Study'],
        publishedAt: daysAgo(15),
        isFeatured: false,
      },
      {
        title: 'Integrating Whisper for High-Quality Transcriptions',
        slug: 'integrating-whisper-for-high-quality-transcriptions',
        summary:
          'Practical tips for integrating Whisper-style models in content pipelines for greater accuracy.',
        content:
          'This article covers batching strategies, chunking, and post-processing to get cleaner transcripts from Whisper-based models.',
        imageUrl: 'https://picsum.photos/seed/news9/800/450',
        source: 'OpenAI Blog',
        sourceUrl: 'https://openai.com/blog',
        category: 'Tutorials',
        tags: ['Whisper', 'Transcription', 'Integration'],
        publishedAt: daysAgo(4),
        isFeatured: false,
      },
      {
        title: 'Weekly Roundup: Top AI Tools and Releases',
        slug: 'weekly-roundup-top-ai-tools-and-releases',
        summary:
          'This week: new TTS voices, model performance updates, and several useful open-source releases.',
        content:
          'The roundup highlights notable releases and provides quick links to get started with each tool.',
        imageUrl: 'https://picsum.photos/seed/news10/800/450',
        source: 'AI Forge Weekly',
        sourceUrl: 'https://example.com/weekly',
        category: 'Industry News',
        tags: ['Roundup', 'Weekly', 'Tools'],
        publishedAt: daysAgo(1),
        isFeatured: true,
      },
      {
        title: 'Case Study: Republishing Video Content as SEO Articles',
        slug: 'case-study-republishing-video-content-as-seo-articles',
        summary:
          'A case study showing traffic gains after converting long-form videos into SEO-optimized articles.',
        content:
          'The case study includes before/after analytics, the content pipeline, and tips for maximizing search performance.',
        imageUrl: 'https://picsum.photos/seed/news11/800/450',
        source: 'AI Marketing Lab',
        sourceUrl: 'https://example.com/ai-marketing',
        category: 'Research',
        tags: ['SEO', 'Case Study', 'Content'],
        publishedAt: daysAgo(11),
        isFeatured: false,
      },
      {
        title: 'New Open-Source Tools for Prompt Engineering',
        slug: 'new-open-source-tools-for-prompt-engineering',
        summary:
          'A curated list of OSS tools that simplify experiment tracking and prompt versioning.',
        content:
          'These open-source utilities help track prompt variations, inputs, and outputs to iterate more quickly on prompts.',
        imageUrl: 'https://picsum.photos/seed/news12/800/450',
        source: 'GitHub Sponsors',
        sourceUrl: 'https://github.com/',
        category: 'Research',
        tags: ['Open Source', 'Prompting', 'Tools'],
        publishedAt: daysAgo(18),
        isFeatured: false,
      },
      {
        title: 'Tutorial: Deploying a Minimal LLM Service for Prototyping',
        slug: 'tutorial-deploying-a-minimal-llm-service',
        summary:
          'How to deploy a small LLM service for prototyping using containerized runtimes and RouteLLM.',
        content:
          'The tutorial covers Docker setup, basic endpoints, and how to route requests through RouteLLM for provider flexibility.',
        imageUrl: 'https://picsum.photos/seed/news13/800/450',
        source: 'AI Forge Tutorials',
        sourceUrl: 'https://example.com/tutorials/deploy-llm',
        category: 'Tutorials',
        tags: ['Deployment', 'LLM', 'RouteLLM'],
        publishedAt: daysAgo(20),
        isFeatured: false,
      },
      {
        title: 'Product Update: New Dashboard Metrics',
        slug: 'product-update-new-dashboard-metrics',
        summary:
          'We added new analytics to track tool usage, top workflows, and community activity.',
        content:
          'Admins can now see engagement metrics, most active categories, and a timeline of top threads. This helps guide product decisions.',
        imageUrl: 'https://picsum.photos/seed/news14/800/450',
        source: 'AI Forge Updates',
        sourceUrl: 'https://example.com/updates/dashboard',
        category: 'Product Updates',
        tags: ['Dashboard', 'Analytics', 'Product'],
        publishedAt: daysAgo(7),
        isFeatured: false,
      },
    ];

    for (const article of SAMPLE_NEWS) {
      await prisma.newsArticle.upsert({
        where: { slug: article.slug },
        update: {
          title: article.title,
          summary: article.summary,
          content: article.content,
          imageUrl: article.imageUrl ?? null,
          source: article.source,
          sourceUrl: article.sourceUrl,
          category: article.category,
          tags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags,
          publishedAt: article.publishedAt ?? new Date(),
          isFeatured: article.isFeatured ?? false,
          updatedAt: new Date(),
        },
        create: {
          title: article.title,
          slug: article.slug,
          summary: article.summary,
          content: article.content,
          imageUrl: article.imageUrl ?? null,
          source: article.source,
          sourceUrl: article.sourceUrl,
          category: article.category,
          tags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags,
          publishedAt: article.publishedAt ?? new Date(),
          isFeatured: article.isFeatured ?? false,
          createdAt: article.publishedAt ?? new Date(),
        },
      });
    }
    logger.info('News articles seeded.');

    logger.info('Database seeded successfully!');
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
