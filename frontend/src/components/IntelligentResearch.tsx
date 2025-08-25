'use client'

import { useState } from 'react'

interface ProblemCluster {
  id: string
  title: string
  description: string
  threadCount: number
  threads: ClusteredThread[]
  severity: number
  trendDirection: 'rising' | 'stable' | 'declining'
  confidence: number
  keywords: string[]
  avgScore: number
  totalComments: number
  existingSolutions: SolutionSearchResult
  opportunityScore: number
  marketSizeIndicator: 'small' | 'medium' | 'large'
}

interface ClusteredThread {
  id: string
  title: string
  similarity: number
  subreddit: string
  score: number
  num_comments: number
  url: string
  author: string
}

interface SolutionSearchResult {
  problemTitle: string
  solutions: Solution[]
  searchConfidence: number
  totalFound: number
}

interface Solution {
  name: string
  description: string
  website: string
  pricing: string
  rating: number
  reviewCount: number
  category: string
  source: string
  tags: string[]
}

interface ResearchInsights {
  topProblems: string[]
  emergingTrends: string[]
  solutionGaps: string[]
  marketOpportunities: string[]
  actionableRecommendations: string[]
}

interface ParsedInput {
  target: string
  intent: string
  timeframe: string
  subreddits: string[]
  searchQueries: string[]
  keywords: string[]
  confidence: number
}

interface IntelligentResearchResponse {
  originalInput: string
  parsed: ParsedInput
  summary: string
  totalThreadsAnalyzed: number
  problemClusters: ProblemCluster[]
  insights: ResearchInsights
  confidence: number
  processingTime: number
}

interface IntelligentResearchProps {
  redditId: string
}

