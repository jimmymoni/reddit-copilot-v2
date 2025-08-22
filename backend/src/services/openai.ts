import OpenAI from 'openai';
import { RedditPost, SubredditRules, RedditProfile } from './reddit';

let openai: OpenAI;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
  }
  return openai;
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
      const prompt = this.buildSuggestionPrompt(request);
      
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4',
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
        max_tokens: 2000,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '[]');
      return this.formatSuggestions(suggestions);
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
      const prompt = this.buildEngagementPrompt(post, userProfile, subredditRules);
      
      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4',
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
        max_tokens: 1500,
        temperature: 0.7
      });

      const suggestions = JSON.parse(response.choices[0].message.content || '[]');
      return this.formatEngagementSuggestions(suggestions, post.id);
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
      const prompt = `
You are helping a Reddit user refine their comment idea. Take their rough thoughts and create a well-crafted, engaging comment.

POST CONTEXT:
Title: ${post.title}
Content: ${post.content.substring(0, 500)}...
Subreddit: r/${post.subreddit}
${subredditRules ? `Rules: ${subredditRules.rules.map(r => r.shortName + ': ' + r.description).join('; ')}` : ''}

USER INPUT: "${rawInput}"

USER PROFILE:
- Username: ${userProfile.username}
- Karma: ${userProfile.totalKarma}
- Account age: ${userProfile.accountCreated}

Transform the user's input into a refined comment that:
1. Maintains their authentic voice and opinion
2. Is well-structured and engaging
3. Adds value to the discussion
4. Respects subreddit rules and culture
5. Matches the user's communication style

Return JSON with this format:
{
  "content": "refined comment text",
  "reasoning": "why this approach works",
  "confidence": 0.8,
  "ruleCompliance": true,
  "riskLevel": "low",
  "estimatedReception": "positive - adds valuable perspective"
}
      `;

      const response = await getOpenAI().chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
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
        max_tokens: 500,
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
    
    return `
Generate 5 Reddit content suggestions for user "${userProfile.username}" based on their profile:

USER PROFILE:
- Username: ${userProfile.username}
- Karma: ${userProfile.karma}
- Account Age: ${userProfile.accountAge}
- Recent Posts: ${recentPosts?.map(p => `"${p.title}" in ${p.subreddit} (${p.score} upvotes)`).join(', ') || 'None'}

SUBSCRIBED SUBREDDITS:
${subreddits.slice(0, 15).map(sub => `- r/${sub.name}: ${sub.description.substring(0, 100)}...`).join('\n')}

Generate suggestions that:
1. Match the user's demonstrated interests
2. Are likely to get good engagement
3. Provide value to the target communities
4. Are realistic for this user's karma level

Return JSON array with this exact format:
[
  {
    "id": "unique_id",
    "type": "post|comment|engagement",
    "title": "Suggestion title",
    "content": "Detailed content or action",
    "targetSubreddit": "subreddit_name",
    "reasoning": "Why this would work",
    "confidence": 0.8,
    "estimatedEngagement": "10-50 upvotes"
  }
]
    `;
  }

  private static buildEngagementPrompt(
    post: RedditPost, 
    userProfile: RedditProfile, 
    subredditRules?: SubredditRules
  ): string {
    return `
Generate 3 engagement suggestions for this Reddit post:

POST DETAILS:
Title: ${post.title}
Content: ${post.content.substring(0, 800)}${post.content.length > 800 ? '...' : ''}
Subreddit: r/${post.subreddit}
Author: u/${post.author}
Score: ${post.score} (${Math.round(post.upvoteRatio * 100)}% upvoted)
Comments: ${post.commentCount}
Posted: ${post.created.toLocaleDateString()}

${subredditRules ? `SUBREDDIT RULES:
${subredditRules.rules.map(rule => `- ${rule.shortName}: ${rule.description}`).join('\n')}
Submission Type: ${subredditRules.submissionType}` : ''}

USER CONTEXT:
Username: ${userProfile.username}
Total Karma: ${userProfile.totalKarma}
Account Age: ${userProfile.accountCreated.toDateString()}
Recent Activity: ${userProfile.recentPosts.slice(0, 3).map(p => p.subreddit).join(', ')}

Generate suggestions that:
1. Add genuine value to the discussion
2. Match the user's expertise level and interests
3. Respect subreddit culture and rules
4. Are authentic and not generic
5. Have high potential for positive reception

Return JSON array with this exact format:
[
  {
    "type": "thoughtful_comment|question|experience_share|helpful_advice",
    "content": "specific comment text",
    "reasoning": "why this approach works",
    "confidence": 0.8,
    "ruleCompliance": true,
    "riskLevel": "low|medium|high",
    "estimatedReception": "likely positive - adds expertise"
  }
]
    `;
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