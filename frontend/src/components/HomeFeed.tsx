import { useState, useEffect } from 'react'

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

interface HomeFeedProps {
  redditId: string
}

export default function HomeFeed({ redditId }: HomeFeedProps) {
  const [posts, setPosts] = useState<RedditPost[]>([])
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null)
  const [suggestions, setSuggestions] = useState<EngagementSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [voiceInput, setVoiceInput] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [activeFilter, setActiveFilter] = useState('business_opportunities')
  const [filterPresets, setFilterPresets] = useState<any[]>([])
  const [feedStats, setFeedStats] = useState<any>(null)

  const fetchHomeFeed = async (filter = activeFilter) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:3001/api/homefeed?filter=${filter}`, {
        headers: {
          'x-reddit-id': redditId
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch home feed')
      
      const data = await response.json()
      setPosts(data.posts.map((post: any) => ({
        ...post,
        created: new Date(post.created)
      })))
      setFeedStats({
        totalScanned: data.totalScanned,
        filtered: data.count,
        efficiency: Math.round((data.count / data.totalScanned) * 100)
      })
    } catch (error) {
      console.error('Failed to fetch home feed:', error)
    }
    setLoading(false)
  }

  const fetchFilterPresets = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/filters', {
        headers: {
          'x-reddit-id': redditId
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch filters')
      
      const data = await response.json()
      setFilterPresets(data.presets)
    } catch (error) {
      console.error('Failed to fetch filter presets:', error)
    }
  }

  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId)
    fetchHomeFeed(filterId)
  }

  const generateSuggestions = async (post: RedditPost) => {
    setLoadingSuggestions(true)
    setSelectedPost(post)
    setShowModal(true)
    
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/engagement-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ postId: post.id })
      })
      
      if (!response.ok) throw new Error('Failed to generate suggestions')
      
      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    }
    setLoadingSuggestions(false)
  }

  const refineUserInput = async () => {
    if (!selectedPost || !userInput.trim()) return

    setLoadingSuggestions(true)
    
    try {
      const response = await fetch('http://localhost:3001/api/homefeed/refine-input', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reddit-id': redditId
        },
        body: JSON.stringify({ 
          postId: selectedPost.id, 
          userInput: userInput.trim()
        })
      })
      
      if (!response.ok) throw new Error('Failed to refine input')
      
      const data = await response.json()
      setSuggestions([data.refinedSuggestion])
      setUserInput('')
    } catch (error) {
      console.error('Failed to refine input:', error)
    }
    setLoadingSuggestions(false)
  }

  const postComment = async (suggestion: EngagementSuggestion) => {
    const confirmed = window.confirm(
      `Post this comment to r/${selectedPost?.subreddit}?\n\n"${suggestion.content.substring(0, 200)}..."`
    )
    
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
          content: suggestion.content 
        })
      })
      
      if (!response.ok) throw new Error('Failed to post comment')
      
      const data = await response.json()
      alert(`Comment posted successfully! View at: ${data.result.url}`)
      setShowModal(false)
      setSuggestions([])
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
    fetchFilterPresets()
    fetchHomeFeed()
  }, [])

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
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center text-gray-900">
              🏠 Business Feed ({posts.length} posts)
            </h2>
            {feedStats && (
              <p className="text-sm text-gray-600 mt-1">
                Filtered {feedStats.filtered} from {feedStats.totalScanned} posts ({feedStats.efficiency}% relevance)
              </p>
            )}
          </div>
          <button
            onClick={() => fetchHomeFeed()}
            disabled={loading}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold hover:from-orange-600 hover:to-red-600 disabled:from-gray-400 disabled:to-gray-500 transition-all transform hover:scale-105 flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <>
                <span>🔄</span>
                <span>Refresh Feed</span>
              </>
            )}
          </button>
        </div>
        
        {/* Filter Selector */}
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Filter:</span>
          <div className="flex space-x-2">
            {filterPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleFilterChange(preset.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeFilter === preset.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Active Filter Description */}
        {filterPresets.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Current Filter:</strong> {filterPresets.find(p => p.id === activeFilter)?.description}
            </p>
          </div>
        )}
      </div>

      {/* Netflix-style 3-Column Card Layout */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {posts.length === 0 ? (
            <div className="col-span-full text-center py-16 text-gray-500">
              <div className="bg-white rounded-2xl shadow-xl p-12 max-w-md mx-auto">
                <div className="text-8xl mb-6">📱</div>
                <p className="text-2xl font-bold mb-4 text-gray-800">No posts yet</p>
                <p className="text-gray-500">Click "Refresh Feed" to load latest posts from your subreddits!</p>
              </div>
            </div>
          ) : (
            posts.map((post) => (
              <div 
                key={post.id} 
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:scale-105 transition-all duration-300 cursor-pointer group"
                onClick={() => generateSuggestions(post)}
              >
                {/* Card Header with Media */}
                <div className="relative aspect-video">
                  {post.mediaType === 'image' && post.mediaUrl ? (
                    <img 
                      src={post.mediaUrl} 
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : post.mediaType === 'video' ? (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-5xl mb-3">🎥</div>
                        <p className="font-semibold">Video Post</p>
                      </div>
                    </div>
                  ) : post.mediaType === 'link' ? (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-5xl mb-3">🔗</div>
                        <p className="font-semibold">External Link</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="text-5xl mb-3">📝</div>
                        <p className="font-semibold">Text Post</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay Labels */}
                  <div className="absolute top-4 left-4 flex items-center space-x-2">
                    <span className="bg-black/80 text-white text-xs px-3 py-1 rounded-full font-medium">
                      r/{post.subreddit}
                    </span>
                    {post.isNSFW && (
                      <span className="bg-red-500 text-white text-xs px-3 py-1 rounded-full font-bold">
                        NSFW
                      </span>
                    )}
                  </div>

                  {post.flair && (
                    <div className="absolute top-4 right-4">
                      <span className="bg-blue-500/90 text-white text-xs px-3 py-1 rounded-full font-medium">
                        {post.flair}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        generateSuggestions(post)
                      }}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-full font-bold hover:from-purple-700 hover:to-blue-700 transform hover:scale-110 transition-all duration-200 flex items-center space-x-3 text-lg"
                    >
                      <span>🤖</span>
                      <span>Get AI Help</span>
                    </button>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5">
                  {/* Post Title */}
                  <h3 className="font-bold text-lg text-gray-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    <a 
                      href={`https://reddit.com${post.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {post.title}
                    </a>
                  </h3>

                  {/* Post Preview Text */}
                  {post.content && (
                    <p className="text-sm text-gray-600 mb-4" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {post.content}
                    </p>
                  )}

                  {/* Post Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="hover:text-blue-600 cursor-pointer font-medium">
                      u/{post.author}
                    </span>
                    <span title={new Date(post.created).toLocaleString()} className="hover:text-gray-700">
                      {getRelativeTime(post.created)}
                    </span>
                  </div>

                  {/* Post Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1 text-orange-500 font-semibold">
                        <span>⬆️</span>
                        <span>{formatScore(post.score)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-blue-500 font-semibold">
                        <span>💬</span>
                        <span>{post.commentCount}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button 
                        className="text-gray-400 hover:text-yellow-500 transition-colors text-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ⭐
                      </button>
                      <button 
                        className="text-gray-400 hover:text-green-500 transition-colors text-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (navigator.share) {
                            navigator.share({
                              title: post.title,
                              url: `https://reddit.com${post.permalink}`
                            })
                          } else {
                            navigator.clipboard.writeText(`https://reddit.com${post.permalink}`)
                            alert('Link copied!')
                          }
                        }}
                      >
                        📤
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* AI Suggestion Modal */}
      {showModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex-shrink-0 bg-white border-b p-6 rounded-t-2xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    🤖 AI Engagement Assistant
                  </h2>
                  <p className="text-sm text-gray-600">
                    <strong>r/{selectedPost.subreddit}</strong> • Posted by u/{selectedPost.author} • {getRelativeTime(selectedPost.created)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSuggestions([])
                    setUserInput('')
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content - Two Column Layout */}
            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
                {/* Left Column: Full Post Content - Independent Scroll */}
                <div className="border-r border-gray-200 h-full overflow-hidden">
                  <div className="h-full overflow-y-auto p-6">
                    <div className="space-y-4">
                      {/* Post Title */}
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-3">
                          {selectedPost.title}
                        </h1>
                        {/* Post Meta */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                            r/{selectedPost.subreddit}
                          </span>
                          <span>👤 u/{selectedPost.author}</span>
                          <span>⬆️ {formatScore(selectedPost.score)} ({Math.round(selectedPost.upvoteRatio * 100)}%)</span>
                          <span>💬 {selectedPost.commentCount} comments</span>
                          <span>{getRelativeTime(selectedPost.created)}</span>
                        </div>

                        {/* Post Flair */}
                        {selectedPost.flair && (
                          <div className="mb-4">
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {selectedPost.flair}
                            </span>
                          </div>
                        )}

                        {/* NSFW Warning */}
                        {selectedPost.isNSFW && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 font-medium text-sm">⚠️ This post is marked as NSFW</p>
                          </div>
                        )}
                      </div>

                      {/* Post Content */}
                      <div className="space-y-4">
                      {/* Text Content */}
                      {selectedPost.content && selectedPost.mediaType === 'text' && (
                        <div className="prose prose-sm max-w-none">
                          <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                              {selectedPost.content}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Image Content */}
                      {selectedPost.mediaType === 'image' && selectedPost.mediaUrl && (
                        <div className="space-y-3">
                          <img 
                            src={selectedPost.mediaUrl} 
                            alt={selectedPost.title}
                            className="w-full rounded-lg border shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                          {selectedPost.content && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="whitespace-pre-wrap text-gray-800 text-sm">
                                {selectedPost.content}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video Content */}
                      {selectedPost.mediaType === 'video' && (
                        <div className="space-y-3">
                          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-8 text-center text-white">
                            <div className="text-6xl mb-4">🎥</div>
                            <p className="text-lg font-semibold mb-2">Video Post</p>
                            <a 
                              href={`https://reddit.com${selectedPost.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                            >
                              <span>▶️</span>
                              <span>Watch on Reddit</span>
                            </a>
                          </div>
                          {selectedPost.content && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="whitespace-pre-wrap text-gray-800">
                                {selectedPost.content}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Link Content */}
                      {selectedPost.mediaType === 'link' && selectedPost.url && !selectedPost.url.includes('reddit.com') && (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center space-x-3 mb-2">
                              <span className="text-2xl">🔗</span>
                              <div>
                                <p className="font-medium text-blue-900">External Link</p>
                                <a 
                                  href={selectedPost.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-sm break-all"
                                >
                                  {(() => {
                                    try {
                                      return new URL(selectedPost.url).hostname
                                    } catch {
                                      return selectedPost.url.length > 50 ? selectedPost.url.substring(0, 50) + '...' : selectedPost.url
                                    }
                                  })()}
                                </a>
                              </div>
                            </div>
                            <a 
                              href={selectedPost.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                              <span>🔗</span>
                              <span>Visit Link</span>
                              <span>↗</span>
                            </a>
                          </div>
                          {selectedPost.content && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <div className="whitespace-pre-wrap text-gray-800">
                                {selectedPost.content}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <a 
                              href={`https://reddit.com${selectedPost.permalink}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                            >
                              <span>💬</span>
                              <span>View Comments</span>
                              <span>↗</span>
                            </a>
                            <a 
                              href={selectedPost.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 text-sm"
                            >
                              <span>🔗</span>
                              <span>Original Post</span>
                              <span>↗</span>
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: AI Suggestions - Independent Scroll */}
                <div className="h-full overflow-hidden">
                  <div className="h-full overflow-y-auto p-6">
                    <div className="space-y-6">
                      {/* Voice/Text Input Section */}
                      <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="font-semibold mb-4 flex items-center">
                        <span className="mr-2">💭</span>
                        What are your thoughts on this post?
                      </h3>
                      <div className="space-y-4">
                        <textarea
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          placeholder="Share your thoughts, ask a question, or describe what you want to comment..."
                          className="w-full p-4 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={4}
                        />
                        <div className="flex space-x-3">
                          <button
                            onClick={startVoiceInput}
                            disabled={voiceInput}
                            className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 disabled:bg-red-300 flex items-center space-x-2 transition-colors"
                          >
                            {voiceInput ? (
                              <>
                                <div className="animate-pulse w-3 h-3 bg-white rounded-full"></div>
                                <span>Listening...</span>
                              </>
                            ) : (
                              <>
                                <span>🎤</span>
                                <span>Voice Input</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={refineUserInput}
                            disabled={!userInput.trim() || loadingSuggestions}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 disabled:bg-blue-300 flex items-center space-x-2 transition-colors"
                          >
                            <span>✨</span>
                            <span>Get AI Suggestions</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AI Suggestions Section */}
                    <div>
                      <h3 className="font-semibold mb-4 flex items-center">
                        <span className="mr-2">🎯</span>
                        AI Comment Suggestions
                      </h3>

                      {loadingSuggestions ? (
                        <div className="text-center py-12">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                          <p className="text-gray-600">Analyzing post and generating personalized suggestions...</p>
                        </div>
                      ) : suggestions.length > 0 ? (
                        <div className="space-y-4">
                          {suggestions.map((suggestion) => (
                            <div key={suggestion.id} className="bg-white border-2 border-gray-100 rounded-xl p-6 hover:border-blue-200 transition-colors">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                  <span className="text-lg font-semibold capitalize text-gray-800">
                                    {suggestion.type.replace('_', ' ')}
                                  </span>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(suggestion.riskLevel)}`}>
                                    {suggestion.riskLevel} risk
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-medium text-gray-600">
                                    {Math.round(suggestion.confidence * 100)}% confident
                                  </span>
                                </div>
                              </div>
                              
                              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-gray-800 leading-relaxed">{suggestion.content}</p>
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <p className="text-sm text-gray-600">
                                  <strong>Why this works:</strong> {suggestion.reasoning}
                                </p>
                                <p className="text-sm text-green-600">
                                  <strong>Expected response:</strong> {suggestion.estimatedReception}
                                </p>
                              </div>
                              
                              <div className="flex justify-end">
                                <button
                                  onClick={() => postComment(suggestion)}
                                  className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-orange-600 hover:to-red-600 transition-all transform hover:scale-105 flex items-center space-x-2"
                                >
                                  <span>📤</span>
                                  <span>Post to Reddit</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : userInput.trim() ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>Click "Get AI Suggestions" to generate personalized comment ideas based on your input!</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p>Share your thoughts above to get AI-powered comment suggestions tailored to this post and subreddit rules.</p>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}