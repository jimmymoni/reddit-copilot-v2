import { Subreddit } from './Dashboard'

interface SubredditListProps {
  subreddits: Subreddit[]
}

export default function SubredditList({ subreddits }: SubredditListProps) {
  const sortedSubreddits = [...subreddits].sort((a, b) => b.subscribers - a.subscribers)

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold text-slate-900 mb-3 flex items-center justify-center">
          <span className="mr-3">📱</span>
          Your Subreddits
          <span className="ml-3 text-lg font-normal text-slate-500">({subreddits.length} communities)</span>
        </h2>
        <p className="text-slate-600">Connected communities and their engagement metrics</p>
      </div>

      {/* Subreddits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {sortedSubreddits.map((subreddit) => (
          <div 
            key={subreddit.name} 
            className="group bg-white rounded-3xl shadow-sm border border-slate-200/60 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-500 cursor-pointer overflow-hidden hover:-translate-y-1 p-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-violet-600 group-hover:text-violet-700 transition-colors">
                  r/{subreddit.name}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs font-medium text-slate-500">
                    {subreddit.subscribers.toLocaleString()} members
                  </span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                  <span className="text-xs font-medium text-emerald-600">
                    {subreddit.active_user_count} active
                  </span>
                </div>
              </div>
            </div>
            
            {/* Title */}
            <h4 className="font-semibold text-slate-900 mb-3 line-clamp-2 leading-tight">
              {subreddit.title}
            </h4>
            
            {/* Description */}
            {subreddit.public_description && (
              <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                {subreddit.public_description}
              </p>
            )}
            
            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <span className="text-slate-400">👥</span>
                  <span className="text-xs font-medium text-slate-600">
                    {(subreddit.subscribers / 1000).toFixed(0)}K
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-emerald-400">•</span>
                  <span className="text-xs font-medium text-emerald-600">
                    {subreddit.active_user_count} online
                  </span>
                </div>
              </div>
              <a 
                href={`https://reddit.com${subreddit.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-600 hover:text-violet-700 font-medium text-sm flex items-center space-x-1 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <span>Visit</span>
                <span>↗️</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}