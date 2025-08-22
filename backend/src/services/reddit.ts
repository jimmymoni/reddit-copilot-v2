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

export interface SubredditRules {
  subreddit: string;
  rules: Array<{
    shortName: string;
    description: string;
    kind: string;
  }>;
  description: string;
  submissionType: string;
}

export class RedditService {
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
      const subreddits = await reddit.getSubscriptions({ limit: 50 });
      
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
  static async getHomeFeed(redditId: string, limit: number = 25): Promise<RedditPost[]> {
    const reddit = await this.getRedditClient(redditId);
    
    try {
      // Get user's subscribed subreddits
      const subreddits = await this.getUserSubreddits(redditId);
      
      // Fetch posts from multiple subreddits
      const postPromises = subreddits.slice(0, 20).map(async (sub) => {
        try {
          // @ts-ignore: Snoowrap types are complex
          const posts = await reddit.getSubreddit(sub.name).getNew({ limit: 3 });
          return posts.map((post: any) => this.formatRedditPost(post));
        } catch (error) {
          console.error(`Failed to fetch posts from r/${sub.name}:`, error);
          return [];
        }
      });
      
      const allPosts = await Promise.all(postPromises);
      const flatPosts = allPosts.flat();
      
      // Sort by creation time and limit results
      return flatPosts
        .sort((a, b) => b.created.getTime() - a.created.getTime())
        .slice(0, limit);
        
    } catch (error) {
      throw new Error(`Failed to fetch home feed: ${error}`);
    }
  }

  /**
   * Get subreddit rules and guidelines
   */
  static async getSubredditRules(subreddit: string): Promise<SubredditRules> {
    const reddit = new snoowrap({
      userAgent: 'RedditCopilot/1.0.0',
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!,
    });
    
    try {
      // @ts-ignore: Snoowrap types are complex
      const sub = await reddit.getSubreddit(subreddit);
      const rules = await sub.getRules();
      
      return {
        subreddit: subreddit,
        rules: rules.map((rule: any) => ({
          shortName: rule.short_name || rule.violation_reason,
          description: rule.description,
          kind: rule.kind
        })),
        description: sub.description || '',
        submissionType: sub.submission_type || 'any'
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