import snoowrap from 'snoowrap';
import { PrismaClient } from '@prisma/client';
import CryptoJS from 'crypto-js';

const prisma = new PrismaClient();

export interface RedditProfile {
  id: string;
  username: string;
  totalKarma: number;
  linkKarma: number;
  commentKarma: number;
  accountCreated: Date;
  recentPosts: Array<{
    id: string;
    title: string;
    subreddit: string;
    score: number;
    created: Date;
    url: string;
  }>;
}

export interface SubredditInfo {
  name: string;
  title: string;
  subscribers: number;
  public_description: string;
  url: string;
  active_user_count: number;
}

export interface RedditPost {
  id: string;
  title: string;
  content: string;
  author: string;
  subreddit: string;
  score: number;
  commentCount: number;
  created: Date;
  url: string;
  permalink: string;
  mediaType: 'text' | 'image' | 'video' | 'link';
  mediaUrl?: string;
  flair?: string;
  isNSFW: boolean;
  upvoteRatio: number;
}

export interface SubredditFlair {
  id: string;
  text: string;
  type: 'text' | 'richtext';
  allowable_content?: string;
  max_emojis?: number;
  mod_only?: boolean;
  css_class?: string;
}

export interface SubredditRules {
  subreddit: string;
  rules: Array<{
    shortName: string;
    description: string;
    kind: string;
  }>;
  description: string;
  submissionType: string;
  flairs: SubredditFlair[];
  postRequirements?: {
    minTitleLength?: number;
    maxTitleLength?: number;
    minBodyLength?: number;
    maxBodyLength?: number;
    flairRequired?: boolean;
    allowedDomains?: string[];
    restrictedWords?: string[];
  };
}

