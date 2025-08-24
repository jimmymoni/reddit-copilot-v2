'use client'

import { useState, useEffect } from 'react'
import SubredditProfile from './SubredditProfile'

export interface RedditPost {
  id: string
  title: string
  content: string
  author: string
  subreddit: string
  score: number
  commentCount: number
  created: Date
  url: string
  permalink: string
  mediaType: 'text' | 'image' | 'video' | 'link'
  mediaUrl?: string
  flair?: string
  isNSFW: boolean
  upvoteRatio: number
}

export interface EngagementSuggestion {
  id: string
  postId: string
  type: 'thoughtful_comment' | 'question' | 'experience_share' | 'helpful_advice'
  content: string
  reasoning: string
  confidence: number
  ruleCompliance: boolean
  riskLevel: 'low' | 'medium' | 'high'
  estimatedReception: string
}

export interface SubredditRule {
  shortName: string
  description: string
  kind: string
}

export interface SubredditFlair {
  id: string
  text: string
  type: 'text' | 'richtext'
  allowable_content?: string
  max_emojis?: number
  mod_only?: boolean
  css_class?: string
}

export interface SimpleSubredditRules {
  subreddit: string
  flairRequired: boolean
  minLength: number
  commonFlairs: string[]
  keyRules: string[]
}

interface HomeFeedProps {
  redditId: string
}

