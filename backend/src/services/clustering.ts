interface ProblemCluster {
  id: string
  title: string                 // "Payment Processing Issues"
  description: string
  threadCount: number          // 15 similar threads
  threads: ClusteredThread[]
  severity: number            // weighted by upvotes/comments
  trendDirection: 'rising' | 'stable' | 'declining'
  confidence: number          // how sure we are about this cluster
  keywords: string[]          // extracted key terms
  avgScore: number           // average thread score
  totalComments: number      // total comments across threads
}

interface ClusteredThread {
  id: string
  title: string
  selftext: string
  similarity: number          // 0.85 similarity to cluster
  subreddit: string
  score: number
  num_comments: number
  url: string
  created_utc: number
  author: string
}

interface ProblemVector {
  keywords: Map<string, number>  // keyword -> frequency
  sentiment: number             // -1 to 1
  urgency: number              // 0 to 1
  category: string             // inferred category
}

class ProblemClusteringEngine {
  private static readonly MIN_CLUSTER_SIZE = 2
  private static readonly MAX_CLUSTERS = 10
  private static readonly SIMILARITY_THRESHOLD = 0.6

  // Main clustering method
  static async clusterThreads(threads: any[]): Promise<ProblemCluster[]> {
    console.log(`Clustering ${threads.length} threads...`)
    
    // Step 1: Extract problem vectors from each thread
    const threadVectors = threads.map(thread => ({
      thread,
      vector: this.extractProblemVector(thread)
    }))

    // Step 2: Perform similarity-based clustering
    const clusters = this.performClustering(threadVectors)
    console.log(`Created ${clusters.length} initial clusters`)

    // Step 3: Enrich clusters with metadata
    const enrichedClusters = await Promise.all(
      clusters.map(cluster => this.enrichCluster(cluster))
    )

    // Step 4: Sort by relevance (thread count + severity)
    return enrichedClusters
      .sort((a, b) => (b.threadCount * b.severity) - (a.threadCount * a.severity))
      .slice(0, this.MAX_CLUSTERS)
  }

  private static extractProblemVector(thread: any): ProblemVector {
    const text = `${thread.title} ${thread.selftext || ''}`.toLowerCase()
    
    // Extract keywords with frequency
    const keywords = new Map<string, number>()
    
    // Problem-specific keywords
    const problemKeywords = [
      'payment', 'checkout', 'billing', 'subscription', 'refund', 'charge',
      'inventory', 'stock', 'supplier', 'warehouse', 'fulfillment',
      'shipping', 'delivery', 'tracking', 'customs', 'logistics',
      'customer', 'support', 'service', 'complaint', 'return', 'dispute',
      'marketing', 'ads', 'conversion', 'traffic', 'seo', 'social',
      'analytics', 'data', 'tracking', 'metrics', 'reports', 'dashboard',
      'integration', 'api', 'sync', 'export', 'import', 'automation',
      'performance', 'slow', 'speed', 'loading', 'downtime', 'crash',
      'security', 'fraud', 'hack', 'breach', 'privacy', 'compliance',
      'pricing', 'cost', 'expensive', 'budget', 'fee', 'commission'
    ]

    // Count keyword frequencies
    for (const keyword of problemKeywords) {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi')
      const matches = text.match(regex) || []
      if (matches.length > 0) {
        keywords.set(keyword, matches.length)
      }
    }

    // Calculate sentiment (simple approach)
    const negativeWords = ['hate', 'terrible', 'awful', 'worst', 'broken', 'frustrated', 'annoying', 'sucks']
    const positiveWords = ['love', 'great', 'amazing', 'best', 'awesome', 'perfect', 'excellent']
    
    let sentiment = 0
    for (const word of negativeWords) {
      sentiment -= (text.split(word).length - 1) * 0.1
    }
    for (const word of positiveWords) {
      sentiment += (text.split(word).length - 1) * 0.1
    }
    sentiment = Math.max(-1, Math.min(1, sentiment))

    // Calculate urgency based on keywords and context
    const urgencyIndicators = ['urgent', 'asap', 'immediately', 'critical', 'emergency', 'broken', 'down', 'not working']
    let urgency = 0
    for (const indicator of urgencyIndicators) {
      if (text.includes(indicator)) {
        urgency += 0.2
      }
    }
    urgency = Math.min(1, urgency)

    // Infer category based on dominant keywords
    const category = this.inferCategory(keywords)

    return {
      keywords,
      sentiment,
      urgency,
      category
    }
  }

