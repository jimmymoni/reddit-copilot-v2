import express from 'express'
import { NLPProcessor, type ParsedResearchInput } from '../services/nlp'
import { ProblemClusteringEngine, type ProblemCluster } from '../services/clustering'
import { SolutionDiscovery, type SolutionSearchResult } from '../services/solutions'
import { RedditService } from '../services/reddit'

const router = express.Router()

interface IntelligentResearchRequest {
  input: string // Natural language input like "I want to find what Shopify store owners are lately bothered with"
}

interface IntelligentResearchResponse {
  originalInput: string
  parsed: ParsedResearchInput
  summary: string
  totalThreadsAnalyzed: number
  problemClusters: EnrichedProblemCluster[]
  insights: ResearchInsights
  confidence: number
  processingTime: number
}

interface EnrichedProblemCluster extends ProblemCluster {
  existingSolutions: SolutionSearchResult
  opportunityScore: number
  marketSizeIndicator: 'small' | 'medium' | 'large'
}

interface ResearchInsights {
  topProblems: string[]
  emergingTrends: string[]
  solutionGaps: string[]
  marketOpportunities: string[]
  actionableRecommendations: string[]
}

// Patient search engine that respects Reddit API rate limits
class PatientSearchEngine {
  private static readonly DELAY_BETWEEN_REQUESTS = 1000 // 1 second between requests
  private static readonly MAX_RETRIES = 3
  private static readonly INITIAL_RETRY_DELAY = 2000 // 2 seconds
  
  static async search(params: {
    subreddits: string[]
    queries: string[]
    timeframe: string
    keywords: string[]
    redditId: string
  }): Promise<any[]> {
    const { subreddits, queries, timeframe, keywords, redditId } = params
    
    console.log(`🔍 Starting patient search: ${subreddits.length} subreddits, ${queries.length} queries, ${timeframe} timeframe`)
    console.log(`📡 Using rate-limited approach - this may take 30-60 seconds for comprehensive results`)
    
    const allThreads: any[] = []
    const maxThreadsPerQuery = 20 // More threads per query since we're being patient
    
    // Build search queue with priorities
    const searchQueue = []
    
    // Priority 1: Core queries in relevant subreddits
    for (const subreddit of subreddits.slice(0, 5)) {
      for (const query of queries.slice(0, 6)) {
        searchQueue.push({
          subreddit,
          query,
          priority: 1,
          type: 'query'
        })
      }
    }
    
    // Priority 2: Keyword searches in top subreddits
    if (keywords.length > 0) {
      for (const subreddit of subreddits.slice(0, 3)) {
        for (const keyword of keywords.slice(0, 4)) {
          searchQueue.push({
            subreddit,
            query: keyword,
            priority: 2,
            type: 'keyword'
          })
        }
      }
    }
    
    // Sort by priority
    searchQueue.sort((a, b) => a.priority - b.priority)
    
    console.log(`📋 Search queue prepared: ${searchQueue.length} searches to execute`)
    
    // Execute searches sequentially with delays
    let completedSearches = 0
    const totalSearches = searchQueue.length
    
    for (const searchItem of searchQueue) {
      const { subreddit, query, type } = searchItem
      completedSearches++
      
      console.log(`🔍 [${completedSearches}/${totalSearches}] Searching r/${subreddit} for "${query}" (${type})`)
      
      try {
        const results = await this.searchWithRetry(redditId, subreddit, query, timeframe, maxThreadsPerQuery)
        if (results.length > 0) {
          allThreads.push(...results)
          console.log(`✅ Found ${results.length} threads in r/${subreddit}`)
        } else {
          console.log(`⚪ No results in r/${subreddit} for "${query}"`)
        }
      } catch (error) {
        console.error(`❌ Failed search in r/${subreddit} for "${query}":`, error.message)
        // Continue with other searches even if one fails
      }
      
      // Delay between requests to respect rate limits (except for last request)
      if (completedSearches < totalSearches) {
        console.log(`⏳ Waiting ${this.DELAY_BETWEEN_REQUESTS}ms before next request...`)
        await this.sleep(this.DELAY_BETWEEN_REQUESTS)
      }
    }
    
    // Remove duplicates based on thread ID
    const uniqueThreads = Array.from(
      new Map(allThreads.map(thread => [thread.id, thread])).values()
    )
    
    // Filter for quality threads with more lenient criteria
    const qualityThreads = uniqueThreads.filter(thread => 
      thread.selftext && 
      thread.selftext.length > 20 && // Slightly lower threshold
      thread.score >= 0 && // Allow 0 score threads
      !thread.title.toLowerCase().includes('[deleted]') &&
      !thread.title.toLowerCase().includes('[removed]')
    )
    
    console.log(`🎯 Search completed: ${uniqueThreads.length} unique threads, ${qualityThreads.length} quality threads`)
    
    return qualityThreads.slice(0, 150) // Allow more threads for analysis
  }
  
