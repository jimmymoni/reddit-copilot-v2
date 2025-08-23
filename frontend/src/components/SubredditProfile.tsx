'use client'

import { useState, useEffect } from 'react'
import { RedditPost } from './HomeFeed'

interface SubredditRule {
  short_name: string
  description: string
  violation_reason: string
}

interface SubredditInfo {
  name: string
  title: string
  description: string
  subscribers: number
  activeUsers: number
  created: string
  rules: SubredditRule[]
  isNSFW: boolean
  icon?: string
}

interface SubredditProfileProps {
  subredditName: string
  redditId: string
  onClose: () => void
}

export default function SubredditProfile({ subredditName, redditId, onClose }: SubredditProfileProps) {
  const [subredditInfo, setSubredditInfo] = useState<SubredditInfo | null>(null)
  const [latestPosts, setLatestPosts] = useState<RedditPost[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'rules'>('posts')

  useEffect(() => {
    fetchSubredditData()
  }, [subredditName])

  const fetchSubredditData = async () => {
    setLoading(true)
    try {
      // Fetch subreddit info and rules
      const [infoResponse, postsResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/subreddit/${subredditName}`, {
          headers: { 'x-reddit-id': redditId }
        }),
        fetch(`http://localhost:3001/api/subreddit/${subredditName}/posts?limit=20`, {
          headers: { 'x-reddit-id': redditId }
        })
      ])

      if (infoResponse.ok) {
        const infoData = await infoResponse.json()
        setSubredditInfo(infoData.subreddit)
      }

      if (postsResponse.ok) {
        const postsData = await postsResponse.json()
        setLatestPosts(postsData.posts.map((post: any) => ({
          ...post,
          created: new Date(post.created)
        })))
      }
    } catch (error) {
      console.error('Failed to fetch subreddit data:', error)
    }
    setLoading(false)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`
    return num.toString()
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    return `${Math.floor(diffInSeconds / 604800)}w ago`
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-center">Loading r/{subredditName}...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              {subredditInfo?.icon && (
                <img 
                  src={subredditInfo.icon} 
                  alt={`r/${subredditName}`}
                  className="w-16 h-16 rounded-full border-2 border-white"
                />
              )}
              <div>
                <h1 className="text-3xl font-bold">r/{subredditName}</h1>
                {subredditInfo && (
                  <>
                    <p className="text-orange-100 mt-1">{subredditInfo.title}</p>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      <span>👥 {formatNumber(subredditInfo.subscribers)} members</span>
                      <span>🟢 {formatNumber(subredditInfo.activeUsers)} online</span>
                      {subredditInfo.isNSFW && (
                        <span className="bg-red-600 px-2 py-1 rounded text-xs font-bold">NSFW</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-shrink-0 border-b border-gray-200 bg-white">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'posts'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Latest Posts ({latestPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'rules'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Rules ({subredditInfo?.rules?.length || 0})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'posts' && (
            <div className="p-6">
              {latestPosts.length > 0 ? (
                <div className="space-y-4">
                  {latestPosts.map((post) => (
                    <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-gray-900 flex-1 pr-4">
                          {post.title}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>⬆️ {post.score}</span>
                          <span>💬 {post.commentCount}</span>
                        </div>
                      </div>
                      
                      {post.content && post.content.length > 0 && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                          {post.content.substring(0, 200)}
                          {post.content.length > 200 && '...'}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-3">
                          <span>👤 u/{post.author}</span>
                          <span>{getRelativeTime(post.created)}</span>
                          {post.flair && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              {post.flair}
                            </span>
                          )}
                        </div>
                        <a
                          href={`https://reddit.com${post.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline"
                        >
                          View on Reddit →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No recent posts found in r/{subredditName}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="p-6">
              {subredditInfo?.description && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">About this community</h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{subredditInfo.description}</p>
                </div>
              )}
              
              {subredditInfo?.rules && subredditInfo.rules.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Community Rules</h3>
                  {subredditInfo.rules.map((rule, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {rule.short_name}
                      </h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">
                        {rule.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No rules available for r/{subredditName}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}