  private static inferCategory(keywords: Map<string, number>): string {
    const categories = {
      'payment': ['payment', 'checkout', 'billing', 'subscription', 'refund', 'charge'],
      'inventory': ['inventory', 'stock', 'supplier', 'warehouse', 'fulfillment'],
      'shipping': ['shipping', 'delivery', 'tracking', 'customs', 'logistics'],
      'customer_service': ['customer', 'support', 'service', 'complaint', 'return', 'dispute'],
      'marketing': ['marketing', 'ads', 'conversion', 'traffic', 'seo', 'social'],
      'analytics': ['analytics', 'data', 'tracking', 'metrics', 'reports', 'dashboard'],
      'technical': ['integration', 'api', 'sync', 'export', 'import', 'automation', 'performance', 'slow'],
      'security': ['security', 'fraud', 'hack', 'breach', 'privacy', 'compliance'],
      'pricing': ['pricing', 'cost', 'expensive', 'budget', 'fee', 'commission']
    }

    let maxScore = 0
    let bestCategory = 'general'

    for (const [category, categoryKeywords] of Object.entries(categories)) {
      let score = 0
      for (const keyword of categoryKeywords) {
        score += keywords.get(keyword) || 0
      }
      if (score > maxScore) {
        maxScore = score
        bestCategory = category
      }
    }

    return bestCategory
  }

  private static performClustering(threadVectors: { thread: any; vector: ProblemVector }[]): Array<{ threads: any[]; centroid: ProblemVector }> {
    const clusters: Array<{ threads: any[]; centroid: ProblemVector }> = []

    for (const item of threadVectors) {
      let bestCluster = null
      let bestSimilarity = 0

      // Find the most similar existing cluster
      for (const cluster of clusters) {
        const similarity = this.calculateSimilarity(item.vector, cluster.centroid)
        if (similarity > bestSimilarity && similarity >= this.SIMILARITY_THRESHOLD) {
          bestSimilarity = similarity
          bestCluster = cluster
        }
      }

      if (bestCluster) {
        // Add to existing cluster
        bestCluster.threads.push(item.thread)
        bestCluster.centroid = this.updateCentroid(bestCluster.centroid, item.vector, bestCluster.threads.length)
      } else {
        // Create new cluster
        clusters.push({
          threads: [item.thread],
          centroid: item.vector
        })
      }
    }

    // Filter out clusters that are too small
    return clusters.filter(cluster => cluster.threads.length >= this.MIN_CLUSTER_SIZE)
  }

  private static calculateSimilarity(vector1: ProblemVector, vector2: ProblemVector): number {
    // Category similarity
    const categoryMatch = vector1.category === vector2.category ? 0.3 : 0

    // Keyword similarity (Jaccard similarity)
    const keywords1 = new Set(vector1.keywords.keys())
    const keywords2 = new Set(vector2.keywords.keys())
    const intersection = new Set([...keywords1].filter(k => keywords2.has(k)))
    const union = new Set([...keywords1, ...keywords2])
    const keywordSimilarity = union.size > 0 ? intersection.size / union.size : 0

    // Sentiment similarity
    const sentimentSimilarity = 1 - Math.abs(vector1.sentiment - vector2.sentiment)

    // Urgency similarity
    const urgencySimilarity = 1 - Math.abs(vector1.urgency - vector2.urgency)

    // Weighted average
    return (
      categoryMatch * 0.4 +
      keywordSimilarity * 0.4 +
      sentimentSimilarity * 0.1 +
      urgencySimilarity * 0.1
    )
  }

  private static updateCentroid(centroid: ProblemVector, newVector: ProblemVector, clusterSize: number): ProblemVector {
    // Simple centroid update - could be more sophisticated
    const updatedKeywords = new Map(centroid.keywords)
    
    for (const [keyword, freq] of newVector.keywords) {
      const currentFreq = updatedKeywords.get(keyword) || 0
      updatedKeywords.set(keyword, (currentFreq + freq) / clusterSize)
    }

    return {
      keywords: updatedKeywords,
      sentiment: (centroid.sentiment + newVector.sentiment) / 2,
      urgency: (centroid.urgency + newVector.urgency) / 2,
      category: centroid.category // Keep original category
    }
  }

