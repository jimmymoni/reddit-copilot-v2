import { Subreddit } from './Dashboard'

interface SubredditListProps {
  subreddits: Subreddit[]
}

export default function SubredditList({ subreddits }: SubredditListProps) {
  const sortedSubreddits = [...subreddits].sort((a, b) => b.subscribers - a.subscribers)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        📱 Your Subreddits ({subreddits.length})
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedSubreddits.map((subreddit) => (
          <div key={subreddit.name} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-orange-600">r/{subreddit.name}</h3>
              <span className="text-xs text-gray-500">
                {subreddit.subscribers.toLocaleString()} members
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {subreddit.title}
            </p>
            
            {subreddit.public_description && (
              <p className="text-xs text-gray-500 line-clamp-2">
                {subreddit.public_description}
              </p>
            )}
            
            <div className="mt-3 flex justify-between items-center text-xs text-gray-400">
              <span>{subreddit.active_user_count} active</span>
              <a 
                href={`https://reddit.com${subreddit.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                Visit →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}