export class RedditService {
  // Search subreddit for posts containing keywords
  static async searchSubreddit(redditId: string, subreddit: string, query: string, timeframe: string = 'week') {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      const timeParam = this.getTimeParameter(timeframe);
      const searchResults = await reddit.getSubreddit(subreddit).search({
        query,
        time: timeParam,
        sort: 'relevance'
      });
      
      // Limit results after fetching
      const limitedResults = searchResults.slice(0, 25);

      return limitedResults.map((post: any) => ({
        id: post.id,
        title: post.title,
        selftext: post.selftext || '',
        author: post.author ? post.author.name : '[deleted]',
        subreddit: post.subreddit.display_name,
        score: post.score,
        num_comments: post.num_comments,
        created_utc: post.created_utc,
        permalink: post.permalink,
        url: post.url,
        upvote_ratio: post.upvote_ratio || 0
      }));
    } catch (error) {
      console.error(`Error searching r/${subreddit}:`, error);
      return [];
    }
  }

  private static getTimeParameter(timeframe: string): 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' {
    switch (timeframe) {
      case 'day': return 'day';
      case 'week': return 'week';
      case 'month': return 'month';
      case 'all': return 'all';
      default: return 'week';
    }
  }
  private static encryptToken(token: string): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY not set');
    return CryptoJS.AES.encrypt(token, key).toString();
  }

  private static decryptToken(encryptedToken: string): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) throw new Error('ENCRYPTION_KEY not set');
    const bytes = CryptoJS.AES.decrypt(encryptedToken, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  static getAuthUrl(): string {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const redirectUri = process.env.REDDIT_REDIRECT_URI;
    const state = Math.random().toString(36).substring(7);
    
    return `https://www.reddit.com/api/v1/authorize?client_id=${clientId}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri!)}&duration=permanent&scope=identity,read,history,mysubreddits,submit`;
  }

  static async exchangeCodeForTokens(code: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const r = new snoowrap({
      userAgent: 'RedditCopilot/1.0.0',
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
      refreshToken: '', // Will be set after auth
    });

    try {
      // Exchange code for tokens using snoowrap's internal method
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditCopilot/1.0.0'
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: process.env.REDDIT_REDIRECT_URI!
        })
      });

      const data = await response.json() as any;
      
      if (!response.ok) {
        throw new Error(`Reddit API error: ${data.error_description || data.error}`);
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token
      };
    } catch (error) {
      throw new Error(`Failed to exchange code for tokens: ${error}`);
    }
  }

  static async saveUserTokens(redditId: string, username: string, accessToken: string, refreshToken?: string): Promise<void> {
    const encryptedAccessToken = this.encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? this.encryptToken(refreshToken) : null;

    await prisma.user.upsert({
      where: { redditId },
      update: {
        username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        updatedAt: new Date()
      },
      create: {
        redditId,
        username,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken
      }
    });
  }

  static async getRedditClient(redditId: string): Promise<snoowrap> {
    const user = await prisma.user.findUnique({ where: { redditId } });
    if (!user) throw new Error('User not found');

    const accessToken = this.decryptToken(user.accessToken);
    const refreshToken = user.refreshToken ? this.decryptToken(user.refreshToken) : undefined;

    return new snoowrap({
      userAgent: 'RedditCopilot/1.0.0',
      accessToken,
      refreshToken,
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!
    });
  }

  static async getUserProfile(redditId: string): Promise<RedditProfile> {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // @ts-ignore: Snoowrap types are complex, using any for now
      const me = await reddit.getMe();
      const submissions = await me.getSubmissions({ limit: 10 }).fetchAll();

      return {
        id: me.id,
        username: me.name,
        totalKarma: me.total_karma || (me.link_karma + me.comment_karma),
        linkKarma: me.link_karma,
        commentKarma: me.comment_karma,
        accountCreated: new Date(me.created_utc * 1000),
        recentPosts: submissions.map((post: any) => ({
          id: post.id,
          title: post.title,
          subreddit: post.subreddit_name_prefixed,
          score: post.score,
          created: new Date(post.created_utc * 1000),
          url: `https://reddit.com${post.permalink}`
        }))
      };
    } catch (error) {
      throw new Error(`Failed to fetch user profile: ${error}`);
    }
  }

  /**
   * Get user's subscribed subreddits
   * @param redditId - User's Reddit ID from database
   * @returns Array of subreddit information
   */
  static async getUserSubreddits(redditId: string): Promise<SubredditInfo[]> {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // @ts-ignore: Snoowrap types are complex, using any for now
      const subreddits = await reddit.getSubscriptions({ limit: 100 });
      
      return subreddits.map((sub: any) => ({
        name: sub.display_name,
        title: sub.title || sub.display_name,
        subscribers: sub.subscribers || 0,
        public_description: sub.public_description || '',
        url: `/r/${sub.display_name}`,
        active_user_count: sub.active_user_count || 0
      }));
    } catch (error) {
      throw new Error(`Failed to fetch user subreddits: ${error}`);
    }
  }

  /**
   * Get home feed posts from user's subscribed subreddits
   */
  static async getHomeFeed(redditId: string, limit: number = 200): Promise<RedditPost[]> {
    console.log(`Starting getHomeFeed for redditId: ${redditId}, limit: ${limit}`);
    
    try {
      const reddit = await this.getRedditClient(redditId);
      console.log('Reddit client obtained successfully');
      
      // Get user's subscribed subreddits
      const subreddits = await this.getUserSubreddits(redditId);
      console.log(`Found ${subreddits.length} subscribed subreddits`);
      
      if (subreddits.length === 0) {
        console.warn('User has no subscribed subreddits, using fallback approach');
        return await this.getFallbackPosts(reddit, limit);
      }
      
      // Maximum Reddit API efficiency approach
      const allPosts: RedditPost[] = [];
      
      // BALANCED APPROACH: Fetch from more subreddits but with delays
      const topSubs = subreddits.slice(0, 6); // Increased for more content variety
      console.log(`Fetching from top ${topSubs.length} subreddits:`, topSubs.map(s => s.name).join(', '));
      
      // Sequential fetching with better error handling
      for (let i = 0; i < topSubs.length; i++) {
        const sub = topSubs[i];
        try {
          // Add delay between requests to prevent rate limiting
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 800)); // Slightly faster but safe
          }
          
          console.log(`Fetching posts from r/${sub.name}...`);
          
          // Get posts from this subreddit with retry logic
          const subPosts = await this.getSubredditPostsWithRetry(reddit, sub.name, 25);
          const formattedPosts = subPosts.map((post: any) => this.formatRedditPost(post));
          allPosts.push(...formattedPosts);
          
          console.log(`Successfully fetched ${formattedPosts.length} posts from r/${sub.name}`);
        } catch (error) {
          console.error(`Failed to fetch posts from r/${sub.name}:`, error);
          // Continue with other subreddits instead of failing completely
        }
      }
      
      console.log(`Total posts fetched from subscribed subreddits: ${allPosts.length}`);
      
      // Add popular business/tech subreddits if we don't have enough content
      if (allPosts.length < limit / 2) {
        console.log('Adding posts from popular business/tech subreddits...');
        await this.addPopularSubredditPosts(reddit, allPosts);
      }

      // Remove duplicates based on post ID
      const uniquePosts = Array.from(
        new Map(allPosts.map(post => [post.id, post])).values()
      );
      
      console.log(`After deduplication: ${uniquePosts.length} unique posts`);
      
      // Sort by creation time (newest first) and limit results
      const finalPosts = uniquePosts
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .slice(0, limit);
      
      console.log(`Returning ${finalPosts.length} posts`);
      return finalPosts;
        
    } catch (error) {
      console.error('Error in getHomeFeed:', error);
      throw new Error(`Failed to fetch home feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get posts from a single subreddit with retry logic
   */
  private static async getSubredditPostsWithRetry(reddit: any, subredditName: string, limit: number, retries: number = 2): Promise<any[]> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Mix of new and hot posts for better content variety
        const [newPosts, hotPosts] = await Promise.all([
          reddit.getSubreddit(subredditName).getNew({ limit: Math.ceil(limit * 0.7) }),
          reddit.getSubreddit(subredditName).getHot({ limit: Math.ceil(limit * 0.3) })
        ]);
        
        return [...newPosts, ...hotPosts];
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed for r/${subredditName}:`, error);
        
        if (attempt === retries) {
          throw error;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    
    return [];
  }

  /**
   * Add posts from popular business/tech subreddits to fill content gaps
   */
  private static async addPopularSubredditPosts(reddit: any, allPosts: RedditPost[]): Promise<void> {
    const businessSubs = ['entrepreneur', 'startups', 'SaaS', 'business', 'webdev', 'programming'];
    
    for (let i = 0; i < Math.min(businessSubs.length, 3); i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        const businessSub = businessSubs[i];
        
        console.log(`Adding posts from popular subreddit r/${businessSub}...`);
        
        const subPosts = await this.getSubredditPostsWithRetry(reddit, businessSub, 15);
        const formattedPosts = subPosts.map((post: any) => this.formatRedditPost(post));
        allPosts.push(...formattedPosts);
        
        console.log(`Added ${formattedPosts.length} posts from r/${businessSub}`);
      } catch (error) {
        console.error(`Failed to fetch posts from popular subreddit r/${businessSubs[i]}:`, error);
      }
    }
  }

  /**
   * Fallback method when user has no subscribed subreddits
   */
  private static async getFallbackPosts(reddit: any, limit: number): Promise<RedditPost[]> {
    const defaultSubs = ['popular', 'all'];
    const allPosts: RedditPost[] = [];
    
    for (const subName of defaultSubs) {
      try {
        console.log(`Fetching from r/${subName} as fallback...`);
        
        const posts = await reddit.getSubreddit(subName).getHot({ limit: Math.ceil(limit / 2) });
        const formattedPosts = posts.map((post: any) => this.formatRedditPost(post));
        allPosts.push(...formattedPosts);
        
        if (allPosts.length >= limit) break;
      } catch (error) {
        console.error(`Failed to fetch fallback posts from r/${subName}:`, error);
      }
    }
    
    return allPosts.slice(0, limit);
  }

  /**
   * Get detailed subreddit information
   */
  static async getSubredditInfo(redditId: string, subredditName: string) {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // @ts-ignore: Snoowrap types are complex
      const sub = await reddit.getSubreddit(subredditName);
      
      return {
        name: sub.display_name,
        title: sub.title || sub.display_name,
        description: sub.public_description || sub.description || '',
        subscribers: sub.subscribers || 0,
        activeUsers: sub.active_user_count || 0,
        created: (() => {
          try {
            if (sub.created_utc && !isNaN(sub.created_utc)) {
              return new Date(sub.created_utc * 1000).toISOString();
            }
            return new Date().toISOString();
          } catch (e) {
            return new Date().toISOString();
          }
        })(),
        isNSFW: sub.over18 || false,
        icon: sub.icon_img || sub.community_icon || null
      };
    } catch (error) {
      console.error(`Error fetching subreddit info for r/${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Get posts from a specific subreddit
   */
  static async getSubredditPosts(redditId: string, subredditName: string, sort: string = 'new', limit: number = 25) {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // @ts-ignore: Snoowrap types are complex
      const subreddit = reddit.getSubreddit(subredditName);
      let posts;

      switch (sort) {
        case 'hot':
          posts = await subreddit.getHot({ limit });
          break;
        case 'top':
          posts = await subreddit.getTop({ time: 'week', limit });
          break;
        case 'new':
        default:
          posts = await subreddit.getNew({ limit });
          break;
      }

      return posts.map((post: any) => this.formatRedditPost(post));
    } catch (error) {
      console.error(`Error fetching posts from r/${subredditName}:`, error);
      throw error;
    }
  }

  /**
   * Get subreddit rules and guidelines
   */
  static async getSubredditRules(redditId: string, subreddit: string): Promise<SubredditRules> {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // @ts-ignore: Snoowrap types are complex
      const sub = await reddit.getSubreddit(subreddit);
      const [rules, flairTemplates] = await Promise.all([
        sub.getRules(),
        sub.getLinkFlairTemplates().catch(() => [])
      ]);
      
      // Parse subreddit settings for post requirements
      const postRequirements = {
        flairRequired: false,
        minBodyLength: undefined as number | undefined,
        maxBodyLength: undefined as number | undefined,
        restrictedWords: [] as string[]
      };
      
      // Check if flair is required by examining subreddit rules
      const hasFlairRule = Array.isArray(rules) && rules.some((rule: any) => 
        rule.description?.toLowerCase().includes('flair') ||
        rule.short_name?.toLowerCase().includes('flair')
      );
      
      if (hasFlairRule || flairTemplates.length > 0) {
        postRequirements.flairRequired = true;
      }
      
      return {
        subreddit: subreddit,
        rules: Array.isArray(rules) ? rules.map((rule: any) => ({
          shortName: rule.short_name || rule.violation_reason,
          description: rule.description,
          kind: rule.kind
        })) : [],
        description: sub.description || '',
        submissionType: sub.submission_type || 'any',
        flairs: flairTemplates.map((flair: any) => ({
          id: flair.id || flair.flair_template_id,
          text: flair.text || flair.flair_text,
          type: flair.type || 'text',
          allowable_content: flair.allowable_content,
          max_emojis: flair.max_emojis,
          mod_only: flair.mod_only,
          css_class: flair.css_class
        })),
        postRequirements
      };
    } catch (error) {
      throw new Error(`Failed to fetch rules for r/${subreddit}: ${error}`);
    }
  }

  /**
   * Format Reddit post data into our interface
   */
  private static formatRedditPost(post: any): RedditPost {
    return {
      id: post.id,
      title: post.title,
      content: post.selftext || '',
      author: post.author?.name || '[deleted]',
      subreddit: post.subreddit_name_prefixed.replace('r/', ''),
      score: post.score,
      commentCount: post.num_comments,
      created: new Date(post.created_utc * 1000),
      url: post.url,
      permalink: post.permalink,
      mediaType: this.getMediaType(post),
      mediaUrl: this.getMediaType(post) === 'text' ? undefined : post.url,
      flair: post.link_flair_text,
      isNSFW: post.over_18,
      upvoteRatio: post.upvote_ratio
    };
  }

  /**
   * Determine media type from Reddit post
   */
  private static getMediaType(post: any): 'text' | 'image' | 'video' | 'link' {
    if (post.is_self) return 'text';
    if (post.post_hint === 'image' || post.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
    if (post.post_hint === 'hosted:video' || post.is_video) return 'video';
    return 'link';
  }

  /**
   * Execute a Reddit action (post, comment, etc.)
   */
  static async executeAction(redditId: string, action: RedditAction): Promise<ActionResult> {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      switch (action.type) {
        case 'post':
          return await this.createPost(reddit, action);
        case 'comment':
          return await this.createComment(reddit, action);
        default:
          throw new Error(`Unsupported action type: ${action.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to execute action: ${error}`);
    }
  }

  private static async createPost(reddit: any, action: RedditAction): Promise<ActionResult> {
    // @ts-ignore: Snoowrap types are complex
    const submission = await reddit.getSubreddit(action.targetSubreddit).submitSelfpost({
      title: action.title,
      text: action.content
    });

    // Wait for the submission to be fully loaded
    await submission.fetch();

    return {
      success: true,
      actionId: action.id,
      redditId: submission.id,
      url: `https://reddit.com${submission.permalink}`,
      message: 'Post created successfully'
    };
  }

  private static async createComment(reddit: any, action: RedditAction): Promise<ActionResult> {
    if (!action.parentId) {
      throw new Error('Comment action requires parentId');
    }

    // @ts-ignore: Snoowrap types are complex
    const comment = await reddit.getSubmission(action.parentId).reply(action.content);

    return {
      success: true,
      actionId: action.id,
      redditId: comment.id,
      url: `https://reddit.com${comment.permalink}`,
      message: 'Comment created successfully'
    };
  }
}

export interface RedditAction {
  id: string;
  type: 'post' | 'comment';
  title: string;
  content: string;
  targetSubreddit: string;
  parentId?: string; // For comments
}

export interface ActionResult {
  success: boolean;
  actionId: string;
  redditId?: string;
  url?: string;
  message: string;
  error?: string;
}