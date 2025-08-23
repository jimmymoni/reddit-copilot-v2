'use client'

import { useState, useEffect } from 'react'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [redditId, setRedditId] = useState<string>('')

  return (
    <main className="min-h-screen bg-slate-50">
      {!redditId ? (
        // Minimal login screen - no giant header
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
            {/* Small logo only */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">R</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Reddit Copilot</h1>
              <p className="text-slate-600 text-sm">AI-powered content suggestions</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Reddit ID</label>
                <p className="text-slate-600 mb-3 text-xs">
                  Use: <code className="bg-slate-100 px-2 py-1 rounded font-mono">1bixji3jmy</code>
                </p>
                <input
                  type="text"
                  placeholder="Enter Reddit ID"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-slate-50 transition-all"
                  value={redditId}
                  onChange={(e) => setRedditId(e.target.value)}
                />
              </div>
              
              <button
                onClick={() => {
                  if (redditId.trim()) {
                    // Reddit ID is set, Dashboard will load
                  }
                }}
                disabled={!redditId.trim()}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 transition-all duration-200 shadow-lg shadow-violet-600/25"
              >
                Load Dashboard
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Full-width dashboard - no container constraints
        <Dashboard redditId={redditId} />
      )}
    </main>
  )
}