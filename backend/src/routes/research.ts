import express from 'express'
import { RedditService } from '../services/reddit'
import { kimiService } from '../services/kimi'

const router = express.Router()

interface ResearchRequest {
  niche: string
  timeframe: 'day' | 'week' | 'month' | 'all'
}

interface PainPoint {
  id: string
  title: string
  description: string
  subreddit: string
  score: number
  mentions: number
  urgency: 'high' | 'medium' | 'low'
  opportunity: string
  postUrl: string
  extractedAt: string
}

// Research pain points for a given niche
router.post('/', async (req, res) => {
  try {
    const redditId = req.headers['x-reddit-id'] as string
    if (!redditId) {
      return res.status(401).json({ error: 'Reddit ID required' })
    }

    const { niche, timeframe }: ResearchRequest = req.body
    
    if (!niche || !timeframe) {
      return res.status(400).json({ error: 'Niche and timeframe are required' })
    }

    console.log(`Starting research for niche: ${niche}, timeframe: ${timeframe}`)

    // Get relevant subreddits for the niche
    const subreddits = await getRelevantSubreddits(niche)
    console.log(`Found ${subreddits.length} relevant subreddits:`, subreddits)

    // Search for pain points across these subreddits
    const rawPosts = await searchPainPoints(redditId, subreddits, niche, timeframe)
    console.log(`Found ${rawPosts.length} potential pain point posts`)

    // If no posts found, return some demo data to show the UI works
    if (rawPosts.length === 0) {
      const demoPainPoints = createDemoData(niche)
      return res.json({ 
        painPoints: demoPainPoints,
        totalFound: demoPainPoints.length,
        subredditsSearched: subreddits.length,
        demo: true
      })
    }

    // Analyze with Kimi K2 to extract pain points and opportunities
    const painPoints = await analyzePainPoints(rawPosts, niche)
    console.log(`Extracted ${painPoints.length} pain points`)

    res.json({ 
      painPoints: painPoints.slice(0, 20), // Limit to top 20
      totalFound: painPoints.length,
      subredditsSearched: subreddits.length
    })

  } catch (error) {
    console.error('Research error:', error)
    res.status(500).json({ error: 'Failed to research pain points' })
  }
})

// Get relevant subreddits for a niche
async function getRelevantSubreddits(niche: string): Promise<string[]> {
  const nicheMapping: Record<string, string[]> = {
    'shopify': ['shopify', 'ecommerce', 'dropship', 'entrepreneur', 'smallbusiness', 'marketing'],
    'saas': ['saas', 'entrepreneur', 'startups', 'webdev', 'programming', 'smallbusiness'],
    'ecommerce': ['ecommerce', 'shopify', 'amazon', 'dropship', 'entrepreneur', 'marketing'],
    'dropshipping': ['dropship', 'ecommerce', 'shopify', 'entrepreneur', 'amazon', 'marketing'],
    'marketing': ['marketing', 'digitalmarketing', 'entrepreneur', 'smallbusiness', 'saas'],
    'fitness': ['fitness', 'gym', 'bodybuilding', 'loseit', 'nutrition', 'workout'],
    'finance': ['personalfinance', 'investing', 'entrepreneur', 'smallbusiness', 'financialindependence'],
    'productivity': ['productivity', 'getmotivated', 'entrepreneur', 'programming', 'smallbusiness'],
    'programming': ['programming', 'webdev', 'javascript', 'python', 'react', 'node'],
    'design': ['design', 'graphic_design', 'webdesign', 'userexperience', 'ui_design']
  }

  const lowerNiche = niche.toLowerCase()
  
  // Direct match
  if (nicheMapping[lowerNiche]) {
    return nicheMapping[lowerNiche]
  }

  // Partial match
  for (const [key, subreddits] of Object.entries(nicheMapping)) {
    if (lowerNiche.includes(key) || key.includes(lowerNiche)) {
      return subreddits
    }
  }

  // Default fallback
  return ['entrepreneur', 'smallbusiness', 'startups', 'saas']
}

