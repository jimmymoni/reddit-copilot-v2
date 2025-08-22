'use client'

import { useState, useEffect } from 'react'
import ProfileCard from './ProfileCard'
import SubredditList from './SubredditList'
import SuggestionsFeed from './SuggestionsFeed'
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
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'subreddits' | 'suggestions'>('home')

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
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Navigation */}
      <nav className="flex space-x-1 mb-6 bg-white rounded-lg p-1 shadow-sm">
        {[
          { key: 'home', label: '🏠 Home Feed' },
          { key: 'overview', label: '📊 Overview' },
          { key: 'subreddits', label: '📱 Subreddits' },
          { key: 'suggestions', label: '🤖 AI Suggestions' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {activeTab === 'home' && (
        <HomeFeed redditId={redditId} />
      )}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {profile && <ProfileCard profile={profile} />}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Subreddits:</span>
                <span className="font-medium">{subreddits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Karma:</span>
                <span className="font-medium">{profile?.totalKarma || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Recent Posts:</span>
                <span className="font-medium">{profile?.recentPosts.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subreddits' && (
        <SubredditList subreddits={subreddits} />
      )}

      {activeTab === 'suggestions' && (
        <SuggestionsFeed 
          suggestions={suggestions}
          onLoadSuggestions={loadSuggestions}
          onExecuteAction={executeAction}
        />
      )}
    </div>
  )
}