'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [redditId, setRedditId] = useState<string>('')

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🤖 Reddit Copilot
          </h1>
          <p className="text-gray-600">
            AI-powered content suggestions for Reddit
          </p>
        </header>

        {!redditId ? (
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Enter Your Reddit ID</h2>
            <p className="text-gray-600 mb-4 text-sm">
              Use your Reddit ID: <code className="bg-gray-100 px-2 py-1 rounded">1bixji3jmy</code>
            </p>
            <input
              type="text"
              placeholder="Enter Reddit ID (e.g., 1bixji3jmy)"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              value={redditId}
              onChange={(e) => setRedditId(e.target.value)}
            />
            <button
              onClick={() => {
                if (redditId.trim()) {
                  // Reddit ID is set, Dashboard will load
                }
              }}
              disabled={!redditId.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Load Dashboard
            </button>
          </div>
        ) : (
          <Dashboard redditId={redditId} />
        )}
      </div>
    </main>
  )
}