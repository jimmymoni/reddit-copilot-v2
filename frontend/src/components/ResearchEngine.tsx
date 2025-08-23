'use client'

import { useState } from 'react'

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

interface ResearchEngineProps {
  redditId: string
}

export default function ResearchEngine({ redditId }: ResearchEngineProps) {
  const [niche, setNiche] = useState('')
  const [isResearching, setIsResearching] = useState(false)
  const [painPoints, setPainPoints] = useState<PainPoint[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState('week')

  const handleResearch = async () => {
    if (!niche.trim()) return
    
    setIsResearching(true)
    try {
      const response = await fetch('http://localhost:3001/api/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ 
          niche: niche.trim(),
          timeframe: selectedTimeframe
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setPainPoints(data.painPoints || [])
      }
    } catch (error) {
      console.error('Research failed:', error)
    } finally {
      setIsResearching(false)
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-700 border border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
      case 'low': return 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      default: return 'bg-slate-100 text-slate-700 border border-slate-200'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center justify-center">
          <span className="mr-3">🔍</span>
          Research Engine
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto">Discover customer pain points and SaaS opportunities from Reddit discussions</p>
      </div>

      {/* Research Controls */}
      <div className="bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-3xl shadow-sm p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Research Niche
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., Shopify, SaaS, e-commerce, dropshipping, marketing tools..."
              className="w-full px-6 py-4 border border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white/80 text-slate-900 placeholder-slate-500 font-medium transition-all duration-200"
              onKeyPress={(e) => e.key === 'Enter' && handleResearch()}
            />
          </div>
          
          <div className="lg:w-64">
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              Timeframe
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="w-full px-6 py-4 border border-slate-200/60 rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white/80 text-slate-900 font-medium transition-all duration-200"
            >
              <option value="day">Last 24 hours</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
              <option value="all">All time</option>
            </select>
          </div>
          
          <div className="lg:w-48 flex items-end">
            <button
              onClick={handleResearch}
              disabled={isResearching || !niche.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-8 py-4 rounded-2xl font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg shadow-violet-600/25"
            >
              {isResearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Researching...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span>Research</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Research Results */}
      {isResearching && (
        <div className="text-center py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-2xl mb-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
            <p className="text-xl font-semibold text-slate-900 mb-2">Scanning Reddit</p>
            <p className="text-slate-600">Analyzing discussions for pain points and opportunities...</p>
          </div>
        </div>
      )}

      {painPoints.length > 0 && (
        <div className="space-y-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              Found {painPoints.length} Pain Points for "{niche}"
            </h3>
            <p className="text-slate-600">Sorted by opportunity score • Click any item to explore further</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {painPoints.map((point) => (
              <div 
                key={point.id} 
                className="group bg-white rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1 p-6"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${getUrgencyColor(point.urgency)}`}>
                      {point.urgency} urgency
                    </span>
                  </div>
                  <div className="bg-violet-100 text-violet-700 px-3 py-1.5 rounded-full text-xs font-bold">
                    Score: {point.score}
                  </div>
                </div>
                
                {/* Title */}
                <h4 className="font-bold text-lg text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-violet-900 transition-colors">
                  {point.title}
                </h4>
                
                {/* Description */}
                <p className="text-sm text-slate-600 mb-4 line-clamp-3 leading-relaxed">
                  {point.description}
                </p>
                
                {/* Opportunity */}
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 p-4 rounded-2xl mb-4 border border-violet-100">
                  <p className="text-xs font-semibold text-violet-700 mb-2 uppercase tracking-wide">SaaS Opportunity</p>
                  <p className="text-sm text-violet-800 font-medium leading-relaxed">{point.opportunity}</p>
                </div>
                
                {/* Footer */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-3 text-xs text-slate-500">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full font-medium">r/{point.subreddit}</span>
                    <span>{point.mentions} mentions</span>
                  </div>
                  <a 
                    href={point.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 font-medium text-sm flex items-center space-x-1 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>View Post</span>
                    <span>↗️</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isResearching && painPoints.length === 0 && niche && (
        <div className="text-center py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md mx-auto">
            <div className="text-6xl mb-6">🤔</div>
            <p className="text-xl font-semibold text-slate-900 mb-2">No Results Found</p>
            <p className="text-slate-600">No pain points found for "{niche}". Try a different niche or timeframe.</p>
          </div>
        </div>
      )}

      {!niche && (
        <div className="text-center py-16">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl mx-auto">
            <div className="mb-8 text-8xl">🔍</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">SaaS Pain Point Research Engine</h3>
            <p className="text-slate-600 text-lg leading-relaxed">Enter a niche above to discover customer pain points and identify SaaS opportunities from real Reddit discussions.</p>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100">
                <div className="text-2xl mb-2">📊</div>
                <div className="font-semibold text-violet-900">Smart Analysis</div>
                <div className="text-violet-700">AI-powered pain point detection</div>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-semibold text-indigo-900">Opportunity Scoring</div>
                <div className="text-indigo-700">Ranked by business potential</div>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <div className="text-2xl mb-2">🚀</div>
                <div className="font-semibold text-emerald-900">Real Insights</div>
                <div className="text-emerald-700">From genuine user discussions</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}