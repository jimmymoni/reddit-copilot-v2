interface ParsedResearchInput {
  target: string          // "Shopify store owners"
  intent: string          // "find_problems"
  timeframe: string       // "lately" → "week"
  subreddits: string[]    // auto-selected: ['shopify', 'ecommerce', 'dropship']
  searchQueries: string[] // auto-generated queries
  keywords: string[]      // extracted pain keywords
  confidence: number      // how confident we are in parsing (0-1)
}

class NLPProcessor {
  private static readonly TARGET_PATTERNS = {
    'shopify store owners|shopify owners|shopify merchants': {
      target: 'Shopify store owners',
      subreddits: ['shopify', 'ecommerce', 'dropship', 'entrepreneur', 'smallbusiness']
    },
    'saas founders|saas entrepreneurs|saas builders|saas creators': {
      target: 'SaaS founders',
      subreddits: ['saas', 'startups', 'entrepreneur', 'indiehackers', 'smallbusiness']
    },
    'dropshippers|drop shippers|dropship business': {
      target: 'Dropshippers',
      subreddits: ['dropship', 'ecommerce', 'shopify', 'amazon', 'entrepreneur']
    },
    'ecommerce owners|e-commerce business|online store owners': {
      target: 'Ecommerce business owners',
      subreddits: ['ecommerce', 'shopify', 'amazon', 'entrepreneur', 'smallbusiness']
    },
    'digital marketers|marketing agencies|marketers': {
      target: 'Digital marketers',
      subreddits: ['marketing', 'digitalmarketing', 'ppc', 'socialmedia', 'entrepreneur']
    },
    'developers|programmers|software engineers': {
      target: 'Developers',
      subreddits: ['programming', 'webdev', 'javascript', 'react', 'node']
    },
    'recruitment firms|recruiting agencies|recruitment companies|recruitment employees|recruiter|recruiters|talent acquisition|hr professionals|human resources': {
      target: 'Recruitment professionals',
      subreddits: ['recruiting', 'humanresources', 'jobs', 'recruiting', 'talentacquisition']
    },
    'real estate agents|realtors|real estate professionals|property agents': {
      target: 'Real estate professionals',
      subreddits: ['realestate', 'realtor', 'realestateinvesting', 'entrepreneur', 'smallbusiness']
    },
    'freelancers|freelance professionals|independent contractors|solopreneurs': {
      target: 'Freelancers',
      subreddits: ['freelance', 'entrepreneur', 'digitalnomad', 'solopreneur', 'smallbusiness']
    }
  }

  private static readonly INTENT_PATTERNS = {
    'bothered|frustrated|annoyed|struggling|hate|problems|issues|pain|difficulty': 'find_problems',
    'opportunities|gaps|missing|lacking|need|want|wish|solutions needed': 'find_opportunities',
    'solutions|tools|software|apps|services|platforms': 'find_solutions',
    'trends|popular|growing|hot|trending|latest': 'find_trends'
  }

  private static readonly TIME_PATTERNS = {
    'lately|recently|now|current|today|these days': 'week',
    'this week|past week': 'week',
    'this month|past month|monthly': 'month',
    'trending|hot|right now|today': 'day',
    'always|generally|overall|historically': 'all'
  }

  private static readonly PROBLEM_KEYWORDS = [
    'problem', 'issue', 'bug', 'error', 'fail', 'broken', 'slow', 'expensive',
    'difficult', 'hard', 'complicated', 'confusing', 'frustrated', 'annoying',
    'hate', 'terrible', 'awful', 'sucks', 'worst', 'pain', 'struggle',
    'lacking', 'missing', 'need', 'wish', 'want', 'help', 'solution'
  ]

  static parseInput(input: string): ParsedResearchInput {
    const lowerInput = input.toLowerCase()
    
    // Extract target audience
    const targetMatch = this.extractTarget(lowerInput)
    
    // Extract intent
    const intentMatch = this.extractIntent(lowerInput)
    
    // Extract timeframe
    const timeframe = this.extractTimeframe(lowerInput)
    
    // Generate search queries based on target and intent
    const searchQueries = this.generateSearchQueries(targetMatch.target, intentMatch)
    
    // Extract relevant keywords
    const keywords = this.extractKeywords(lowerInput, intentMatch)
    
    // Calculate confidence based on matches
    const confidence = this.calculateConfidence(targetMatch, intentMatch, lowerInput)
    
    return {
      target: targetMatch.target,
      intent: intentMatch,
      timeframe,
      subreddits: targetMatch.subreddits,
      searchQueries,
      keywords,
      confidence
    }
  }

