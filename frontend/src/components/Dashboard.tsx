'use client'

import { useState, useEffect } from 'react'
import ProfileCard from './ProfileCard'
import SubredditList from './SubredditList'
import ResearchEngine from './ResearchEngine'
import HomeFeed from './HomeFeed'

interface DashboardProps {
  redditId: string
}

export interface RedditProfile {
  id: string
  username: string
  totalKarma: number
  linkKarma: number
  commentKarma: number
  accountCreated: string
  recentPosts: Array<{
    id: string
    title: string
    subreddit: string
    score: number
    created: string
    url: string
  }>
}

export interface Subreddit {
  name: string
  title: string
  subscribers: number
  public_description: string
  url: string
  active_user_count: number
}

export interface Suggestion {
  id: string
  type: 'post' | 'comment' | 'engagement'
  title: string
  content: string
  targetSubreddit: string
  reasoning: string
  confidence: number
  estimatedEngagement: string
}

export default function Dashboard({ redditId }: DashboardProps) {
  const [profile, setProfile] = useState<RedditProfile | null>(null)
  const [subreddits, setSubreddits] = useState<Subreddit[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'subreddits' | 'research'>('home')
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false)

  useEffect(() => {
    loadData()
  }, [redditId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load profile and subreddits in parallel
      const [profileRes, subredditsRes] = await Promise.all([
        fetch('/api/me', {
          headers: { 'x-reddit-id': redditId }
        }),
        fetch('/api/subreddits', {
          headers: { 'x-reddit-id': redditId }
        })
      ])

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        setProfile(profileData)
      }

      if (subredditsRes.ok) {
        const subredditsData = await subredditsRes.json()
        setSubreddits(subredditsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSuggestions = async () => {
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'x-reddit-id': redditId,
          'Content-Type': 'application/json'
        }
      })

      if (res.ok) {
        const data = await res.json()
        setSuggestions(data.suggestions)
      } else {
        const errorData = await res.json()
        alert(`Failed to generate suggestions: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
      alert('Failed to connect to server. Please check your connection and try again.')
    }
  }

  const executeAction = async (suggestion: Suggestion) => {
    try {
      const action = {
        type: suggestion.type,
        title: suggestion.title,
        content: suggestion.content,
        targetSubreddit: suggestion.targetSubreddit.replace('r/', '')
      }

      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'x-reddit-id': redditId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(action)
      })

      if (res.ok) {
        const result = await res.json()
        alert(`Success! Action executed: ${result.message}`)
        // Remove the executed suggestion
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id))
      } else {
        const error = await res.json()
        alert(`Error: ${error.details || error.error}`)
      }
    } catch (error) {
      console.error('Error executing action:', error)
      alert('Error executing action')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Ultra Minimal Top Bar - Full Width */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-12">
            {/* Compact Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-md flex items-center justify-center">
                <span className="text-white font-bold text-xs">R</span>
              </div>
              <span className="text-base font-bold text-slate-900">Reddit Copilot</span>
            </div>
            
            {/* User Status - Ultra Compact */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-600">
                {profile ? profile.username : 'Loading...'}
              </span>
              <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {profile ? profile.username[0].toUpperCase() : 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact Navigation Strip - Full Width */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-slate-200/50">
        <div className="w-full px-6">
          <div className="flex items-center py-2 gap-1">
            {[
              { key: 'home', label: 'Home', icon: '🏠' },
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'subreddits', label: 'Subreddits', icon: '📱' },
              { key: 'research', label: 'Research', icon: '🔍' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 ${
                  activeTab === tab.key
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
            
            {/* Filters Dropdown - Only show on Home tab */}
            {activeTab === 'home' && (
              <div className="relative ml-4">
                <button
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all duration-200 text-slate-600 hover:text-slate-900 hover:bg-white/80 border border-slate-200/60"
                >
                  <span className="text-sm">🎛</span>
                  <span>Filters</span>
                  <span className="text-xs">▼</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Width Main Content - No padding on sides */}
      <div className="w-full py-4">

      {/* Content */}
      {activeTab === 'home' && (
        <HomeFeed redditId={redditId} />
      )}

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back{profile ? `, ${profile.username}` : ''}! 👋
            </h2>
            <p className="text-gray-600">Here's your Reddit activity overview</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="notion-card text-center">
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{profile?.totalKarma || 0}</div>
              <div className="text-sm text-gray-600">Total Karma</div>
            </div>
            <div className="notion-card text-center">
              <div className="text-3xl mb-2">📱</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{subreddits.length}</div>
              <div className="text-sm text-gray-600">Subreddits</div>
            </div>
            <div className="notion-card text-center">
              <div className="text-3xl mb-2">📝</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">{profile?.recentPosts.length || 0}</div>
              <div className="text-sm text-gray-600">Recent Posts</div>
            </div>
          </div>

          {/* Profile Details */}
          {profile && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Account Info */}
              <div className="notion-card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👤</span>
                  Account Details
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Username</label>
                    <div className="text-gray-900 font-medium">u/{profile.username}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Member Since</label>
                    <div className="text-gray-900">{new Date(profile.accountCreated).toLocaleDateString()}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Link Karma</label>
                      <div className="text-gray-900 font-medium">{profile.linkKarma}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Comment Karma</label>
                      <div className="text-gray-900 font-medium">{profile.commentKarma}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="notion-card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {profile.recentPosts.length > 0 ? (
                    profile.recentPosts.slice(0, 3).map((post) => (
                      <div key={post.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900 text-sm mb-1 truncate">
                          {post.title}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>r/{post.subreddit}</span>
                          <span>{post.score} points</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <div className="text-2xl mb-2">📝</div>
                      <p>No recent posts found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'subreddits' && (
        <SubredditList subreddits={subreddits} />
      )}

      {activeTab === 'research' && (
        <ResearchEngine redditId={redditId} />
      )}
      </div>
    </div>
  )
}