  private static async searchWithRetry(
    redditId: string, 
    subreddit: string, 
    query: string, 
    timeframe: string, 
    maxResults: number,
    retryCount: number = 0
  ): Promise<any[]> {
    try {
      const results = await RedditService.searchSubreddit(redditId, subreddit, query, timeframe)
      return results.slice(0, maxResults)
    } catch (error) {
      // Check if it's a rate limit error
      if (error.statusCode === 429 && retryCount < this.MAX_RETRIES) {
        const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, retryCount) // Exponential backoff
        console.log(`⚠️  Rate limited! Retrying in ${delay}ms (attempt ${retryCount + 1}/${this.MAX_RETRIES})`)
        await this.sleep(delay)
        return this.searchWithRetry(redditId, subreddit, query, timeframe, maxResults, retryCount + 1)
      }
      
      // Re-throw error if not rate limit or max retries exceeded
      throw error
    }
  }
  
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Main intelligent research endpoint
router.post('/', async (req, res) => {
  const startTime = Date.now()
  
  try {
    const redditId = req.headers['x-reddit-id'] as string
    if (!redditId) {
      return res.status(401).json({ error: 'Reddit ID required' })
    }

    const { input }: IntelligentResearchRequest = req.body
    
    if (!input || input.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Input required. Please describe what you want to research.',
        example: 'I want to find what Shopify store owners are lately bothered with'
      })
    }

    console.log(`Starting intelligent research for: "${input}"`)

    // Step 1: Parse natural language input
    const parsed = NLPProcessor.parseInput(input)
    
    if (!NLPProcessor.validateParsedInput(parsed)) {
      return res.status(400).json({
        error: 'Could not understand the research request',
        parsed,
        suggestion: 'Try being more specific about the target audience and what you want to find'
      })
    }
    
    const summary = NLPProcessor.generateSummary(parsed)
    console.log(`Parsed input: ${summary}`)

    // Step 2: Execute patient search based on parsing
    const threads = await PatientSearchEngine.search({
      subreddits: parsed.subreddits,
      queries: parsed.searchQueries,
      timeframe: parsed.timeframe,
      keywords: parsed.keywords,
      redditId
    })

    if (threads.length === 0) {
      return res.json({
        originalInput: input,
        parsed,
        summary,
        totalThreadsAnalyzed: 0,
        problemClusters: [],
        insights: generateEmptyInsights(),
        confidence: 0,
        processingTime: Date.now() - startTime,
        message: 'No relevant discussions found. Try adjusting your search terms or timeframe.'
      })
    }

    // Step 3: Cluster similar problems and count frequency
    console.log(`Clustering ${threads.length} threads...`)
    const problemClusters = await ProblemClusteringEngine.clusterThreads(threads)
    console.log(`Created ${problemClusters.length} problem clusters`)

    // Step 4: Find existing solutions for each problem cluster
    const enrichedClusters: EnrichedProblemCluster[] = await Promise.all(
      problemClusters.map(async (cluster) => {
        const solutions = await SolutionDiscovery.findSolutions(cluster.title, cluster.keywords)
        const opportunityScore = calculateOpportunityScore(cluster, solutions)
        const marketSizeIndicator = determineMarketSize(cluster)
        
        return {
          ...cluster,
          existingSolutions: solutions,
          opportunityScore,
          marketSizeIndicator
        }
      })
    )

    // Step 5: Generate insights and recommendations
    const insights = generateInsights(enrichedClusters, parsed.target)
    
    // Calculate overall confidence
    const confidence = calculateOverallConfidence(parsed.confidence, enrichedClusters, threads.length)

    const response: IntelligentResearchResponse = {
      originalInput: input,
      parsed,
      summary,
      totalThreadsAnalyzed: threads.length,
      problemClusters: enrichedClusters.sort((a, b) => b.opportunityScore - a.opportunityScore),
      insights,
      confidence,
      processingTime: Date.now() - startTime
    }

    console.log(`Research completed in ${response.processingTime}ms`)
    
    res.json(response)

  } catch (error) {
    console.error('Intelligent research error:', error)
    res.status(500).json({ 
      error: 'Research failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    })
  }
})

// Helper function to calculate opportunity score for a problem cluster
function calculateOpportunityScore(cluster: ProblemCluster, solutions: SolutionSearchResult): number {
  let score = 0
  
  // Base score from thread count and engagement
  score += Math.min(cluster.threadCount / 20, 0.3) // Max 30 points for frequency
  score += Math.min(cluster.severity, 0.2) // Max 20 points for severity  
  score += Math.min(cluster.avgScore / 100, 0.1) // Max 10 points for average thread score
  
  // Bonus for trending problems
  if (cluster.trendDirection === 'rising') score += 0.15
  
  // Solution landscape analysis
  const solutionCount = solutions.solutions.length
  if (solutionCount === 0) {
    score += 0.2 // High opportunity if no solutions exist
  } else if (solutionCount < 3) {
    score += 0.1 // Medium opportunity if few solutions exist  
  } else {
    score -= 0.05 // Lower opportunity if many solutions exist
  }
  
  // Average solution rating impact
  const avgSolutionRating = solutions.solutions.reduce((sum, s) => sum + s.rating, 0) / solutionCount
  if (avgSolutionRating < 4.0 && solutionCount > 0) {
    score += 0.1 // Opportunity if existing solutions are poorly rated
  }
  
  return Math.min(Math.max(score, 0), 1) // Clamp between 0 and 1
}

