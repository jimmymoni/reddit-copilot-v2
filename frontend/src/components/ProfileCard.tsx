import { RedditProfile } from './Dashboard'

interface ProfileCardProps {
  profile: RedditProfile
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        👤 Reddit Profile
      </h2>
      
      <div className="space-y-3">
        <div>
          <span className="text-gray-600">Username:</span>
          <span className="ml-2 font-medium text-orange-600">u/{profile.username}</span>
        </div>
        
        <div>
          <span className="text-gray-600">Total Karma:</span>
          <span className="ml-2 font-medium">{profile.totalKarma.toLocaleString()}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600 text-sm">Link Karma:</span>
            <div className="font-medium">{profile.linkKarma.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-gray-600 text-sm">Comment Karma:</span>
            <div className="font-medium">{profile.commentKarma.toLocaleString()}</div>
          </div>
        </div>
        
        <div>
          <span className="text-gray-600">Account Age:</span>
          <span className="ml-2 font-medium">
            {new Date(profile.accountCreated).toLocaleDateString()}
          </span>
        </div>
      </div>

      {profile.recentPosts.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h3 className="font-medium mb-3">Recent Posts</h3>
          <div className="space-y-2">
            {profile.recentPosts.slice(0, 3).map((post) => (
              <div key={post.id} className="bg-gray-50 rounded p-3">
                <div className="font-medium text-sm truncate">{post.title}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {post.subreddit} • {post.score} upvotes
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}