// Search for pain points in subreddits
async function searchPainPoints(redditId: string, subreddits: string[], niche: string, timeframe: string) {
  const painKeywords = [
    'problem', 'issue', 'frustrated', 'annoying', 'difficult', 'hard', 
    'struggle', 'pain', 'hate', 'wish', 'need', 'lacking', 'missing',
    'broken', 'buggy', 'slow', 'expensive', 'overpriced', 'sucks',
    'terrible', 'awful', 'worst', 'complicated', 'confusing'
  ]

  const allPosts = []

  for (const subreddit of subreddits) {
    try {
      console.log(`Searching r/${subreddit} for pain points...`)
      
      // Search with pain keywords
      for (const keyword of painKeywords.slice(0, 5)) { // Limit API calls
        const posts = await RedditService.searchSubreddit(redditId, subreddit, keyword, timeframe)
        allPosts.push(...posts.slice(0, 10)) // Limit per keyword
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
    } catch (error) {
      console.error(`Error searching r/${subreddit}:`, error)
    }
  }

  // Remove duplicates and filter relevant posts
  const uniquePosts = Array.from(
    new Map(allPosts.map(post => [post.id, post])).values()
  ).filter(post => 
    post.selftext.length > 50 && // Substantial content
    post.score > 1 && // Some engagement
    (post.title.toLowerCase().includes(niche.toLowerCase()) || 
     post.selftext.toLowerCase().includes(niche.toLowerCase()))
  )

  return uniquePosts.slice(0, 50) // Limit for analysis
}

// Analyze posts with Kimi K2 to extract pain points
async function analyzePainPoints(posts: any[], niche: string): Promise<PainPoint[]> {
  const painPoints: PainPoint[] = []

  for (const post of posts) {
    try {
      const analysis = await kimiService.analyzePainPoint(post, niche)
      
      if (analysis.isPainPoint) {
        painPoints.push({
          id: post.id,
          title: post.title,
          description: analysis.painDescription,
          subreddit: post.subreddit,
          score: analysis.opportunityScore,
          mentions: 1, // TODO: Count mentions across posts
          urgency: analysis.urgency,
          opportunity: analysis.saasOpportunity,
          postUrl: `https://reddit.com${post.permalink}`,
          extractedAt: new Date().toLocaleDateString()
        })
      }

      // Rate limiting for API calls
      await new Promise(resolve => setTimeout(resolve, 200))
      
    } catch (error) {
      console.error(`Error analyzing post ${post.id}:`, error)
    }
  }

  // Sort by opportunity score
  return painPoints.sort((a, b) => b.score - a.score)
}

// Create demo data to show UI functionality
function createDemoData(niche: string): PainPoint[] {
  const demoData: Record<string, PainPoint[]> = {
    'ecommerce': [
      {
        id: 'demo1',
        title: 'Inventory management is killing my store',
        description: 'Constantly running out of stock or overstocking. Need better forecasting.',
        subreddit: 'ecommerce',
        score: 85,
        mentions: 23,
        urgency: 'high',
        opportunity: 'AI-powered inventory forecasting SaaS with demand prediction',
        postUrl: 'https://reddit.com/demo',
        extractedAt: 'Today'
      },
      {
        id: 'demo2', 
        title: 'Customer support tickets overwhelming my team',
        description: 'Getting 100+ support tickets daily, response time suffering.',
        subreddit: 'entrepreneur',
        score: 78,
        mentions: 15,
        urgency: 'high',
        opportunity: 'Automated customer support triage and response system',
        postUrl: 'https://reddit.com/demo',
        extractedAt: 'Today'
      }
    ],
    'shopify': [
      {
        id: 'demo3',
        title: 'Shopify app review management nightmare',
        description: 'Managing reviews across multiple apps and channels is chaotic.',
        subreddit: 'shopify',
        score: 72,
        mentions: 18,
        urgency: 'medium',
        opportunity: 'Centralized review management dashboard for Shopify stores',
        postUrl: 'https://reddit.com/demo',
        extractedAt: 'Today'
      },
      {
        id: 'demo4',
        title: 'SEO optimization too complex for small stores',
        description: 'Need simple SEO tools that actually work for Shopify.',
        subreddit: 'shopify',
        score: 69,
        mentions: 12,
        urgency: 'medium',
        opportunity: 'Simplified SEO automation specifically for Shopify stores',
        postUrl: 'https://reddit.com/demo',
        extractedAt: 'Today'
      }
    ]
  }

  const lowerNiche = niche.toLowerCase()
  return demoData[lowerNiche] || demoData['ecommerce']
}

export default router