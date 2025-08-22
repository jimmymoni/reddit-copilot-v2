# Reddit Copilot - Quick Setup Guide

## Prerequisites
- Node.js 18 or higher
- Git (optional)
- Reddit Developer Account
- OpenAI API Key

## Step-by-Step Setup

### 1. Reddit App Registration
1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Choose "web app" type
4. Set redirect URI: `http://localhost:3001/api/auth/reddit/callback`
5. Note down your client ID and secret

### 2. OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Save it securely

### 3. Environment Setup

Create `backend/.env`:
```bash
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here
REDDIT_REDIRECT_URI=http://localhost:3001/api/auth/reddit/callback
OPENAI_API_KEY=your_openai_key_here
JWT_SECRET=your_random_secret_here
PORT=3001
DATABASE_URL="file:./dev.db"
```

Create `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Backend Installation
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 5. Frontend Installation
```bash
# In new terminal
cd frontend
npm install
npm run dev
```

### 6. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Verification Steps

1. ✅ Backend running on port 3001
2. ✅ Frontend running on port 3000
3. ✅ Can click "Connect Reddit Account"
4. ✅ Reddit OAuth flow works
5. ✅ Home feed loads with posts
6. ✅ Filter buttons work
7. ✅ Clicking posts opens modal
8. ✅ AI suggestions generate
9. ✅ Voice input works (if supported)
10. ✅ Comments can be posted

## Troubleshooting

### Backend won't start:
- Check .env file exists and has all variables
- Verify Reddit client ID/secret are correct
- Check port 3001 is available

### Frontend won't start:
- Check .env.local exists
- Verify backend is running first
- Clear .next folder: `rm -rf .next`

### Reddit auth fails:
- Verify redirect URI matches exactly
- Check Reddit app type is "web app"
- Ensure client ID/secret are correct

### AI features don't work:
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Look at backend console for errors

### Database issues:
```bash
cd backend
npx prisma db push --force-reset
npx prisma generate
```

## Production Deployment Notes

For production deployment:
1. Use PostgreSQL instead of SQLite
2. Set NODE_ENV=production
3. Update REDDIT_REDIRECT_URI to production domain
4. Use environment variables for all secrets
5. Enable HTTPS
6. Add rate limiting
7. Set up error monitoring
8. Configure CORS for production domain

## File Structure Reference

```
REDDIT/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── middleware/     # Auth & other middleware
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── dev.db         # SQLite database
│   └── package.json
├── frontend/               # Next.js React app
│   ├── src/
│   │   ├── app/           # Next.js 13+ app router
│   │   └── components/    # React components
│   └── package.json
├── PROJECT_BACKUP_SUMMARY.md
├── TYDAL_ANALYSIS.md
└── README.md
```

## Key Files to Never Delete

- `backend/src/services/contentFilter.ts` - Business filtering logic
- `frontend/src/components/HomeFeed.tsx` - Main UI component  
- `backend/prisma/schema.prisma` - Database schema
- `backend/src/services/reddit.ts` - Reddit API integration
- `backend/src/services/openai.ts` - AI suggestions
- All `.env` files (contains secrets)

Save this guide with your project for easy restoration!