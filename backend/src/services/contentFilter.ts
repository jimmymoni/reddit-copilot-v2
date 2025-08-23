import { RedditPost } from './reddit';

export interface ContentFilter {
  categories: string[];
  keywords: string[];
  excludeKeywords: string[];
  minScore: number;
  contentTypes: ('text' | 'image' | 'video' | 'link')[];
  intentFilters: string[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filter: ContentFilter;
}

export const BUSINESS_CATEGORIES = {
  ENTREPRENEURSHIP: {
    name: "Entrepreneurship",
    subreddits: ["entrepreneur", "startups", "SideProject", "business", "smallbusiness", "Entrepreneur"],
    keywords: ["startup", "business", "funding", "launch", "revenue", "entrepreneur", "founder", "venture"],
    description: "Startup and business opportunities"
  },
  TECH_DEVELOPMENT: {
    name: "Tech & Development", 
    subreddits: ["programming", "webdev", "SaaS", "artificial", "MachineLearning", "technology"],
    keywords: ["development", "AI", "software", "API", "tech stack", "programming", "coding", "automation"],
    description: "Technical discussions and opportunities"
  },
  MARKETING_GROWTH: {
    name: "Marketing & Growth",
    subreddits: ["marketing", "growth", "PPC", "SEO", "socialmedia", "digitalmarketing"],
    keywords: ["marketing", "growth", "conversion", "leads", "customers", "acquisition", "retention"],
    description: "Marketing and business growth"
  },
  INVESTMENT_FINANCE: {
    name: "Investment & Finance",
    subreddits: ["investing", "financialindependence", "stocks", "cryptocurrency", "personalfinance"],
    keywords: ["investment", "finance", "money", "portfolio", "ROI", "trading", "wealth"],
    description: "Financial and investment discussions"
  },
  CONSULTING_FREELANCE: {
    name: "Consulting & Freelance",
    subreddits: ["consulting", "freelance", "digitalnomad", "remotework", "forhire"],
    keywords: ["consulting", "freelance", "client", "contract", "remote", "services", "expertise"],
    description: "Professional services and consulting"
  }
};

export const INTENT_SIGNALS = {
  LOOKING_FOR_SOLUTION: {
    name: "Looking for Solutions",
    patterns: ["looking for", "need help", "any recommendations", "what should I use", "best tool"],
    score: 10
  },
  ASKING_QUESTIONS: {
    name: "Asking Questions", 
    patterns: ["how to", "why does", "what is", "can someone explain", "help me understand"],
    score: 8
  },
  SHARING_PROBLEMS: {
    name: "Sharing Problems",
    patterns: ["struggling with", "problem with", "issue with", "can't figure out", "stuck on"],
    score: 9
  },
  BUDGET_MENTIONS: {
    name: "Budget Discussions",
    patterns: ["budget", "paid", "premium", "enterprise", "pricing", "cost", "worth paying"],
    score: 10
  },
  TOOL_REQUESTS: {
    name: "Tool Recommendations",
    patterns: ["tool for", "software for", "app for", "platform for", "service for", "solution for"],
    score: 9
  }
};

export const EXCLUDE_PATTERNS = [
  // Personal/lifestyle content
  "hair", "skincare", "dating", "relationship", "food", "recipe", "workout", "fitness",
  "movie", "tv show", "game", "gaming", "sport", "travel", "vacation",
  
  // Non-business discussions
  "meme", "funny", "joke", "celebrity", "politics", "religion", "drama",
  "gossip", "rant", "complaint", "personal story", "family",
  
  // Low-value content
  "upvote if", "karma", "cake day", "first post", "long time lurker",
  
  // Welcome posts and announcements (often old)
  "welcome to", "community subreddit", "essential information", "get started",
  "about this subreddit", "rules", "guidelines", "moderator", "announcement",
  
  // Art/creative content that's not business-focused  
  "art", "creative", "design", "runway", "video generation", "ai art"
];

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: "business_opportunities",
    name: "🎯 Business Opportunities",
    description: "High-value posts where you can offer expertise or find leads",
    filter: {
      categories: ["ENTREPRENEURSHIP", "CONSULTING_FREELANCE"],
      keywords: ["startup", "business", "help", "looking for", "need", "recommendation"],
      excludeKeywords: EXCLUDE_PATTERNS,
      minScore: 5,
      contentTypes: ["text", "link"],
      intentFilters: ["LOOKING_FOR_SOLUTION", "BUDGET_MENTIONS", "TOOL_REQUESTS"]
    }
  },
  {
    id: "tech_discussions",
    name: "💻 Tech Discussions",
    description: "Technical posts where you can showcase expertise",
    filter: {
      categories: ["TECH_DEVELOPMENT"],
      keywords: ["AI", "development", "software", "API", "automation", "SaaS"],
      excludeKeywords: EXCLUDE_PATTERNS,
      minScore: 3,
      contentTypes: ["text", "link"],
      intentFilters: ["ASKING_QUESTIONS", "SHARING_PROBLEMS"]
    }
  },
  {
    id: "growth_marketing",
    name: "📈 Growth & Marketing",
    description: "Marketing and business growth opportunities",
    filter: {
      categories: ["MARKETING_GROWTH"],
      keywords: ["growth", "marketing", "conversion", "leads", "acquisition"],
      excludeKeywords: EXCLUDE_PATTERNS,
      minScore: 5,
      contentTypes: ["text", "link"],
      intentFilters: ["LOOKING_FOR_SOLUTION", "TOOL_REQUESTS"]
    }
  },
  {
    id: "investment_finance", 
    name: "💰 Investment & Finance",
    description: "Financial discussions and investment opportunities",
    filter: {
      categories: ["INVESTMENT_FINANCE"],
      keywords: ["investment", "finance", "ROI", "portfolio", "wealth"],
      excludeKeywords: EXCLUDE_PATTERNS,
      minScore: 5,
      contentTypes: ["text", "link"],
      intentFilters: ["ASKING_QUESTIONS", "LOOKING_FOR_SOLUTION"]
    }
  },
  {
    id: "custom_business",
    name: "🔧 Custom Business Mix",
    description: "Customizable mix of business categories",
    filter: {
      categories: ["ENTREPRENEURSHIP", "TECH_DEVELOPMENT", "MARKETING_GROWTH"],
      keywords: [],
      excludeKeywords: EXCLUDE_PATTERNS,
      minScore: 3,
      contentTypes: ["text", "link"],
      intentFilters: ["LOOKING_FOR_SOLUTION", "ASKING_QUESTIONS", "BUDGET_MENTIONS"]
    }
  }
];