  private static async enrichCluster(cluster: { threads: any[]; centroid: ProblemVector }): Promise<ProblemCluster> {
    const threads: ClusteredThread[] = cluster.threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      selftext: thread.selftext || '',
      similarity: 0.8, // Could calculate actual similarity to centroid
      subreddit: thread.subreddit,
      score: thread.score,
      num_comments: thread.num_comments,
      url: `https://reddit.com${thread.permalink}`,
      created_utc: thread.created_utc,
      author: thread.author || '[deleted]'
    }))

    // Generate cluster title and description
    const { title, description } = this.generateClusterMetadata(cluster.threads, cluster.centroid)

    // Calculate metrics
    const avgScore = threads.reduce((sum, t) => sum + t.score, 0) / threads.length
    const totalComments = threads.reduce((sum, t) => sum + t.num_comments, 0)
    const severity = this.calculateSeverity(threads, cluster.centroid)
    const trendDirection = this.analyzeTrend(threads)
    
    // Extract top keywords
    const keywords = Array.from(cluster.centroid.keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword)

    return {
      id: this.generateClusterId(cluster.centroid.category, keywords[0]),
      title,
      description,
      threadCount: threads.length,
      threads,
      severity,
      trendDirection,
      confidence: Math.min(0.9, threads.length / 10), // Higher confidence with more threads
      keywords,
      avgScore,
      totalComments
    }
  }

  private static generateClusterMetadata(threads: any[], centroid: ProblemVector): { title: string; description: string } {
    // Get most common keywords
    const topKeywords = Array.from(centroid.keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([keyword]) => keyword)

    // Generate title based on category and keywords
    const categoryTitles = {
      'payment': 'Payment Processing Issues',
      'inventory': 'Inventory Management Problems',
      'shipping': 'Shipping and Fulfillment Challenges',
      'customer_service': 'Customer Service Difficulties',
      'marketing': 'Marketing and Advertising Issues',
      'analytics': 'Analytics and Reporting Problems',
      'technical': 'Technical Integration Issues',
      'security': 'Security and Fraud Concerns',
      'pricing': 'Pricing and Cost Issues',
      'general': 'General Business Challenges'
    }

    const title = categoryTitles[centroid.category] || `${topKeywords[0]?.toUpperCase()} Related Issues`

    // Generate description
    const commonPatterns = this.findCommonPatterns(threads)
    const description = `Business owners experiencing ${centroid.category.replace('_', ' ')} related challenges. ${commonPatterns}`

    return { title, description }
  }

  private static findCommonPatterns(threads: any[]): string {
    // Simple pattern detection - could be more sophisticated
    const patterns = []
    
    if (threads.some(t => t.title.toLowerCase().includes('slow'))) {
      patterns.push('performance issues')
    }
    if (threads.some(t => t.title.toLowerCase().includes('expensive'))) {
      patterns.push('cost concerns')
    }
    if (threads.some(t => t.selftext.toLowerCase().includes('integration'))) {
      patterns.push('integration difficulties')
    }

    return patterns.length > 0 ? `Common themes include ${patterns.join(', ')}.` : 'Various related challenges reported.'
  }

  private static calculateSeverity(threads: ClusteredThread[], centroid: ProblemVector): number {
    // Factor in urgency, thread scores, and comment count
    const avgUrgency = centroid.urgency
    const avgScore = threads.reduce((sum, t) => sum + t.score, 0) / threads.length
    const avgComments = threads.reduce((sum, t) => sum + t.num_comments, 0) / threads.length
    
    // Normalize and combine factors
    const normalizedScore = Math.min(avgScore / 100, 1) // Assume 100 is high score
    const normalizedComments = Math.min(avgComments / 50, 1) // Assume 50 is high comment count
    
    return Math.min(1, (avgUrgency * 0.4 + normalizedScore * 0.3 + normalizedComments * 0.3))
  }

  private static analyzeTrend(threads: ClusteredThread[]): 'rising' | 'stable' | 'declining' {
    // Simple trend analysis based on creation times
    const now = Date.now() / 1000
    const recentThreads = threads.filter(t => (now - t.created_utc) < 7 * 24 * 60 * 60) // Last week
    const oldThreads = threads.filter(t => (now - t.created_utc) >= 7 * 24 * 60 * 60)
    
    if (recentThreads.length > oldThreads.length * 1.5) {
      return 'rising'
    } else if (recentThreads.length < oldThreads.length * 0.5) {
      return 'declining'
    }
    
    return 'stable'
  }

  private static generateClusterId(category: string, topKeyword: string): string {
    return `cluster_${category}_${topKeyword}_${Date.now()}`.replace(/[^a-z0-9_]/g, '')
  }
}

export { ProblemClusteringEngine, type ProblemCluster, type ClusteredThread }