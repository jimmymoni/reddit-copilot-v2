interface KimiAnalysis {
  isPainPoint: boolean
  painDescription: string
  opportunityScore: number // 1-100
  urgency: 'high' | 'medium' | 'low'
  saasOpportunity: string
}

class KimiService {
  private apiKey: string
  private baseUrl = 'https://api.moonshot.cn/v1'

  constructor() {
    this.apiKey = process.env.KIMI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('KIMI_API_KEY not found in environment variables')
    }
  }

  async analyzePainPoint(post: any, niche: string): Promise<KimiAnalysis> {
    if (!this.apiKey) {
      // Fallback analysis without API
      return this.fallbackAnalysis(post, niche)
    }

    try {
      const prompt = this.createAnalysisPrompt(post, niche)
      
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'moonshot-v1-8k',
          messages: [
            {
              role: 'system',
              content: 'You are a SaaS opportunity analyst. Analyze Reddit posts to identify customer pain points and potential SaaS solutions. Always respond in valid JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`Kimi API error: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content

      // Parse JSON response
      try {
        const analysis = JSON.parse(content)
        return this.validateAnalysis(analysis)
      } catch (parseError) {
        console.error('Failed to parse Kimi response:', content)
        return this.fallbackAnalysis(post, niche)
      }

    } catch (error) {
      console.error('Kimi API error:', error)
      return this.fallbackAnalysis(post, niche)
    }
  }

  private createAnalysisPrompt(post: any, niche: string): string {
    return `
Analyze this Reddit post for SaaS opportunities in the ${niche} niche:

Title: ${post.title}
Content: ${post.selftext}
Subreddit: r/${post.subreddit}
Score: ${post.score}

Determine:
1. Is this expressing a genuine pain point or problem?
2. What specific pain/frustration is being expressed?
3. Rate the SaaS opportunity (1-100) based on:
   - Problem severity
   - Market size potential
   - Technical feasibility
   - Competition level
4. Urgency level (high/medium/low)
5. What SaaS solution could solve this problem?

Respond ONLY in this JSON format:
{
  "isPainPoint": boolean,
  "painDescription": "Brief description of the pain point",
  "opportunityScore": number,
  "urgency": "high|medium|low",
  "saasOpportunity": "Description of potential SaaS solution"
}
`
  }

  private validateAnalysis(analysis: any): KimiAnalysis {
    return {
      isPainPoint: Boolean(analysis.isPainPoint),
      painDescription: String(analysis.painDescription || 'Unknown pain point'),
      opportunityScore: Math.max(1, Math.min(100, Number(analysis.opportunityScore) || 1)),
      urgency: ['high', 'medium', 'low'].includes(analysis.urgency) ? analysis.urgency : 'low',
      saasOpportunity: String(analysis.saasOpportunity || 'SaaS solution not identified')
    }
  }

  private fallbackAnalysis(post: any, niche: string): KimiAnalysis {
    // Simple keyword-based analysis as fallback
    const painKeywords = ['problem', 'issue', 'frustrated', 'difficult', 'hate', 'need', 'wish']
    const text = `${post.title} ${post.selftext}`.toLowerCase()
    
    const painCount = painKeywords.reduce((count, keyword) => 
      count + (text.split(keyword).length - 1), 0
    )

    const isPainPoint = painCount > 0
    const score = Math.min(100, painCount * 15 + post.score * 2)
    
    let urgency: 'high' | 'medium' | 'low' = 'low'
    if (painCount >= 3 && post.score > 10) urgency = 'high'
    else if (painCount >= 2 || post.score > 5) urgency = 'medium'

    return {
      isPainPoint,
      painDescription: isPainPoint ? 
        `User experiencing ${niche}-related challenges` : 
        'No clear pain point identified',
      opportunityScore: score,
      urgency,
      saasOpportunity: isPainPoint ? 
        `Develop a ${niche} tool to address the mentioned challenges` :
        'No clear SaaS opportunity'
    }
  }

  // Batch analysis for multiple posts (more efficient)
  async analyzeBatch(posts: any[], niche: string): Promise<KimiAnalysis[]> {
    const results: KimiAnalysis[] = []
    
    for (const post of posts) {
      try {
        const analysis = await this.analyzePainPoint(post, niche)
        results.push(analysis)
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Error analyzing post ${post.id}:`, error)
        results.push(this.fallbackAnalysis(post, niche))
      }
    }
    
    return results
  }
}

export const kimiService = new KimiService()