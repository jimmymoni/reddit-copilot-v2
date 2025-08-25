interface Solution {
  name: string
  description: string
  website: string
  pricing: string
  rating: number
  reviewCount: number
  category: string
  source: 'shopify-apps' | 'chrome-extensions' | 'saas-directory' | 'github' | 'alternatives' | 'manual'
  tags: string[]
  lastUpdated: string
}

interface SolutionSearchResult {
  problemTitle: string
  solutions: Solution[]
  searchConfidence: number
  totalFound: number
}

class SolutionDiscovery {
  private static readonly SOLUTION_DATABASES = {
    // Built-in solution mappings for common problems
    payment: [
      {
        name: 'ReConvert',
        description: 'Post-purchase upsell and checkout optimization for Shopify',
        website: 'https://reconvert.com',
        pricing: '$4.95-$199/month',
        rating: 4.8,
        reviewCount: 1200,
        category: 'Payment Processing',
        source: 'shopify-apps' as const,
        tags: ['checkout', 'upsell', 'conversion'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Bold Cashier',
        description: 'Advanced checkout customization and payment processing',
        website: 'https://boldcommerce.com',
        pricing: '$29-$299/month',
        rating: 4.3,
        reviewCount: 800,
        category: 'Payment Processing',
        source: 'shopify-apps' as const,
        tags: ['checkout', 'payment', 'customization'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Stripe',
        description: 'Complete payment processing platform with global reach',
        website: 'https://stripe.com',
        pricing: '2.9% + 30¢ per transaction',
        rating: 4.5,
        reviewCount: 15000,
        category: 'Payment Processing',
        source: 'manual' as const,
        tags: ['payment', 'gateway', 'global', 'api'],
        lastUpdated: new Date().toISOString()
      }
    ],
    inventory: [
      {
        name: 'TradeGecko (now QuickBooks Commerce)',
        description: 'Comprehensive inventory management and B2B wholesale platform',
        website: 'https://quickbooks.intuit.com/commerce',
        pricing: '$39-$189/month',
        rating: 4.5,
        reviewCount: 2500,
        category: 'Inventory Management',
        source: 'saas-directory' as const,
        tags: ['inventory', 'wholesale', 'b2b', 'forecasting'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Cin7',
        description: 'Multi-channel inventory management with POS and ecommerce sync',
        website: 'https://cin7.com',
        pricing: '$299-$999/month',
        rating: 4.2,
        reviewCount: 1800,
        category: 'Inventory Management',
        source: 'saas-directory' as const,
        tags: ['inventory', 'pos', 'multi-channel', 'sync'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'StockTrim',
        description: 'AI-powered demand forecasting and inventory optimization',
        website: 'https://stocktrim.com',
        pricing: '$99-$499/month',
        rating: 4.6,
        reviewCount: 600,
        category: 'Inventory Management',
        source: 'saas-directory' as const,
        tags: ['inventory', 'forecasting', 'ai', 'optimization'],
        lastUpdated: new Date().toISOString()
      }
    ],
    shipping: [
      {
        name: 'ShipStation',
        description: 'Multi-carrier shipping software with automation and tracking',
        website: 'https://shipstation.com',
        pricing: '$9-$159/month',
        rating: 4.7,
        reviewCount: 5000,
        category: 'Shipping & Fulfillment',
        source: 'saas-directory' as const,
        tags: ['shipping', 'automation', 'tracking', 'multi-carrier'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Easyship',
        description: 'Global shipping platform with discounted rates and tracking',
        website: 'https://easyship.com',
        pricing: 'Free + per shipment fees',
        rating: 4.4,
        reviewCount: 3200,
        category: 'Shipping & Fulfillment',
        source: 'saas-directory' as const,
        tags: ['shipping', 'global', 'rates', 'tracking'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Route',
        description: 'Package tracking and shipping protection for customers',
        website: 'https://route.com',
        pricing: 'Free for merchants',
        rating: 4.8,
        reviewCount: 2100,
        category: 'Shipping & Fulfillment',
        source: 'shopify-apps' as const,
        tags: ['tracking', 'protection', 'customer-experience'],
        lastUpdated: new Date().toISOString()
      }
    ],
    customer_service: [
      {
        name: 'Zendesk',
        description: 'Complete customer service platform with ticketing and live chat',
        website: 'https://zendesk.com',
        pricing: '$19-$199/agent/month',
        rating: 4.3,
        reviewCount: 8000,
        category: 'Customer Service',
        source: 'saas-directory' as const,
        tags: ['support', 'ticketing', 'chat', 'knowledge-base'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Gorgias',
        description: 'Ecommerce-focused customer service platform with automation',
        website: 'https://gorgias.com',
        pricing: '$40-$900/month',
        rating: 4.6,
        reviewCount: 1500,
        category: 'Customer Service',
        source: 'saas-directory' as const,
        tags: ['support', 'ecommerce', 'automation', 'shopify'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Intercom',
        description: 'Conversational customer service with chatbots and automation',
        website: 'https://intercom.com',
        pricing: '$39-$999/month',
        rating: 4.5,
        reviewCount: 12000,
        category: 'Customer Service',
        source: 'saas-directory' as const,
        tags: ['chat', 'automation', 'conversation', 'support'],
        lastUpdated: new Date().toISOString()
      }
    ],
    marketing: [
      {
        name: 'Klaviyo',
        description: 'Advanced email marketing and automation for ecommerce',
        website: 'https://klaviyo.com',
        pricing: 'Free up to 250 contacts, then $20+/month',
        rating: 4.6,
        reviewCount: 4500,
        category: 'Marketing & Advertising',
        source: 'saas-directory' as const,
        tags: ['email', 'automation', 'ecommerce', 'segmentation'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Facebook Ads Manager',
        description: 'Meta\'s advertising platform for Facebook and Instagram',
        website: 'https://business.facebook.com',
        pricing: 'Pay per click/impression',
        rating: 4.1,
        reviewCount: 25000,
        category: 'Marketing & Advertising',
        source: 'manual' as const,
        tags: ['ads', 'facebook', 'instagram', 'social-media'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Privy',
        description: 'Email capture, pop-ups, and conversion optimization tools',
        website: 'https://privy.com',
        pricing: 'Free up to 100 mailable contacts, then $30+/month',
        rating: 4.4,
        reviewCount: 2800,
        category: 'Marketing & Advertising',
        source: 'shopify-apps' as const,
        tags: ['email-capture', 'popups', 'conversion', 'shopify'],
        lastUpdated: new Date().toISOString()
      }
    ],
    analytics: [
      {
        name: 'Google Analytics 4',
        description: 'Comprehensive web analytics and user behavior tracking',
        website: 'https://analytics.google.com',
        pricing: 'Free (GA4) / $150k+/year (GA360)',
        rating: 4.2,
        reviewCount: 50000,
        category: 'Analytics & Reporting',
        source: 'manual' as const,
        tags: ['analytics', 'tracking', 'behavior', 'reporting'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Hotjar',
        description: 'User behavior analytics with heatmaps and session recordings',
        website: 'https://hotjar.com',
        pricing: 'Free up to 35 sessions/day, then $32+/month',
        rating: 4.3,
        reviewCount: 8000,
        category: 'Analytics & Reporting',
        source: 'saas-directory' as const,
        tags: ['heatmaps', 'recordings', 'behavior', 'ux'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Triple Whale',
        description: 'Ecommerce analytics platform with attribution and reporting',
        website: 'https://triplewhale.com',
        pricing: '$129-$999/month',
        rating: 4.5,
        reviewCount: 1200,
        category: 'Analytics & Reporting',
        source: 'saas-directory' as const,
        tags: ['ecommerce', 'attribution', 'reporting', 'shopify'],
        lastUpdated: new Date().toISOString()
      }
    ],
    technical: [
      {
        name: 'Zapier',
        description: 'Automation platform connecting 5000+ apps with no-code workflows',
        website: 'https://zapier.com',
        pricing: 'Free up to 5 Zaps, then $20+/month',
        rating: 4.4,
        reviewCount: 15000,
        category: 'Integration & Automation',
        source: 'saas-directory' as const,
        tags: ['automation', 'integration', 'no-code', 'workflows'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Integromat (now Make)',
        description: 'Visual automation platform for complex integrations',
        website: 'https://make.com',
        pricing: 'Free up to 1000 operations, then $9+/month',
        rating: 4.6,
        reviewCount: 3500,
        category: 'Integration & Automation',
        source: 'saas-directory' as const,
        tags: ['automation', 'integration', 'visual', 'workflows'],
        lastUpdated: new Date().toISOString()
      },
      {
        name: 'Shopify Flow',
        description: 'Native Shopify automation for store workflows',
        website: 'https://shopify.com/plus/flow',
        pricing: 'Free with Shopify Plus',
        rating: 4.2,
        reviewCount: 800,
        category: 'Integration & Automation',
        source: 'shopify-apps' as const,
        tags: ['shopify', 'automation', 'workflows', 'native'],
        lastUpdated: new Date().toISOString()
      }
    ]
  }

  static async findSolutions(problemTitle: string, keywords: string[] = []): Promise<SolutionSearchResult> {
    console.log(`Finding solutions for: ${problemTitle}`)
    
    // Step 1: Determine problem category
    const category = this.categorizeProblem(problemTitle, keywords)
    console.log(`Categorized as: ${category}`)
    
    // Step 2: Get relevant solutions from our database
    const solutions = this.getSolutionsByCategory(category)
    
    // Step 3: Score and rank solutions based on relevance
    const scoredSolutions = this.scoreSolutions(solutions, problemTitle, keywords)
    
    // Step 4: Add some external solutions if we have few results
    const enrichedSolutions = await this.enrichWithExternalSolutions(
      scoredSolutions,
      problemTitle,
      category
    )
    
    return {
      problemTitle,
      solutions: enrichedSolutions.slice(0, 6), // Limit to top 6 solutions
      searchConfidence: this.calculateSearchConfidence(category, enrichedSolutions.length),
      totalFound: enrichedSolutions.length
    }
  }

  private static categorizeProblem(problemTitle: string, keywords: string[]): string {
    const text = `${problemTitle} ${keywords.join(' ')}`.toLowerCase()
    
    const categoryKeywords = {
      'payment': ['payment', 'checkout', 'billing', 'stripe', 'paypal', 'transaction', 'gateway'],
      'inventory': ['inventory', 'stock', 'warehouse', 'supplier', 'product', 'sku', 'forecasting'],
      'shipping': ['shipping', 'delivery', 'fulfillment', 'carrier', 'tracking', 'logistics'],
      'customer_service': ['customer', 'support', 'service', 'chat', 'ticket', 'help', 'complaint'],
      'marketing': ['marketing', 'email', 'ads', 'campaign', 'conversion', 'traffic', 'seo'],
      'analytics': ['analytics', 'data', 'report', 'metric', 'tracking', 'dashboard', 'insight'],
      'technical': ['integration', 'api', 'sync', 'automation', 'workflow', 'connect', 'export']
    }
    
    let bestCategory = 'general'
    let bestScore = 0
    
    for (const [category, categoryKeys] of Object.entries(categoryKeywords)) {
      let score = 0
      for (const keyword of categoryKeys) {
        if (text.includes(keyword)) {
          score += 1
        }
      }
      if (score > bestScore) {
        bestScore = score
        bestCategory = category
      }
    }
    
    return bestCategory
  }

  private static getSolutionsByCategory(category: string): Solution[] {
    return this.SOLUTION_DATABASES[category] || []
  }

  private static scoreSolutions(solutions: Solution[], problemTitle: string, keywords: string[]): Solution[] {
    const searchTerms = `${problemTitle} ${keywords.join(' ')}`.toLowerCase()
    
    return solutions
      .map(solution => {
        let score = solution.rating / 5 * 0.3 // Base rating score
        
        // Keyword matching in name and description
        const solutionText = `${solution.name} ${solution.description} ${solution.tags.join(' ')}`.toLowerCase()
        const matchingWords = searchTerms.split(/\s+/).filter(word => 
          word.length > 2 && solutionText.includes(word)
        )
        score += (matchingWords.length / searchTerms.split(/\s+/).length) * 0.4
        
        // Review count bonus (popularity)
        score += Math.min(solution.reviewCount / 10000, 0.2)
        
        // Recent update bonus
        const daysSinceUpdate = (Date.now() - new Date(solution.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceUpdate < 30) score += 0.1
        
        return { ...solution, relevanceScore: score }
      })
      .sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore)
      .map(({ relevanceScore, ...solution }) => solution) // Remove temporary score
  }

  private static async enrichWithExternalSolutions(
    existingSolutions: Solution[],
    problemTitle: string,
    category: string
  ): Promise<Solution[]> {
    // If we have enough solutions, return as is
    if (existingSolutions.length >= 4) {
      return existingSolutions
    }
    
    // Add some additional solutions based on common patterns
    const additionalSolutions = this.getAdditionalSolutions(category, problemTitle)
    
    return [...existingSolutions, ...additionalSolutions]
  }

  private static getAdditionalSolutions(category: string, problemTitle: string): Solution[] {
    // Generic solutions that could apply to multiple categories
    const genericSolutions: Record<string, Solution[]> = {
      'general': [
        {
          name: 'Custom Development',
          description: 'Build a custom solution tailored to your specific needs',
          website: 'https://upwork.com',
          pricing: '$25-150/hour',
          rating: 4.0,
          reviewCount: 0,
          category: 'Development',
          source: 'manual' as const,
          tags: ['custom', 'development', 'bespoke'],
          lastUpdated: new Date().toISOString()
        },
        {
          name: 'Airtable',
          description: 'Flexible database and workflow management platform',
          website: 'https://airtable.com',
          pricing: 'Free up to 1200 records, then $10+/month',
          rating: 4.4,
          reviewCount: 5000,
          category: 'Productivity',
          source: 'saas-directory' as const,
          tags: ['database', 'workflow', 'organization', 'no-code'],
          lastUpdated: new Date().toISOString()
        }
      ]
    }
    
    return genericSolutions[category] || genericSolutions['general']
  }

  private static calculateSearchConfidence(category: string, solutionCount: number): number {
    // Higher confidence for well-known categories with more solutions
    const categoryConfidence = {
      'payment': 0.9,
      'inventory': 0.8,
      'shipping': 0.8,
      'customer_service': 0.9,
      'marketing': 0.9,
      'analytics': 0.7,
      'technical': 0.6
    }[category] || 0.5
    
    const countBonus = Math.min(solutionCount / 10, 0.1)
    
    return Math.min(categoryConfidence + countBonus, 1.0)
  }

  // Method to add new solutions dynamically (for future expansion)
  static addSolution(category: string, solution: Omit<Solution, 'lastUpdated'>): void {
    if (!this.SOLUTION_DATABASES[category]) {
      this.SOLUTION_DATABASES[category] = []
    }
    
    this.SOLUTION_DATABASES[category].push({
      ...solution,
      lastUpdated: new Date().toISOString()
    })
  }

  // Method to get all available categories
  static getAvailableCategories(): string[] {
    return Object.keys(this.SOLUTION_DATABASES)
  }

  // Method to get solutions count by category
  static getSolutionStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [category, solutions] of Object.entries(this.SOLUTION_DATABASES)) {
      stats[category] = solutions.length
    }
    return stats
  }
}

export { SolutionDiscovery, type Solution, type SolutionSearchResult }