// Helper function to determine market size indicator
function determineMarketSize(cluster: ProblemCluster): 'small' | 'medium' | 'large' {
  const totalEngagement = cluster.threadCount + cluster.totalComments + (cluster.avgScore * cluster.threadCount)
  
  if (totalEngagement > 500) return 'large'
  if (totalEngagement > 150) return 'medium'
  return 'small'
}

// Helper function to generate insights from clustered data
function generateInsights(clusters: EnrichedProblemCluster[], target: string): ResearchInsights {
  const topProblems = clusters
    .slice(0, 5)
    .map(cluster => cluster.title)
  
  const emergingTrends = clusters
    .filter(cluster => cluster.trendDirection === 'rising')
    .slice(0, 3)
    .map(cluster => cluster.title)
  
  const solutionGaps = clusters
    .filter(cluster => cluster.existingSolutions.solutions.length <= 2)
    .slice(0, 3)
    .map(cluster => cluster.title)
  
  const marketOpportunities = clusters
    .filter(cluster => cluster.opportunityScore > 0.6)
    .slice(0, 4)
    .map(cluster => `${cluster.title} (${cluster.threadCount} discussions)`)
  
  const actionableRecommendations = generateRecommendations(clusters, target)
  
  return {
    topProblems,
    emergingTrends,
    solutionGaps,
    marketOpportunities,
    actionableRecommendations
  }
}

// Helper function to generate actionable recommendations
function generateRecommendations(clusters: EnrichedProblemCluster[], target: string): string[] {
  const recommendations = []
  
  // Recommendation based on top opportunity
  const topOpportunity = clusters[0]
  if (topOpportunity) {
    recommendations.push(`Consider developing a solution for ${topOpportunity.title.toLowerCase()} - ${topOpportunity.threadCount} ${target.toLowerCase()} are discussing this`)
  }
  
  // Recommendation based on solution gaps
  const gapOpportunities = clusters.filter(c => c.existingSolutions.solutions.length <= 2)
  if (gapOpportunities.length > 0) {
    recommendations.push(`Significant opportunity in ${gapOpportunities[0].title.toLowerCase()} with limited existing solutions`)
  }
  
  // Recommendation based on trends
  const risingTrends = clusters.filter(c => c.trendDirection === 'rising')
  if (risingTrends.length > 0) {
    recommendations.push(`Monitor ${risingTrends[0].title.toLowerCase()} as it's showing rising interest`)
  }
  
  // General market recommendation
  if (clusters.length > 3) {
    const totalThreads = clusters.reduce((sum, c) => sum + c.threadCount, 0)
    recommendations.push(`${totalThreads} total discussions analyzed - strong market validation for solutions in this space`)
  }
  
  return recommendations.slice(0, 4) // Limit recommendations
}

// Helper function to generate empty insights for no-results cases
function generateEmptyInsights(): ResearchInsights {
  return {
    topProblems: [],
    emergingTrends: [],
    solutionGaps: [],
    marketOpportunities: [],
    actionableRecommendations: ['Try a different search term or expand your timeframe', 'Consider researching a broader audience segment']
  }
}

// Helper function to calculate overall confidence
function calculateOverallConfidence(parseConfidence: number, clusters: EnrichedProblemCluster[], threadCount: number): number {
  let confidence = parseConfidence * 0.3 // 30% from parsing confidence
  
  // Add confidence from thread count
  confidence += Math.min(threadCount / 50, 0.3) // Up to 30% from thread count
  
  // Add confidence from cluster quality
  if (clusters.length > 0) {
    const avgClusterConfidence = clusters.reduce((sum, c) => sum + c.confidence, 0) / clusters.length
    confidence += avgClusterConfidence * 0.4 // Up to 40% from clustering confidence
  }
  
  return Math.min(confidence, 1.0)
}

// Test endpoint for validating NLP parsing
router.post('/test-parsing', async (req, res) => {
  try {
    const { input } = req.body
    const parsed = NLPProcessor.parseInput(input)
    const summary = NLPProcessor.generateSummary(parsed)
    
    res.json({
      input,
      parsed,
      summary,
      isValid: NLPProcessor.validateParsedInput(parsed)
    })
  } catch (error) {
    res.status(500).json({ error: 'Parsing failed', details: error instanceof Error ? error.message : 'Unknown error' })
  }
})

export default router