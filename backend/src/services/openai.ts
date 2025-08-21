import OpenAI from 'openai';

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