// Cache for feed data to prevent re-loading
const feedCache = new Map<string, { posts: RedditPost[], stats: any, timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function HomeFeed({ redditId }: HomeFeedProps) {
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null)
  const [suggestions, setSuggestions] = useState<EngagementSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [voiceInput, setVoiceInput] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('')
  const [subscribedSubreddits, setSubscribedSubreddits] = useState<any[]>([])
  const [feedStats, setFeedStats] = useState<any>(null)
  const [showSubredditProfile, setShowSubredditProfile] = useState(false)
  const [selectedSubreddit, setSelectedSubreddit] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [showSubredditsDropdown, setShowSubredditsDropdown] = useState(false)
  const [subredditRules, setSubredditRules] = useState<SimpleSubredditRules | null>(null)
  const [loadingRules, setLoadingRules] = useState(false)
  const [selectedFlair, setSelectedFlair] = useState<string | null>(null)
  const [ruleViolations, setRuleViolations] = useState<string[]>([])
  const [showRulesPanel, setShowRulesPanel] = useState(true)

  const fetchHomeFeed = async (subredditFilter = activeFilter, forceRefresh = false) => {
    // Check cache first
    const cacheKey = `${redditId}-${subredditFilter}`
    const cached = feedCache.get(cacheKey)
    const now = Date.now()
    
    // Don't use cache for failed requests or if forcing refresh
    if (!forceRefresh && cached && cached.posts.length > 0 && (now - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached feed data')
      setPosts(cached.posts)
      setFeedStats(cached.stats)
      return
    }
    
    if (loading) return // Prevent duplicate requests
    
    setLoading(true)
    try {
      console.log('Fetching home feed with subreddit filter:', subredditFilter, 'for redditId:', redditId)
      
      const url = subredditFilter 
        ? `http://localhost:3001/api/homefeed?subreddit=${subredditFilter}&limit=300`
        : `http://localhost:3001/api/homefeed?limit=300`
      
      const response = await fetch(url, {
        headers: {
          'x-reddit-id': redditId
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to fetch home feed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success || !data.posts) {
        throw new Error(data.message || 'Invalid response from server')
      }
      
      const processedPosts = data.posts.map((post: any) => ({
        ...post,
        created: new Date(post.created)
      }))
      
      const stats = {
        totalScanned: data.totalScanned || processedPosts.length,
        filtered: data.count || processedPosts.length,
        efficiency: data.totalScanned ? Math.round((processedPosts.length / data.totalScanned) * 100) : 100
      }
      
      // Only cache successful results with actual posts
      if (processedPosts.length > 0) {
        feedCache.set(cacheKey, {
          posts: processedPosts,
          stats,
          timestamp: now
        })
      }
      
      setPosts(processedPosts)
      setFeedStats(stats)
      
      console.log(`Successfully loaded ${processedPosts.length} posts`)
    } catch (error) {
      console.error('Failed to fetch home feed:', error)
      
      // Clear any cached failed results
      feedCache.delete(cacheKey)
      
      // Show more specific error messages
      if (error.message?.includes('User not found') || error.message?.includes('access_token')) {
        console.error('Authentication error - user may need to re-authenticate')
        setFeedStats({ totalScanned: 0, filtered: 0, efficiency: 0, error: 'Authentication required' })
      } else {
        setFeedStats({ totalScanned: 0, filtered: 0, efficiency: 0, error: 'Network error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSubscribedSubreddits = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/subreddits', {
        headers: {
          'x-reddit-id': redditId
        }
      })
      
      if (!response.ok) {
        console.error('Failed to fetch subreddits')
        return
      }
      
      const data = await response.json()
      setSubscribedSubreddits(data.subreddits || [])
    } catch (error) {
      console.error('Failed to fetch subscribed subreddits:', error)
    }
  }

  const handleSubredditFilter = (subredditName: string) => {
    if (subredditName === activeFilter) return // Prevent unnecessary requests
    setActiveFilter(subredditName)
    // Force refresh to bypass cache when changing filters
    fetchHomeFeed(subredditName, true)
  }

  const clearFilter = () => {
    setActiveFilter('')
    // Force refresh to bypass cache when clearing filter
    fetchHomeFeed('', true)
  }

  const openCommentHelper = (post: RedditPost) => {
    setSelectedPost(post)
    setShowModal(true)
    setSuggestions([])
    setUserInput('')
    setSelectedFlair(null)
    setRuleViolations([])
    fetchSubredditRules(post.subreddit)
  }

  const fetchSubredditRules = async (subreddit: string) => {
    setLoadingRules(true)
    try {
      const response = await fetch(`http://localhost:3001/api/homefeed/subreddit-rules/${subreddit}`, {
        headers: {
          'x-reddit-id': redditId
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setSubredditRules(data.rules)
      } else {
        console.warn(`Could not fetch rules for r/${subreddit}`)
      }
    } catch (error) {
      console.error('Failed to fetch subreddit rules:', error)
    }
    setLoadingRules(false)
  }

  const validateComment = (comment: string) => {
    if (!subredditRules) return []
    
    const violations = []
    
    if (subredditRules.minLength && comment.length < subredditRules.minLength) {
      violations.push(`Comment must be at least ${subredditRules.minLength} characters`)
    }
    
    if (subredditRules.flairRequired && !selectedFlair) {
      violations.push('Flair selection is required for this subreddit')
    }
    
    return violations
  }

  const generateSuggestions = async () => {
    if (!selectedPost) return
    setLoadingSuggestions(true)
    
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/engagement-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ postId: selectedPost.id })
      })
      
      if (!response.ok) throw new Error('Failed to generate suggestions')
      
      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
      alert('Failed to generate suggestions. Please try again.')
    }
    setLoadingSuggestions(false)
  }

  const improveComment = async () => {
    if (!selectedPost || !userInput.trim()) return

    setLoading(true)
    
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/improve-comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ 
          postId: selectedPost.id, 
          userComment: userInput.trim()
        })
      })
      
      if (!response.ok) throw new Error('Failed to improve comment')
      
      const data = await response.json()
      setUserInput(data.improvedComment)
    } catch (error) {
      console.error('Failed to improve comment:', error)
      alert('Failed to improve comment. Please try again.')
    }
    setLoading(false)
  }

  const postComment = async () => {
    if (!selectedPost || !userInput.trim()) return
    
    // Check for rule violations before posting
    const violations = validateComment(userInput)
    if (violations.length > 0) {
      alert(`Cannot post comment due to rule violations:\n\n${violations.join('\n')}`)
      return
    }
    
    const confirmMessage = `Post this comment to r/${selectedPost?.subreddit}?${selectedFlair ? `\nFlair: ${selectedFlair}` : ''}\n\n"${userInput.substring(0, 200)}..."`
    const confirmed = window.confirm(confirmMessage)
    
    if (!confirmed) return

    try {
      const response = await fetch('http://localhost:3001/api/homefeed/comment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ 
          postId: selectedPost?.id, 
          content: userInput.trim(),
          flair: selectedFlair || null
        })
      })
      
      if (!response.ok) throw new Error('Failed to post comment')
      
      const data = await response.json()
      alert(`Comment posted successfully! View at: ${data.result.url}`)
      setShowModal(false)
      setSuggestions([])
      setUserInput('')
      setSelectedFlair(null)
      setRuleViolations([])
    } catch (error) {
      console.error('Failed to post comment:', error)
      alert('Failed to post comment. Please try again.')
    }
  }

  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser')
      return
    }

    setVoiceInput(true)
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setUserInput(transcript)
      setVoiceInput(false)
    }
    
    recognition.onerror = () => {
      setVoiceInput(false)
      alert('Speech recognition failed. Please try again.')
    }
    
    recognition.onend = () => {
      setVoiceInput(false)
    }
    
    recognition.start()
  }

  useEffect(() => {
    if (!isInitialized && redditId) {
      setIsInitialized(true)
      fetchSubscribedSubreddits()
      fetchHomeFeed()
    }
  }, [redditId, isInitialized])

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 2419200) return `${Math.floor(diffInSeconds / 604800)}w ago`
    if (diffInSeconds < 29030400) return `${Math.floor(diffInSeconds / 2419200)}mo ago`
    return `${Math.floor(diffInSeconds / 29030400)}y ago`
  }

  const formatScore = (score: number) => {
    if (Math.abs(score) >= 1000000) return `${(score / 1000000).toFixed(1)}M`
    if (Math.abs(score) >= 1000) return `${(score / 1000).toFixed(1)}k`
    return score.toString()
  }

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <>
      <div 
        className="min-h-screen"
        onClick={(e) => {
          // Close dropdown when clicking outside
          if (showSubredditsDropdown && !e.target.closest('[data-dropdown]')) {
            setShowSubredditsDropdown(false)
          }
        }}
      >
        {/* Full Width Content Area - No Sidebar */}
        <div className="flex-1 min-h-screen">
          {/* Header with Subreddit Filter */}
          <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center">
                    <span className="mr-2 text-lg">🏠</span>
                    {activeFilter ? `r/${activeFilter}` : 'Home Feed'}
                    <span className="ml-2 text-sm font-normal text-slate-500">({posts.length})</span>
                  </h2>
                  {feedStats && (
                    <p className="text-slate-600 text-sm">
                      {activeFilter ? `Posts from r/${activeFilter}` : `Showing ${feedStats.filtered} from ${feedStats.totalScanned} posts`}
                      {!activeFilter && (
                        <span className="text-violet-600 font-semibold"> ({feedStats.efficiency}%)</span>
                      )}
                    </p>
                  )}
                </div>
                
                {/* Subreddit Filter Dropdown */}
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setShowSubredditsDropdown(!showSubredditsDropdown)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-slate-200/60 bg-white/50"
                  >
                    <span>📋</span>
                    <span>Subreddits</span>
                    <span className={`text-xs transition-transform duration-200 ${showSubredditsDropdown ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  
                  {/* Subreddit Dropdown */}
                  {showSubredditsDropdown && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 sm:left-0 sm:transform-none sm:translate-x-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm sm:max-w-none bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden z-50">
                      {/* Header */}
                      <div className="px-4 sm:px-5 py-3 sm:py-4 bg-gradient-to-r from-slate-50/80 to-white/80 border-b border-slate-100/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"></div>
                            <span className="font-semibold text-slate-800 text-sm">Your Subreddits</span>
                          </div>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                            {subscribedSubreddits.length} total
                          </span>
                        </div>
                      </div>
                      
                      {/* Clear Filter Option */}
                      <div className="px-4 sm:px-5 py-3 border-b border-slate-100/50">
                        <button
                          onClick={() => {
                            clearFilter()
                            setShowSubredditsDropdown(false)
                          }}
                          className={`w-full p-3 rounded-xl text-left transition-all duration-200 ${
                            !activeFilter 
                              ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 shadow-md' 
                              : 'bg-white/60 border border-slate-200/60 hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">🏠</span>
                            <div>
                              <span className="font-medium text-sm text-slate-800">All Posts</span>
                              <p className="text-xs text-slate-500">Show posts from all subreddits</p>
                            </div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Subreddit List */}
                      <div className="px-4 sm:px-5 py-3 sm:py-4 max-h-64 sm:max-h-72 overflow-y-auto">
                        <div className="space-y-2">
                          {subscribedSubreddits.map((subreddit) => {
                            const isActive = activeFilter === subreddit.name
                            
                            return (
                              <button
                                key={subreddit.name}
                                onClick={() => {
                                  handleSubredditFilter(subreddit.name)
                                  setShowSubredditsDropdown(false)
                                }}
                                className={`w-full p-3 rounded-xl text-left transition-all duration-200 hover:scale-[1.01] ${
                                  isActive 
                                    ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 shadow-md' 
                                    : 'bg-white/60 border border-slate-200/60 hover:bg-slate-50/80 hover:border-slate-300/60'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    r/
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className={`font-medium text-sm ${
                                        isActive ? 'text-violet-900' : 'text-slate-800'
                                      }`}>
                                        {subreddit.name}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        {subreddit.subscribers ? `${Math.round(subreddit.subscribers/1000)}k` : ''}
                                      </span>
                                    </div>
                                    <p className={`text-xs leading-relaxed mt-1 line-clamp-2 ${
                                      isActive ? 'text-violet-700/80' : 'text-slate-500'
                                    }`}>
                                      {subreddit.title || subreddit.description || `Posts from r/${subreddit.name}`}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                          
                          {subscribedSubreddits.length === 0 && (
                            <div className="text-center py-8">
                              <div className="text-4xl mb-3">📱</div>
                              <p className="text-sm text-slate-500">Loading subreddits...</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => fetchHomeFeed(activeFilter, true)}
                disabled={loading}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 transition-all duration-200 flex items-center space-x-1.5 shadow-md"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Loading</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Posts Content */}
          <div className="px-6 py-4">
            <div>
              {posts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                    <div className="text-8xl mb-6">📱</div>
                    <p className="text-2xl font-bold mb-4 text-gray-800">No posts yet</p>
                    <p className="text-gray-500">Click "Refresh" to load latest posts from your subreddits!</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {posts.map((post) => (
                    <div 
                      key={post.id} 
                      className="group bg-white rounded-2xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:shadow-slate-900/10 transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-0.5"
                      onClick={() => openCommentHelper(post)}
                    >
                      {/* Header with subreddit and category */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-1.5">
                            <button 
                              className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded-full font-medium hover:bg-violet-100 hover:text-violet-700 transition-all duration-200"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedSubreddit(post.subreddit)
                                setShowSubredditProfile(true)
                              }}
                            >
                              r/{post.subreddit}
                            </button>
                            {post.flair && (
                              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {post.flair}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {post.isNSFW && (
                              <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full font-bold">
                                NSFW
                              </span>
                            )}
                            <div className="text-xs text-slate-500">
                              {post.mediaType === 'video' && '🎥'}
                              {post.mediaType === 'link' && '🔗'}
                              {post.mediaType === 'text' && '📝'}
                              {post.mediaType === 'image' && '🖼️'}
                            </div>
                          </div>
                        </div>

                        {/* Post Title & Content */}
                        <h3 className="font-bold text-base text-slate-900 leading-tight mb-2 group-hover:text-violet-900 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        
                        {post.content && (
                          <p className="text-sm text-slate-600 leading-relaxed line-clamp-2 mb-3">
                            {post.content}
                          </p>
                        )}

                        {/* Post metadata */}
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                          <span className="font-medium">u/{post.author}</span>
                          <span>{getRelativeTime(post.created)}</span>
                        </div>

                        {/* Stats and action */}
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1 text-slate-600">
                              <span className="text-emerald-500">↑</span>
                              <span className="font-medium">{formatScore(post.score)}</span>
                            </div>
                            <div className="flex items-center space-x-1 text-slate-600">
                              <span>💬</span>
                              <span className="font-medium">{post.commentCount}</span>
                            </div>
                          </div>
                          
                          <button 
                            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center space-x-1.5 shadow-md"
                            onClick={(e) => {
                              e.stopPropagation()
                              openCommentHelper(post)
                            }}
                          >
                            <span>✨</span>
                            <span>Comment with AI</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* AI Suggestion Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col border border-gray-200">
            {/* Modal content remains the same */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Comment Writing Assistant
                  </h2>
                  <p className="text-sm text-gray-600">
                    r/{selectedPost.subreddit} • by u/{selectedPost.author} • {getRelativeTime(selectedPost.created)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSuggestions([])
                    setUserInput('')
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex">
              {/* Left Panel - Post Content */}
              <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
                <div className="space-y-4">
                  {/* Post Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {selectedPost.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                      <span className="flex items-center space-x-1">
                        <span className="text-emerald-500">↑</span>
                        <span className="font-medium">{formatScore(selectedPost.score)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <span>💬</span>
                        <span className="font-medium">{selectedPost.commentCount}</span>
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        r/{selectedPost.subreddit}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Post Content</h4>
                    <div className="text-gray-800 text-sm leading-relaxed">
                      {selectedPost.content ? (
                        <div className="whitespace-pre-wrap">{selectedPost.content}</div>
                      ) : (
                        <p className="text-gray-500 italic">No text content available</p>
                      )}
                    </div>
                    {selectedPost.url && selectedPost.url !== selectedPost.permalink && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a 
                          href={selectedPost.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          View External Link →
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Opportunity Analysis */}
                  <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <span className="mr-2">🎯</span>
                      Engagement Opportunity
                    </h4>
                    <div className="text-sm text-gray-700">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-xs text-gray-500">Relevance Score</span>
                          <div className="text-lg font-bold text-violet-600">
                            {selectedPost.relevanceScore || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Post Age</span>
                          <div className="text-lg font-bold text-indigo-600">
                            {getRelativeTime(selectedPost.created)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - AI Assistant */}
              <div className="w-1/2 p-6 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4">
                  {/* AI Suggestions */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-700 flex items-center">
                        <span className="mr-2">✨</span>
                        AI Engagement Suggestions
                      </h4>
                      <button
                        onClick={generateSuggestions}
                        disabled={loadingSuggestions}
                        className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                      >
                        {loadingSuggestions ? 'Generating...' : 'Generate Ideas'}
                      </button>
                    </div>
                    
                    {suggestions.length > 0 ? (
                      <div className="space-y-3">
                        {suggestions.map((suggestion, index) => (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded">
                                {suggestion.type}
                              </span>
                              <span className="text-xs text-gray-500">
                                Confidence: {Math.round(suggestion.confidence * 100)}%
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 mb-2">{suggestion.content}</p>
                            <p className="text-xs text-gray-600">{suggestion.reasoning}</p>
                            <button
                              onClick={() => setUserInput(suggestion.content)}
                              className="mt-2 text-xs text-violet-600 hover:text-violet-800 font-medium"
                            >
                              Use This Suggestion →
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <span className="text-2xl mb-2 block">🤖</span>
                        <p className="text-sm text-gray-600">
                          Click "Generate Ideas" to get AI-powered engagement suggestions
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Subreddit Rules Panel */}
                  {showRulesPanel && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center">
                          <span className="mr-2">📋</span>
                          r/{selectedPost?.subreddit} Rules & Requirements
                        </h4>
                        <button
                          onClick={() => setShowRulesPanel(!showRulesPanel)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          {showRulesPanel ? '−' : '+'}
                        </button>
                      </div>
                      
                      {loadingRules ? (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                          <span>Loading subreddit rules...</span>
                        </div>
                      ) : subredditRules ? (
                        <div className="space-y-3">
                          {/* Flair Selection - Simplified */}
                          {subredditRules.commonFlairs && subredditRules.commonFlairs.length > 0 && (
                            <div className="space-y-2">
                              <label className="text-xs font-medium text-gray-700">
                                Select Flair {subredditRules.flairRequired && <span className="text-red-500">*</span>}
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                {subredditRules.commonFlairs.slice(0, 4).map((flair, index) => (
                                  <button
                                    key={index}
                                    onClick={() => setSelectedFlair(selectedFlair === flair ? null : flair)}
                                    className={`px-3 py-2 text-xs rounded-lg border transition-all ${
                                      selectedFlair === flair
                                        ? 'bg-violet-100 border-violet-300 text-violet-700'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-violet-200'
                                    }`}
                                  >
                                    {flair}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Key Rules - Simplified */}
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-gray-700">Key Rules</label>
                            <div className="max-h-24 overflow-y-auto space-y-1">
                              {subredditRules.keyRules.slice(0, 3).map((rule, index) => (
                                <div key={index} className="text-xs text-gray-600 bg-white/60 rounded px-2 py-1">
                                  {rule}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Posting Requirements - Simplified */}
                          {subredditRules.minLength > 0 && (
                            <div className="bg-white/60 rounded px-2 py-1 text-xs">
                              <span className="font-medium">Min Length:</span> {subredditRules.minLength} characters
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          Could not load rules for this subreddit
                        </div>
                      )}
                    </div>
                  )}

                  {/* Comment Input */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <span className="mr-2">💬</span>
                      Write Your Comment
                      {userInput && (
                        <span className="ml-2 text-xs text-gray-500">({userInput.length} chars)</span>
                      )}
                    </h4>
                    <div className="space-y-3">
                      <textarea
                        value={userInput}
                        onChange={(e) => {
                          setUserInput(e.target.value)
                          const violations = validateComment(e.target.value)
                          setRuleViolations(violations)
                        }}
                        placeholder="Write your comment here... or use an AI suggestion above"
                        className={`w-full h-32 p-3 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                          ruleViolations.length > 0 
                            ? 'border-red-300 focus:border-red-500' 
                            : 'border-gray-300 focus:border-violet-500'
                        }`}
                      />
                      
                      {/* Rule Violations */}
                      {ruleViolations.length > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-red-500 text-sm">⚠️</span>
                            <span className="text-sm font-medium text-red-700">Rule Violations</span>
                          </div>
                          <ul className="text-xs text-red-600 space-y-1">
                            {ruleViolations.map((violation, index) => (
                              <li key={index} className="flex items-start space-x-1">
                                <span>•</span>
                                <span>{violation}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Success Indicators */}
                      {userInput && ruleViolations.length === 0 && subredditRules && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                          <div className="flex items-center space-x-2 text-sm text-green-700">
                            <span>✅</span>
                            <span>Ready to post - all requirements met!</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={improveComment}
                          disabled={!userInput.trim() || loading}
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Improving...' : '✨ Improve with AI'}
                        </button>
                        <button
                          onClick={postComment}
                          disabled={!userInput.trim() || loading || ruleViolations.length > 0}
                          className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Posting...' : '🚀 Post Comment'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subreddit Profile Modal */}
      {showSubredditProfile && selectedSubreddit && (
        <SubredditProfile
          subredditName={selectedSubreddit}
          redditId={redditId}
          onClose={() => {
            setShowSubredditProfile(false)
            setSelectedSubreddit('')
          }}
        />
      )}
    </>
  )
}