export default function IntelligentResearch({ redditId }: IntelligentResearchProps) {
  const [input, setInput] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [results, setResults] = useState<IntelligentResearchResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeCluster, setActiveCluster] = useState<string | null>(null)

  const handleIntelligentSearch = async () => {
    if (!input.trim()) return
    
    setIsResearching(true)
    setError(null)
    setResults(null)
    
    try {
      const response = await fetch('http://localhost:3001/api/intelligent-research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ input: input.trim() })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Research failed')
      }
      
      const data = await response.json()
      setResults(data)
    } catch (err) {
      console.error('Intelligent research failed:', err)
      setError(err instanceof Error ? err.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-emerald-600 bg-emerald-50'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-orange-600 bg-orange-50'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return '📈'
      case 'declining': return '📉'
      default: return '➡️'
    }
  }

  const getMarketSizeColor = (size: string) => {
    switch (size) {
      case 'large': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  const getOpportunityColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-500 text-white'
    if (score >= 0.5) return 'bg-orange-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const sampleInputs = [
    "I want to find what Shopify store owners are lately bothered with",
    "What problems do SaaS founders face with customer onboarding", 
    "Find pain points in dropshipping automation",
    "What marketing challenges are ecommerce businesses struggling with",
    "Discover inventory management issues for online retailers",
    "What payment processing problems are merchants experiencing"
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center justify-center">
          <span className="mr-3">🧠</span>
          Intelligent Research Engine
        </h2>
        <p className="text-slate-600 max-w-3xl mx-auto">
          Describe what you want to research in natural language. Our AI will understand your intent, 
          find relevant discussions, cluster similar problems, and discover existing solutions.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-sm p-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Research Query (Natural Language)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe what you want to research...&#10;&#10;Examples:&#10;• I want to find what Shopify store owners are lately bothered with&#10;• What problems do SaaS founders face with customer onboarding&#10;• Find pain points in dropshipping automation"
              className="w-full h-32 px-6 py-4 border border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white/80 text-slate-900 placeholder-slate-500 font-medium transition-all duration-200 resize-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleIntelligentSearch()
                }
              }}
            />
            <div className="mt-2 text-xs text-slate-500">
              Press Ctrl+Enter to search • Be specific about your target audience and what you want to discover
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-600">Quick examples:</span>
              {sampleInputs.slice(0, 3).map((example, index) => (
                <button
                  key={index}
                  onClick={() => setInput(example)}
                  className="text-xs px-3 py-1.5 bg-violet-100 text-violet-700 rounded-full hover:bg-violet-200 transition-colors"
                >
                  {example.slice(0, 40)}...
                </button>
              ))}
            </div>
            
            <button
              onClick={handleIntelligentSearch}
              disabled={isResearching || !input.trim()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-violet-600/25"
            >
              {isResearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <span>🧠</span>
                  <span>Intelligent Research</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isResearching && (
        <div className="text-center py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-2xl mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
            <p className="text-xl font-semibold text-slate-900 mb-2">AI Processing</p>
            <p className="text-slate-600">Understanding your request, finding discussions, clustering problems, and discovering solutions...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-semibold text-red-900">Research Failed</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results && (
        <div className="space-y-8">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-3xl p-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-violet-900">{results.totalThreadsAnalyzed}</div>
                <div className="text-sm text-violet-700">Threads Analyzed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-900">{results.problemClusters.length}</div>
                <div className="text-sm text-indigo-700">Problem Clusters</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-900">{Math.round(results.confidence * 100)}%</div>
                <div className="text-sm text-emerald-700">Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-900">{(results.processingTime / 1000).toFixed(1)}s</div>
                <div className="text-sm text-orange-700">Processing Time</div>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-6 space-y-4">
              <div>
                <span className="text-sm font-semibold text-slate-600">Research Summary:</span>
                <p className="text-slate-900 font-medium">{results.summary}</p>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-600">Target Audience:</span>
                <span className="ml-2 px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm font-medium">
                  {results.parsed.target}
                </span>
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-600">Searched Subreddits:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {results.parsed.subreddits.map(sub => (
                    <span key={sub} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                      r/{sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insights Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-6 flex items-center">
              <span className="mr-3">💡</span>
              Research Insights
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                  <span className="mr-2">🔥</span>Top Problems
                </h4>
                <div className="space-y-2">
                  {results.insights.topProblems.map((problem, i) => (
                    <div key={i} className="text-sm text-slate-600 bg-red-50 px-3 py-2 rounded-lg">
                      {problem}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                  <span className="mr-2">📈</span>Emerging Trends
                </h4>
                <div className="space-y-2">
                  {results.insights.emergingTrends.map((trend, i) => (
                    <div key={i} className="text-sm text-slate-600 bg-green-50 px-3 py-2 rounded-lg">
                      {trend}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                  <span className="mr-2">🔍</span>Solution Gaps
                </h4>
                <div className="space-y-2">
                  {results.insights.solutionGaps.map((gap, i) => (
                    <div key={i} className="text-sm text-slate-600 bg-yellow-50 px-3 py-2 rounded-lg">
                      {gap}
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                  <span className="mr-2">🚀</span>Opportunities
                </h4>
                <div className="space-y-2">
                  {results.insights.marketOpportunities.map((opp, i) => (
                    <div key={i} className="text-sm text-slate-600 bg-blue-50 px-3 py-2 rounded-lg">
                      {opp}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl border border-emerald-200">
              <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
                <span className="mr-2">💰</span>Actionable Recommendations
              </h4>
              <div className="space-y-2">
                {results.insights.actionableRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-start space-x-2">
                    <span className="text-emerald-600 mt-1">•</span>
                    <span className="text-sm text-slate-700 font-medium">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Problem Clusters */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 flex items-center">
              <span className="mr-3">🎯</span>
              Problem Clusters ({results.problemClusters.length})
            </h3>
            
            <div className="space-y-6">
              {results.problemClusters.map((cluster) => (
                <div
                  key={cluster.id}
                  className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden"
                >
                  {/* Cluster Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-xl font-bold text-slate-900">{cluster.title}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${getOpportunityColor(cluster.opportunityScore)}`}>
                            {Math.round(cluster.opportunityScore * 100)}% Opportunity
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getMarketSizeColor(cluster.marketSizeIndicator)}`}>
                            {cluster.marketSizeIndicator} market
                          </span>
                        </div>
                        <p className="text-slate-600 mb-3">{cluster.description}</p>
                      </div>
                      <div className="text-right space-y-2">
                        <div className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-semibold">
                          {cluster.threadCount} threads
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                          <span>{getTrendIcon(cluster.trendDirection)}</span>
                          <span>{cluster.trendDirection}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Keywords */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {cluster.keywords.map(keyword => (
                        <span key={keyword} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs">
                          {keyword}
                        </span>
                      ))}
                    </div>
                    
                    {/* Metrics */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{Math.round(cluster.avgScore)}</div>
                        <div className="text-xs text-slate-500">Avg Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{cluster.totalComments}</div>
                        <div className="text-xs text-slate-500">Comments</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{Math.round(cluster.severity * 100)}%</div>
                        <div className="text-xs text-slate-500">Severity</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-slate-900">{Math.round(cluster.confidence * 100)}%</div>
                        <div className="text-xs text-slate-500">Confidence</div>
                      </div>
                    </div>
                  </div>

                  {/* Sample Threads */}
                  <div className="px-6 pb-4">
                    <button
                      onClick={() => setActiveCluster(activeCluster === cluster.id ? null : cluster.id)}
                      className="w-full text-left p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">
                          Sample Discussions ({cluster.threads.length})
                        </span>
                        <span className="text-slate-500">
                          {activeCluster === cluster.id ? '▼' : '▶'}
                        </span>
                      </div>
                    </button>
                    
                    {activeCluster === cluster.id && (
                      <div className="mt-4 space-y-3">
                        {cluster.threads.slice(0, 4).map((thread) => (
                          <div key={thread.id} className="bg-white p-4 rounded-xl border border-slate-200">
                            <a 
                              href={thread.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-medium hover:underline block mb-2"
                            >
                              {thread.title}
                            </a>
                            <div className="flex items-center justify-between text-sm text-slate-500">
                              <div className="flex items-center space-x-4">
                                <span>r/{thread.subreddit}</span>
                                <span>by {thread.author}</span>
                                <span>{thread.score} points</span>
                                <span>{thread.num_comments} comments</span>
                              </div>
                              <span className="bg-violet-100 text-violet-700 px-2 py-1 rounded text-xs">
                                {Math.round(thread.similarity * 100)}% similar
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Existing Solutions */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 border-t border-green-100">
                    <h5 className="font-semibold text-green-900 mb-4 flex items-center">
                      <span className="mr-2">🛠️</span>
                      Existing Solutions ({cluster.existingSolutions.solutions.length})
                    </h5>
                    
                    {cluster.existingSolutions.solutions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cluster.existingSolutions.solutions.map((solution) => (
                          <div key={solution.name} className="bg-white p-4 rounded-xl border border-green-200">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h6 className="font-semibold text-slate-900">{solution.name}</h6>
                                <p className="text-sm text-slate-600 mb-2">{solution.description}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-1 text-sm">
                                  <span className="text-yellow-500">⭐</span>
                                  <span className="font-medium">{solution.rating}</span>
                                  <span className="text-slate-500">({solution.reviewCount})</span>
                                </div>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                  {solution.source}
                                </span>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900">{solution.pricing}</div>
                                <a 
                                  href={solution.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Visit Site ↗
                                </a>
                              </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mt-3">
                              {solution.tags.slice(0, 4).map(tag => (
                                <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-100 text-yellow-800 p-4 rounded-xl border border-yellow-200">
                        <div className="flex items-center space-x-2">
                          <span>💡</span>
                          <span className="font-medium">High opportunity! No existing solutions found for this problem.</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isResearching && !results && !error && (
        <div className="text-center py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-3xl mx-auto">
            <div className="text-8xl mb-8">🧠</div>
            <h3 className="text-3xl font-bold text-slate-900 mb-4">Intelligent Research Engine</h3>
            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              Simply describe what you want to research, and our AI will understand your intent, 
              find relevant discussions, cluster similar problems by frequency, and discover existing solutions.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="bg-violet-50 rounded-2xl p-6 border border-violet-100">
                <div className="text-3xl mb-4">🎯</div>
                <div className="font-semibold text-violet-900 mb-2">Smart Understanding</div>
                <div className="text-violet-700">AI parses your natural language query to understand target audience and research intent</div>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <div className="text-3xl mb-4">🔗</div>
                <div className="font-semibold text-indigo-900 mb-2">Problem Clustering</div>
                <div className="text-indigo-700">Groups similar discussions to show problem frequency and validate market demand</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                <div className="text-3xl mb-4">🛠️</div>
                <div className="font-semibold text-emerald-900 mb-2">Solution Discovery</div>
                <div className="text-emerald-700">Finds existing solutions and identifies gaps for new opportunities</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}