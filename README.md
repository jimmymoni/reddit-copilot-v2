# Reddit Copilot 🤖

A semi-automated Reddit content assistant powered by OpenAI that analyzes your Reddit profile, generates intelligent content suggestions, and executes approved actions directly on Reddit.

## 🚀 Features

### ✅ Completed Features
- **Reddit OAuth Integration** - Secure authentication with Reddit API
- **Profile Analysis** - Fetch user karma, posts, and account details
- **Subreddit Management** - View and analyze all subscribed subreddits (50+)
- **AI Suggestion Engine** - OpenAI GPT-4 powered content recommendations
- **Action Executor** - Post and comment directly to Reddit from approved suggestions
- **Modern Dashboard** - Clean Next.js frontend with real-time data

### 🎯 Core Workflow
1. **Authenticate** with Reddit OAuth (identity, read, history, mysubreddits, submit permissions)
2. **Analyze** your profile and 50+ subscribed subreddits
3. **Generate** AI-powered content suggestions using OpenAI
4. **Review** suggestions with confidence scores and engagement estimates
5. **Execute** approved actions directly to Reddit

## 🏗️ Architecture

```
Frontend (Next.js)     Backend (Express)      External APIs
├── Dashboard UI   →   ├── Reddit OAuth   →   ├── Reddit API
├── Profile View   →   ├── Data Analysis  →   ├── OpenAI GPT-4
├── Subreddits     →   ├── AI Integration →   └── Database (SQLite)
└── Suggestions    →   └── Action Executor
```

## 📁 Project Structure

```
reddit-copilot/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts        # Reddit OAuth endpoints
│   │   │   └── user.ts        # User data & suggestions
│   │   ├── services/
│   │   │   ├── reddit.ts      # Reddit API integration
│   │   │   └── openai.ts      # OpenAI GPT-4 integration
│   │   ├── middleware/
│   │   │   └── auth.ts        # Authentication middleware
│   │   └── index.ts           # Express server setup
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── dev.db             # SQLite database
│   ├── tests/
│   │   └── subreddits.test.ts # Unit tests
│   └── .env                   # Environment variables
├── frontend/                   # Next.js dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx     # App layout
│   │   │   ├── page.tsx       # Home page
│   │   │   └── globals.css    # Global styles
│   │   └── components/
│   │       ├── Dashboard.tsx   # Main dashboard
│   │       ├── ProfileCard.tsx # User profile widget
│   │       ├── SubredditList.tsx # Subreddit grid
│   │       └── SuggestionsFeed.tsx # AI suggestions
│   └── package.json
└── README.md                   # This file
```

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+
- Reddit app credentials
- OpenAI API key

### 1. Reddit App Setup
1. Go to https://www.reddit.com/prefs/apps
2. Create "web app" with redirect URI: `http://localhost:3001/auth/reddit/callback`
3. Note your client ID and secret

### 2. Backend Setup
```bash
cd backend
npm install
npm run db:generate
npm run db:push
```

Create `.env` file:
```env
DATABASE_URL="file:./prisma/dev.db"
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
REDDIT_REDIRECT_URI=http://localhost:3001/auth/reddit/callback
ENCRYPTION_KEY=your_32_character_encryption_key_here
OPENAI_API_KEY=your_openai_api_key
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Run the Application
```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend && npm run dev
```

### 5. Authentication
1. Visit http://localhost:3000
2. Get OAuth URL from http://localhost:3001/auth/reddit/url
3. Complete Reddit authorization
4. Use your Reddit ID in the dashboard

## 📊 API Endpoints

### Authentication
- `GET /auth/reddit/url` - Get OAuth authorization URL
- `GET /auth/reddit/callback` - Handle OAuth callback

### User Data
- `GET /api/me` - Get Reddit profile (requires x-reddit-id header)
- `GET /api/subreddits` - Get subscribed subreddits
- `POST /api/suggestions` - Generate AI content suggestions
- `POST /api/actions` - Execute approved Reddit actions

### Example Usage
```bash
# Get profile
curl -H "x-reddit-id: YOUR_REDDIT_ID" http://localhost:3001/api/me

