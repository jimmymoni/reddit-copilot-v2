import { useState } from 'react'
import { Suggestion } from './Dashboard'

interface SuggestionsFeedProps {
  suggestions: Suggestion[]
  onLoadSuggestions: () => Promise<void>
  onExecuteAction: (suggestion: Suggestion) => Promise<void>
}

export default function SuggestionsFeed({ 
  suggestions, 
  onLoadSuggestions, 
  onExecuteAction 
}: SuggestionsFeedProps) {
  const [loading, setLoading] = useState(false)
  const [executingId, setExecutingId] = useState<string | null>(null)

  const handleLoadSuggestions = async () => {
    setLoading(true)
    await onLoadSuggestions()
    setLoading(false)
  }

  const handleExecute = async (suggestion: Suggestion) => {
    const confirmed = window.confirm(
      `Are you sure you want to execute this ${suggestion.type}?\n\n` +
      `Title: ${suggestion.title}\n` +
      `Target: r/${suggestion.targetSubreddit}\n\n` +
      `This will post to Reddit!`
    )

    if (confirmed) {
      setExecutingId(suggestion.id)
      await onExecuteAction(suggestion)
      setExecutingId(null)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'post': return '📝'
      case 'comment': return '💬'
      case 'engagement': return '🎯'
      default: return '📋'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100'
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          🤖 AI Suggestions ({suggestions.length})
        </h2>
        <button
          onClick={handleLoadSuggestions}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating...
            </>
          ) : (
            '✨ Generate New Suggestions'
          )}
        </button>
      </div>

      {suggestions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg mb-2">No suggestions yet</p>
          <p className="text-sm">Click "Generate New Suggestions" to get AI-powered content ideas!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getTypeIcon(suggestion.type)}</span>
                  <div>
                    <h3 className="font-medium">{suggestion.title}</h3>
                    <p className="text-sm text-gray-600">r/{suggestion.targetSubreddit}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                  {Math.round(suggestion.confidence * 100)}% confidence
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-700 mb-2">{suggestion.content}</p>
                <p className="text-xs text-gray-500 italic">{suggestion.reasoning}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Est. engagement: {suggestion.estimatedEngagement}
                </span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleExecute(suggestion)}
                    disabled={executingId === suggestion.id}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:bg-green-400 flex items-center"
                  >
                    {executingId === suggestion.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                        Executing...
                      </>
                    ) : (
                      '✅ Approve & Execute'
                    )}
                  </button>
                  <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                    ❌ Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}