/**
 * Forum Initialization Script
 * Creates relevant AI-focused forum categories and sample threads
 * 
 * Run with: npx tsx scripts/initializeForum.ts
 */

import { forumService } from '../src/services/forumService';

const FORUM_DATA = {
  categories: [
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
  ],

  threads: [
    // Getting Started Category
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

## Community Guidelines
- Be respectful and supportive
- Share knowledge generously
- Give credit where it's due
- Have fun and experiment!

Drop a comment below and introduce yourself! Tell us:
- What brings you to AI?
- What are you hoping to learn?
- Any specific challenges you're facing?

Let's build something amazing together! 🚀`,
      isPinned: true,
    },
    {
      categorySlug: 'getting-started',
      title: 'Recommended Learning Path for AI Beginners',
      content: `# Your AI Learning Journey Starts Here

New to AI? Here's a structured path to get you from zero to productive.

## Phase 1: Understanding AI Basics (Week 1-2)
- Learn what AI, ML, and LLMs actually are
- Understand different types of AI models
- Explore popular AI tools (ChatGPT, Claude, Gemini)

## Phase 2: Practical Applications (Week 3-4)
- Master prompt engineering basics
- Use AI for everyday tasks
- Try our utility tools (Caption Generator, Content Repurposer)

## Phase 3: Advanced Techniques (Week 5-6)
- Advanced prompting strategies
- Combining multiple AI tools
- Building AI workflows

## Phase 4: Specialization (Ongoing)
Choose your focus:
- Content creation
- Business automation
- Technical development
- Marketing & growth

What phase are you in? Share your progress!`,
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

    // AI Tools & Platforms
    {
      categorySlug: 'ai-tools-platforms',
      title: 'ChatGPT vs Claude vs Gemini: Comprehensive Comparison 2024',
      content: `# The Big Three: Which AI Assistant is Best?

I've spent the last month testing all three major AI assistants. Here's my detailed comparison.

## ChatGPT (GPT-4)
**Pros:**
- Most versatile for general tasks
- Great for coding and technical content
- Huge plugin ecosystem
- Strong reasoning capabilities

**Cons:**
- Can be wordy
- Sometimes outdated information
- Costs add up with API usage

## Claude (Anthropic)
**Pros:**
- Most natural conversational style
- Excellent at creative writing
- Strong ethical reasoning
- Great context window

**Cons:**
- Smaller knowledge base
- Limited availability
- Fewer integrations

## Gemini (Google)
**Pros:**
- Real-time web access
- Free tier generous
- Good at research tasks
- Integrated with Google services

**Cons:**
- Less consistent quality
- Sometimes overly cautious
- Newer, still improving

## My Recommendation
- **For Business:** ChatGPT
- **For Writing:** Claude
- **For Research:** Gemini

What's your experience? Any disagreements?`,
      isPinned: true,
    },
    {
      categorySlug: 'ai-tools-platforms',
      title: 'Best Free AI Tools in 2024',
      content: `Let's compile a list of the best FREE AI tools that actually work.

I'll start:
1. **ChatGPT Free** - Limited GPT-3.5 but still useful
2. **Google Gemini** - Generous free tier
3. **Canva Magic Write** - AI design + writing
4. **Remove.bg** - Background removal

What free tools are you using? Let's help each other save money!`,
      isPinned: false,
    },

    // Prompt Engineering
    {
      categorySlug: 'prompt-engineering',
      title: 'Master Prompt Template Library 📝',
      content: `# The Ultimate Prompt Template Collection

Here are my battle-tested prompt templates that get consistent results.

## 1. Content Creation Template
\`\`\`
Act as a [role] with expertise in [domain].

Your task is to [specific task].

Context: [background info]

Requirements:
- [requirement 1]
- [requirement 2]
- [requirement 3]

Tone: [tone]
Output format: [format]
\`\`\`

## 2. Problem-Solving Template
\`\`\`
I'm facing this problem: [problem description]

What I've tried: [attempts]

Constraints: [limitations]

Please provide:
1. Root cause analysis
2. 3 potential solutions
3. Pros/cons of each
4. Your recommendation
\`\`\`

## 3. Learning Template
\`\`\`
Teach me [concept] as if I'm [level].

Use:
- Simple analogies
- Real-world examples
- Progressive complexity

Then quiz me to test understanding.
\`\`\`

## 4. Code Generation Template
\`\`\`
Write [language] code that:
- [functionality 1]
- [functionality 2]

Requirements:
- Clean, commented code
- Error handling
- Example usage

Tech stack: [stack]
\`\`\`

Share your favorite templates!`,
      isPinned: true,
    },
    {
      categorySlug: 'prompt-engineering',
      title: 'Why Chain-of-Thought Prompting is a Game Changer',
      content: `I just discovered Chain-of-Thought (CoT) prompting and it's DRAMATICALLY improved my results.

**Before CoT:**
"Write a marketing email for my product"

**After CoT:**
"Let's create a marketing email step by step:
1. First, identify the target audience's main pain point
2. Then, explain how our product solves it
3. Include social proof
4. End with clear CTA

Think through each step before writing."

The AI now breaks down its thinking and gives WAY better output.

Anyone else using CoT? Share your examples!`,
      isPinned: false,
    },

    // AI for Content Creation
    {
      categorySlug: 'ai-content-creation',
      title: 'My Complete AI Content Workflow (10x Faster)',
      content: `# How I Create Content 10x Faster with AI

After months of experimentation, here's my content creation workflow:

## Step 1: Ideation (5 mins)
- Use ChatGPT to brainstorm 20 content ideas
- Filter based on audience needs
- Select top 3

## Step 2: Research (10 mins)
- Gemini for real-time research
- Gather facts, stats, examples
- Compile in notes

## Step 3: Outline (5 mins)
- Claude creates detailed outline
- I review and adjust structure
- Add personal insights

## Step 4: First Draft (15 mins)
- AI writes based on outline
- I provide personality and voice
- Keep it conversational

## Step 5: Enhancement (10 mins)
- AI suggests improvements
- Add hooks and CTAs
- Polish and refine

## Step 6: Repurposing (10 mins)
- Use Content Repurposer utility
- Create social posts
- Generate email version

**Total Time:** ~1 hour for full content suite
**Previous Time:** 8-10 hours

This is a game-changer. What's your workflow?`,
      isPinned: true,
    },
    {
      categorySlug: 'ai-content-creation',
      title: 'Best AI Tools for YouTube Creators',
      content: `YouTube creators - what AI tools are in your stack?

Mine:
- **Script writing:** ChatGPT
- **Thumbnails:** Midjourney + Canva
- **Titles/hooks:** Mike's Titles & Hooks Generator
- **Video editing:** Descript (AI editing)
- **Captions:** Rev or YouTube auto-captions

What am I missing? What tools do you swear by?`,
      isPinned: false,
    },

    // Business & Marketing
    {
      categorySlug: 'business-marketing',
      title: 'How I Generated $50K Using AI Marketing (Case Study)',
      content: `# Real Results: $50K in 3 Months with AI Marketing

I want to share my journey using AI for marketing automation.

## Background
- Small SaaS product
- Limited marketing budget
- Solo founder
- Target: B2B tech companies

## AI Tools Used
1. **ChatGPT** - Email sequences
2. **Copy.ai** - Ad copy variations
3. **Jasper** - Blog content
4. **LinkedIn AI** - Connection outreach

## The Strategy
### Month 1: Content Foundation
- AI-generated 30 blog posts
- Optimized for SEO
- Built authority

### Month 2: Outreach Campaign
- Personalized emails (AI + manual review)
- LinkedIn automation
- 30% response rate

### Month 3: Conversion Optimization
- AI-optimized landing pages
- A/B tested copy
- Refined messaging

## Results
- 1,200 qualified leads
- 85 paying customers
- $50,000 revenue
- 15x ROI on AI tool costs

## Key Learnings
1. AI + Human review = Magic
2. Personalization still matters
3. Test everything
4. Focus on quality over quantity

Happy to answer questions!`,
      isPinned: true,
    },
    {
      categorySlug: 'business-marketing',
      title: 'AI Email Marketing: Tips & Tricks',
      content: `Let's share our best practices for AI-powered email marketing.

What's working for you? What's not?

I'll start: Using AI to write subject line variations has increased my open rates by 35%!`,
      isPinned: false,
    },

    // AI Development & Technical
    {
      categorySlug: 'ai-development',
      title: 'OpenAI API vs Anthropic API: Developer\'s Perspective',
      content: `# API Comparison for Developers

As someone who's integrated both, here's my technical comparison:

## OpenAI API (GPT-4)
**Strengths:**
- Mature, stable API
- Excellent documentation
- Great for function calling
- Strong ecosystem

**Weaknesses:**
- Can be expensive at scale
- Rate limits can be restrictive
- Latency varies

**Best for:** Complex reasoning, coding tasks

## Anthropic API (Claude)
**Strengths:**
- Larger context window
- More predictable behavior
- Better at following instructions
- Cost-effective

**Weaknesses:**
- Newer, evolving
- Fewer examples/tutorials
- Limited availability

**Best for:** Long-form content, analysis

## Performance Metrics (My Testing)
- **Speed:** OpenAI slightly faster
- **Accuracy:** Depends on task
- **Cost:** Anthropic ~30% cheaper
- **Reliability:** OpenAI more stable

## My Setup
I use both:
- OpenAI for quick queries, coding
- Anthropic for long-form content

Code examples in comments if anyone wants them.`,
      isPinned: true,
    },
    {
      categorySlug: 'ai-development',
      title: 'Building AI Agents: Where to Start?',
      content: `I want to build custom AI agents but don't know where to start.

What frameworks, tools, and resources would you recommend?

Current skills: Python, JavaScript, basic ML understanding

Goal: Build agents that can perform complex multi-step tasks

Any guidance appreciated!`,
      isPinned: false,
    },

    // AI News & Updates
    {
      categorySlug: 'ai-news',
      title: 'GPT-5 Rumors and Speculation Megathread',
      content: `# GPT-5: What We Know (and Don't Know)

Let's compile all the latest news, rumors, and speculation about GPT-5.

## Confirmed
- OpenAI is working on GPT-5
- Expected significant improvements
- Focus on reasoning capabilities

## Rumored
- Multi-modal improvements
- Better context understanding
- Reduced hallucinations
- Potential release: Q4 2024

## Speculation
- AGI closer than we think?
- Pricing model changes?
- New capabilities?

What have you heard? Share links and sources!`,
      isPinned: true,
    },
    {
      categorySlug: 'ai-news',
      title: 'Google\'s Latest AI Announcements',
      content: `Did everyone see Google I/O? Gemini 1.5 Pro looks incredible.

2 million token context window is INSANE. That's like feeding it entire codebases.

Who's tested it? What are your thoughts?`,
      isPinned: false,
    },

    // Use Cases & Success Stories
    {
      categorySlug: 'use-cases',
      title: 'AI Use Cases Database - Share Yours!',
      content: `# Community Use Cases Collection

Let's build a comprehensive database of AI use cases. Share yours!

**Format:**
- **Industry:** [your industry]
- **Use Case:** [what you're doing]
- **Tools:** [AI tools used]
- **Result:** [impact/results]
- **Time Saved:** [estimate]

I'll compile these into a searchable resource!

## Example:
- **Industry:** Real Estate
- **Use Case:** Automated property descriptions
- **Tools:** ChatGPT + Custom prompts
- **Result:** 200+ listings written, 15 hours/week saved
- **Time Saved:** 60 hours/month

Your turn!`,
      isPinned: true,
    },
    {
      categorySlug: 'use-cases',
      title: 'How I Use AI for Customer Support (90% Automation)',
      content: `Our small startup automated 90% of customer support using AI.

**Setup:**
- AI chatbot (first response)
- ChatGPT for complex queries
- Human review for escalations

**Results:**
- Response time: 2 hours → 5 minutes
- Customer satisfaction: 4.2 → 4.7
- Support costs: -75%

Happy to share our implementation if there's interest!`,
      isPinned: false,
    },

    // AI Ethics & Future
    {
      categorySlug: 'ai-ethics',
      title: 'AI Ethics Discussion: Transparency & Attribution',
      content: `# Important Discussion: Ethics in AI Content

As AI becomes more prevalent, we need to talk about ethics.

## Key Questions:
1. Should we disclose AI-generated content?
2. How do we handle AI plagiarism concerns?
3. What are our responsibilities as creators?
4. Where do we draw the line?

## My Take:
- Transparency builds trust
- AI is a tool, humans are accountable
- Always review and edit AI output
- Give credit to sources

This is a judgment-free discussion. All perspectives welcome!`,
      isPinned: true,
    },
    {
      categorySlug: 'ai-ethics',
      title: 'Will AI Replace [Your Job]?',
      content: `Let's have an honest discussion about AI and employment.

I'm not here to fear-monger, but we should be realistic about how AI will change work.

My perspective: AI won't replace jobs, but people who use AI will replace people who don't.

What's your take? What are you doing to stay relevant?`,
      isPinned: false,
    },

    // Community & General
    {
      categorySlug: 'community',
      title: 'Monthly Challenge: Best AI Creation',
      content: `# December AI Challenge 🏆

Show us your best AI-created project this month!

**Categories:**
- Best Content
- Best Automation
- Best Creative Work
- Most Innovative Use

**Rules:**
1. Share your creation
2. Explain your process
3. List tools used
4. Results/impact

**Prizes:**
- Community recognition
- Featured on homepage
- Bragging rights!

Submissions below! 👇`,
      isPinned: true,
    },
    {
      categorySlug: 'community',
      title: 'Share Your AI Fails (We All Have Them)',
      content: `Let's lighten the mood and share our funniest AI fails!

I'll start: Asked ChatGPT to write a professional email. It wrote a poem instead. Still not sure what happened. 😅

What's your most memorable AI fail?`,
      isPinned: false,
    },
  ],
};