# Generate suggestions
curl -X POST -H "x-reddit-id: YOUR_REDDIT_ID" http://localhost:3001/api/suggestions

# Execute action
curl -X POST -H "x-reddit-id: YOUR_REDDIT_ID" -H "Content-Type: application/json" \
  -d '{"type":"post","title":"Test","content":"Hello Reddit!","targetSubreddit":"test"}' \
  http://localhost:3001/api/actions
```

## 🧪 Testing

```bash
cd backend
npm test
```

Tests cover:
- Subreddit endpoint functionality
- Authentication middleware
- Error handling scenarios
- Mock Reddit API responses

## 🎯 Current Implementation Status

### ✅ Fully Working
- **Reddit OAuth** - Complete authentication flow
- **Profile Data** - User karma, posts, account age
- **Subreddit Data** - 50+ subscribed communities with metadata
- **AI Suggestions** - OpenAI GPT-4 powered content recommendations
- **Action Execution** - Direct posting to Reddit
- **Frontend Dashboard** - Full UI with tabs and real-time data

### 🚧 Next Phase Ideas
- **Idea Mining** - Scan subreddits for trending topics and opportunities
- **Smart Scheduling** - Queue posts for optimal timing
- **Analytics Dashboard** - Track post performance and engagement
- **Subreddit Intelligence** - Activity scoring and opportunity ranking
- **Content Templates** - Reusable post formats
- **Multi-account Support** - Manage multiple Reddit accounts

## 🔍 Recent Discussion: Subreddit Efficiency

We're exploring ways to make the subreddit feature more efficient:

### Brainstormed Improvements
1. **Smart Intelligence** - Analyze which subreddits are best for content
2. **Performance Boost** - Faster loading, search, and filtering
3. **Actionable Insights** - Turn subreddit data into posting opportunities
4. **Enhanced UI** - Better visualization and interaction

### Potential Features
- **Caching** - Store subreddit data locally
- **Search/Filter** - Find specific subreddits quickly
- **Categorization** - Group by topic (tech, startups, etc.)
- **Activity Scoring** - Which subreddits you engage with most
- **Opportunity Ranking** - Best subreddits for your content type
- **Quick Actions** - "Generate post for this subreddit" button

## 💡 Key Technical Decisions

### Why These Technologies?
- **Next.js** - Modern React framework with excellent DX
- **Express.js** - Simple, flexible Node.js backend
- **SQLite + Prisma** - Local database with excellent TypeScript support
- **OpenAI GPT-4** - Most capable AI for content generation
- **Tailwind CSS** - Rapid UI development
- **Snoowrap** - Well-maintained Reddit API wrapper

### Security Considerations
- **Token Encryption** - Reddit tokens stored encrypted in database
- **Environment Variables** - Sensitive keys in .env files
- **CORS Protection** - Backend configured for frontend-only access
- **Authentication Middleware** - All API endpoints require valid Reddit ID

## 🚀 Deployment Considerations

For production deployment:
1. **Database** - Migrate to PostgreSQL
2. **Environment** - Use production-grade hosting (Vercel, Railway)
3. **Security** - Add rate limiting, input validation
4. **Monitoring** - Add logging and error tracking
5. **Scaling** - Redis for caching, queue system for actions

## 📈 Success Metrics

The Reddit Copilot successfully:
- ✅ Authenticates with Reddit (OAuth working)
- ✅ Fetches user data (profile, subreddits)
- ✅ Generates smart suggestions (OpenAI integration)
- ✅ Executes actions (posts created on Reddit)
- ✅ Provides clean UI (dashboard functional)

## 🤝 Contributing

This is a personal project built as a learning exercise and practical tool. The modular architecture makes it easy to extend with new features.

## 📄 License

Personal project - built for learning and demonstration purposes.

---

**Built with ❤️ using TypeScript, Next.js, Express, OpenAI, and the Reddit API**