  private static extractTarget(input: string): { target: string; subreddits: string[] } {
    for (const [pattern, config] of Object.entries(this.TARGET_PATTERNS)) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(input)) {
        return config
      }
    }
    
    // Default fallback
    return {
      target: 'Business owners',
      subreddits: ['entrepreneur', 'smallbusiness', 'startups', 'business']
    }
  }

  private static extractIntent(input: string): string {
    for (const [pattern, intent] of Object.entries(this.INTENT_PATTERNS)) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(input)) {
        return intent
      }
    }
    
    return 'find_problems' // Default intent
  }

  private static extractTimeframe(input: string): string {
    for (const [pattern, timeframe] of Object.entries(this.TIME_PATTERNS)) {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(input)) {
        return timeframe
      }
    }
    
    return 'week' // Default timeframe
  }

  private static generateSearchQueries(target: string, intent: string): string[] {
    const baseQueries = []
    
    // Add target-specific queries first
    if (target.toLowerCase().includes('recruitment') || target.toLowerCase().includes('recruiter')) {
      if (intent === 'find_problems') {
        baseQueries.push(
          'ATS problems',
          'recruiting software issues',
          'candidate sourcing problems',
          'interview scheduling',
          'applicant tracking system',
          'job posting issues'
        )
      }
      baseQueries.push(
        'recruitment challenges',
        'hiring difficulties',
        'candidate experience',
        'sourcing candidates'
      )
    }
    
    // Add general intent-based queries
    if (intent === 'find_problems') {
      baseQueries.push(
        'problem with',
        'issue with', 
        'frustrated with',
        'hate when',
        'difficult to',
        'struggling with',
        'need help with',
        'broken',
        'not working'
      )
    } else if (intent === 'find_opportunities') {
      baseQueries.push(
        'wish there was',
        'need a tool',
        'missing feature',
        'looking for',
        'does anyone know',
        'is there a way'
      )
    } else if (intent === 'find_solutions') {
      baseQueries.push(
        'what tool',
        'best software',
        'recommend',
        'alternatives to',
        'how do you'
      )
    }

    return baseQueries.slice(0, 10) // Increased limit since we have more time now
  }

  private static extractKeywords(input: string, intent: string): string[] {
    const words = input.toLowerCase().split(/\s+/)
    const keywords = []

    // Add intent-specific keywords
    if (intent === 'find_problems') {
      keywords.push(...this.PROBLEM_KEYWORDS.filter(keyword => 
        words.some(word => word.includes(keyword) || keyword.includes(word))
      ))
    }

    // Add domain-specific keywords based on common business terms
    const businessKeywords = [
      'inventory', 'shipping', 'payment', 'customer service', 'marketing',
      'analytics', 'conversion', 'retention', 'acquisition', 'automation',
      'integration', 'scalability', 'performance', 'security', 'pricing'
    ]

    keywords.push(...businessKeywords.filter(keyword =>
      words.some(word => word.includes(keyword) || keyword.includes(word))
    ))

    return [...new Set(keywords)].slice(0, 10) // Remove duplicates and limit
  }

  private static calculateConfidence(
    targetMatch: { target: string; subreddits: string[] },
    intent: string,
    input: string
  ): number {
    let confidence = 0.5 // Base confidence
    
    // Boost confidence based on clear target identification
    if (targetMatch.target !== 'Business owners') {
      confidence += 0.2
    }
    
    // Boost confidence based on clear intent words
    const intentWords = Object.keys(this.INTENT_PATTERNS).join('|')
    const intentRegex = new RegExp(intentWords, 'gi')
    const intentMatches = (input.match(intentRegex) || []).length
    confidence += Math.min(intentMatches * 0.1, 0.2)
    
    // Boost confidence based on timeframe clarity
    const timeWords = Object.keys(this.TIME_PATTERNS).join('|')
    const timeRegex = new RegExp(timeWords, 'gi')
    if (timeRegex.test(input)) {
      confidence += 0.1
    }
    
    return Math.min(confidence, 1.0)
  }

  // Helper method to validate parsed input
  static validateParsedInput(parsed: ParsedResearchInput): boolean {
    return (
      parsed.target.length > 0 &&
      parsed.subreddits.length > 0 &&
      parsed.searchQueries.length > 0 &&
      parsed.confidence > 0.3
    )
  }

  // Method to generate human-readable summary of parsing
  static generateSummary(parsed: ParsedResearchInput): string {
    const intentText = {
      'find_problems': 'problems and pain points',
      'find_opportunities': 'opportunities and gaps',
      'find_solutions': 'solutions and tools',
      'find_trends': 'trends and popular topics'
    }[parsed.intent] || 'insights'

    return `Looking for ${intentText} affecting ${parsed.target} over the ${parsed.timeframe === 'week' ? 'past week' : parsed.timeframe} across ${parsed.subreddits.length} relevant subreddits`
  }
}

export { NLPProcessor, type ParsedResearchInput }