export class ContentFilterService {
  static scorePost(post: RedditPost, filter: ContentFilter): number {
    let score = 0;
    
    // Time-based scoring: Heavily favor recent posts
    const postAge = Date.now() - post.created.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    if (postAge < dayInMs) score += 10; // Less than 1 day old
    else if (postAge < dayInMs * 7) score += 5; // Less than 1 week old  
    else if (postAge < dayInMs * 30) score += 2; // Less than 1 month old
    else if (postAge > dayInMs * 365) score -= 15; // Older than 1 year - heavily penalize
    
    // Category matching
    const postSubreddit = post.subreddit.toLowerCase();
    for (const categoryKey of filter.categories) {
      const category = BUSINESS_CATEGORIES[categoryKey as keyof typeof BUSINESS_CATEGORIES];
      if (category?.subreddits.some(sub => postSubreddit.includes(sub.toLowerCase()))) {
        score += 5;
      }
    }
    
    // Keyword matching
    const content = (post.title + ' ' + post.content).toLowerCase();
    for (const keyword of filter.keywords) {
      if (content.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }
    
    // Exclude keyword penalty
    for (const excludeKeyword of filter.excludeKeywords) {
      if (content.includes(excludeKeyword.toLowerCase())) {
        score -= 10;
      }
    }
    
    // Intent signal detection
    for (const intentKey of filter.intentFilters) {
      const intent = INTENT_SIGNALS[intentKey as keyof typeof INTENT_SIGNALS];
      if (intent?.patterns.some(pattern => content.includes(pattern.toLowerCase()))) {
        score += intent.score;
      }
    }
    
    // Engagement boost
    if (post.score >= 10) score += 2;
    if (post.score >= 50) score += 3;
    if (post.commentCount >= 10) score += 2;
    
    // Content type filtering
    if (filter.contentTypes.includes(post.mediaType)) {
      score += 1;
    }
    
    return Math.max(0, score);
  }
  
  static filterPosts(posts: RedditPost[], filter: ContentFilter): RedditPost[] {
    return posts
      .map(post => ({
        ...post,
        relevanceScore: this.scorePost(post, filter)
      }))
      .filter(post => post.relevanceScore >= filter.minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  
  static getFilteredFeed(posts: RedditPost[], presetId: string): RedditPost[] {
    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (!preset) return posts;
    
    return this.filterPosts(posts, preset.filter);
  }
}