async function initializeForum() {
  console.log('🚀 Starting forum initialization...\n');

  try {
    // Step 1: Create categories
    console.log('📁 Creating forum categories...');
    const createdCategories: { [slug: string]: any } = {};

    for (const category of FORUM_DATA.categories) {
      try {
        const created = await forumService.createCategory(category);
        createdCategories[category.slug] = created;
        console.log(`  ✅ Created: ${category.name}`);
      } catch (error: any) {
        console.log(`  ⚠️  Skipped ${category.name}: ${error.message}`);
      }
    }

    console.log(`\n📊 Created ${Object.keys(createdCategories).length} categories\n`);

    // Step 2: Create threads
    console.log('💬 Creating forum threads...');
    let threadsCreated = 0;

    for (const thread of FORUM_DATA.threads) {
      try {
        const category = createdCategories[thread.categorySlug];
        if (!category) {
          console.log(`  ⚠️  Category not found for: ${thread.title}`);
          continue;
        }

        await forumService.createThread(thread.categorySlug, {
          title: thread.title,
          content: thread.content,
        });

        threadsCreated++;
        console.log(`  ✅ Created: ${thread.title.substring(0, 50)}...`);
      } catch (error: any) {
        console.log(`  ❌ Failed: ${thread.title.substring(0, 50)}... - ${error.message}`);
      }
    }

    console.log(`\n🎉 Success! Created ${threadsCreated} threads\n`);
    console.log('✨ Forum initialization complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Visit /forum to see your new categories');
    console.log('   2. Login as admin to pin important threads');
    console.log('   3. Encourage community participation\n');

  } catch (error: any) {
    console.error('\n❌ Initialization failed:', error.message);
    console.error('\nMake sure:');
    console.error('   - Backend server is running');
    console.error('   - You\'re logged in as admin');
    console.error('   - Database is connected\n');
    process.exit(1);
  }
}

// Run the initialization
console.log('');
console.log('═══════════════════════════════════════════');
console.log('  Mike\'s AI Forge - Forum Initialization  ');
console.log('═══════════════════════════════════════════');
console.log('');

initializeForum()
  .then(() => {
    console.log('✅ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });