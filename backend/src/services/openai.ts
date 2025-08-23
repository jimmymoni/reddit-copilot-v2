import OpenAI from 'openai';
import { RedditPost, SubredditRules, RedditProfile } from './reddit';

// Simple cache for OpenAI responses (1 hour expiry)
const responseCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 3600000; // 1 hour

let openai: OpenAI;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
}

function getCacheKey(prefix: string, data: any): string {
  return `${prefix}_${JSON.stringify(data).substring(0, 100)}`;
}

function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, data: any): void {
  responseCache.set(key, { data, timestamp: Date.now() });
}

export interface SuggestionRequest {
  userProfile: {
    username: string;
    karma: number;
    accountAge: string;
  };
  subreddits: Array<{
    name: string;
    title: string;
    description: string;
    subscribers: number;
  }>;
  recentPosts?: Array<{
    title: string;
    subreddit: string;
    score: number;
  }>;
}

export interface Suggestion {
  id: string;
  type: 'post' | 'comment' | 'engagement';
  title: string;
  content: string;
  targetSubreddit: string;
  reasoning: string;
  confidence: number;
  estimatedEngagement: string;
}

export interface EngagementSuggestion {
  id: string;
  postId: string;
  type: 'thoughtful_comment' | 'question' | 'experience_share' | 'helpful_advice';
  content: string;
  reasoning: string;
  confidence: number;
  ruleCompliance: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedReception: string;
}

export class OpenAIService {
  /**
   * Generate content suggestions based on user's Reddit profile and interests
   */
  static async generateSuggestions(request: SuggestionRequest): Promise<Suggestion[]> {
    try {
      // Check cache first
      const cacheKey = getCacheKey('suggestions', { userId: request.userProfile.username, subreddits: request.subreddits.slice(0, 5).map(s => s.name) });
      const cachedResult = getCachedResponse(cacheKey);
      if (cachedResult) {
        console.log('Using cached suggestions');
        return cachedResult;
      }

      const prompt = this.buildSuggestionPrompt(request);
      
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a Reddit content strategist. Generate actionable, engaging content suggestions based on user data. Return JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '[]');
      const result = this.formatSuggestions(suggestions);
      
      // Cache the result
      setCachedResponse(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate suggestions: ${error}`);
    }
  }

  /**
   * Generate engagement suggestions for a specific Reddit post
   */
  static async generateEngagementSuggestions(
    post: RedditPost, 
    userProfile: RedditProfile, 
    subredditRules?: SubredditRules
  ): Promise<EngagementSuggestion[]> {
    try {
      // Check cache first
      const cacheKey = getCacheKey('engagement', { postId: post.id, userId: userProfile.username });
      const cachedResult = getCachedResponse(cacheKey);
      if (cachedResult) {
        console.log('Using cached engagement suggestions');
        return cachedResult;
      }

      const prompt = this.buildEngagementPrompt(post, userProfile, subredditRules);
      
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a Reddit engagement expert. Generate thoughtful, authentic comment suggestions that add value to discussions while respecting subreddit rules. Return JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '[]');
      const result = this.formatEngagementSuggestions(suggestions, post.id);
      
      // Cache the result
      setCachedResponse(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('OpenAI engagement suggestion error:', error);
      throw new Error(`Failed to generate engagement suggestions: ${error}`);
    }
  }

  /**
   * Process voice/text input for comment refinement
   */
  static async refineUserInput(
    rawInput: string,
    post: RedditPost,
    userProfile: RedditProfile,
    subredditRules?: SubredditRules
  ): Promise<EngagementSuggestion> {
    try {
      const prompt = `Improve this Reddit comment for r/${post.subreddit}:

POST: "${post.title}"
USER COMMENT: "${rawInput}"

Make it more engaging and valuable while keeping the user's authentic voice. Return JSON:
{
  "content": "improved comment",
  "reasoning": "brief explanation", 
  "confidence": 0.8,
  "ruleCompliance": true,
  "riskLevel": "low",
  "estimatedReception": "positive"
}`;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.6
      });

      const suggestion = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        id: `refined_${Date.now()}`,
        postId: post.id,
        type: 'thoughtful_comment',
        content: suggestion.content || rawInput,
        reasoning: suggestion.reasoning || 'User input refinement',
        confidence: suggestion.confidence || 0.7,
        ruleCompliance: suggestion.ruleCompliance ?? true,
        riskLevel: suggestion.riskLevel || 'low',
        estimatedReception: suggestion.estimatedReception || 'neutral'
      };
    } catch (error) {
      console.error('Input refinement error:', error);
      throw new Error(`Failed to refine user input: ${error}`);
    }
  }

  /**
   * Analyze a specific subreddit for posting opportunities
   */
  static async analyzeSubreddit(subredditName: string, userContext: any): Promise<string[]> {
    try {
      const prompt = `
        Analyze r/${subredditName} for content opportunities for a user interested in: ${userContext.interests?.join(', ') || 'startups, technology, AI'}.
        
        Suggest 3 specific post ideas that would:
        1. Get good engagement in this community
        2. Provide value to readers
        3. Align with the user's expertise
        
        Return as JSON array of strings.
      `;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.8
      });

      return JSON.parse(response.choices[0].message.content || '[]');
    } catch (error) {
      console.error('Subreddit analysis error:', error);
      throw new Error(`Failed to analyze subreddit: ${error}`);
    }
  }

  private static buildSuggestionPrompt(request: SuggestionRequest): string {
    const { userProfile, subreddits, recentPosts } = request;
    
    return `Generate 3 Reddit content suggestions for "${userProfile.username}" (${userProfile.karma} karma):

SUBREDDITS: ${subreddits.slice(0, 8).map(sub => sub.name).join(', ')}
RECENT: ${recentPosts?.slice(0, 3).map(p => `"${p.title}" (${p.score} votes)`).join('; ') || 'None'}

Return JSON array:
[
  {
    "id": "unique_id",
    "type": "post",
    "title": "Title",
    "content": "Brief content",
    "targetSubreddit": "subreddit",
    "reasoning": "Why effective",
    "confidence": 0.8,
    "estimatedEngagement": "10-50 upvotes"
  }
]`;
  }

  private static buildEngagementPrompt(
    post: RedditPost, 
    userProfile: RedditProfile, 
    subredditRules?: SubredditRules
  ): string {
    return `Generate 2 comment suggestions for r/${post.subreddit}:

"${post.title}"
${post.content.substring(0, 200)}...

JSON array:
[
  {
    "type": "question",
    "content": "comment text",
    "reasoning": "why good",
    "confidence": 0.8,
    "ruleCompliance": true,
    "riskLevel": "low",
    "estimatedReception": "positive"
  }
]`;
  }

  private static formatEngagementSuggestions(rawSuggestions: any[], postId: string): EngagementSuggestion[] {
    return rawSuggestions.map((suggestion, index) => ({
      id: `engagement_${postId}_${Date.now()}_${index}`,
      postId,
      type: suggestion.type || 'thoughtful_comment',
      content: suggestion.content || '',
      reasoning: suggestion.reasoning || '',
      confidence: suggestion.confidence || 0.5,
      ruleCompliance: suggestion.ruleCompliance ?? true,
      riskLevel: suggestion.riskLevel || 'low',
      estimatedReception: suggestion.estimatedReception || 'neutral'
    }));
  }

  private static formatSuggestions(rawSuggestions: any[]): Suggestion[] {
    return rawSuggestions.map((suggestion, index) => ({
      id: suggestion.id || `suggestion_${Date.now()}_${index}`,
      type: suggestion.type || 'post',
      title: suggestion.title || 'Untitled Suggestion',
      content: suggestion.content || '',
      targetSubreddit: suggestion.targetSubreddit || '',
      reasoning: suggestion.reasoning || '',
      confidence: suggestion.confidence || 0.5,
      estimatedEngagement: suggestion.estimatedEngagement || 'Unknown'
    }));
  }
}