# Claude Code Guidelines for Reddit Copilot v2

## Project Overview
Full-stack Reddit engagement tool with AI-powered comment suggestions and filtering system.

## Architecture
- **Backend**: Node.js + Express + TypeScript + Prisma + SQLite
- **Frontend**: Next.js + React + TypeScript + Tailwind CSS  
- **Database**: SQLite with Prisma ORM
- **APIs**: Reddit API (snoowrap), OpenAI API, Kimi API

## Development Commands

### Backend Commands
```bash
cd backend
npm install                 # Install dependencies
npm run dev                # Start development server (port 3001)
npm run build              # Build TypeScript
npm start                  # Start production server
npm run lint               # Run ESLint
npm run typecheck          # Run TypeScript check
npx prisma studio          # Open database browser
npx prisma db push         # Update database schema
npx prisma generate        # Generate Prisma client
```

### Frontend Commands  
```bash
cd frontend
npm install                # Install dependencies
npm run dev               # Start development server (port 3000)
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint
npm run type-check        # Run TypeScript check
```

### Git Workflow
```bash
git status                # Check changes
git add .                 # Stage changes
git commit -m "message"   # Commit with message
git push origin master    # Push to GitHub
```

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript strict mode
- Prefer `const` over `let`
- Use arrow functions for callbacks
- Use async/await over Promises.then()
- Add proper error handling with try-catch
- Use descriptive variable names
- Add JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Use TypeScript interfaces for props
- Keep components focused and small
- Use proper state management (useState, useEffect)
- Handle loading and error states
- Use semantic HTML elements

### API Routes
- Follow RESTful conventions
- Use proper HTTP status codes
- Add comprehensive error handling
- Validate input parameters
- Add request/response logging
- Use middleware for authentication

### Database
- Use Prisma for all database operations
- Add proper indexes for performance
- Use transactions for multi-operation updates
- Handle database errors gracefully

## Testing Strategy

### Backend Testing
```bash
cd backend
npm test                  # Run all tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Frontend Testing
```bash  
cd frontend
npm test                  # Run component tests
npm run test:e2e          # End-to-end tests
```

## Environment Setup

### Required Environment Variables (.env)
```
# Reddit API
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
REDDIT_REDIRECT_URI=http://localhost:3001/auth/reddit/callback

# OpenAI API
OPENAI_API_KEY=your_openai_key

# Kimi API (optional)
KIMI_API_KEY=your_kimi_key

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
SESSION_SECRET=your_session_secret

# Database
DATABASE_URL="file:./dev.db"
```

### Development Server Setup
1. Start backend: `cd backend && npm run dev` (port 3001)
2. Start frontend: `cd frontend && npm run dev` (port 3000)
3. Access app: http://localhost:3000

## Key Features & Modules

### Authentication Flow
- Reddit OAuth 2.0 integration
- Token encryption and storage
- Middleware-based route protection

### Content Filtering System  
- Smart content filtering with business focus
- Subreddit-specific filtering
- Real-time post scoring and ranking
- Fallback mechanisms for API failures

### AI Integration
- OpenAI for engagement suggestions
- Comment improvement and optimization
- Subreddit rule compliance checking

### Performance Optimizations
- Intelligent caching (5-minute frontend cache)
- Rate limiting for Reddit API calls
- Retry logic with exponential backoff
- Parallel API requests where possible

## Common Tasks

### Adding New API Endpoint
1. Create route in `backend/src/routes/`
2. Add middleware and validation
3. Update TypeScript interfaces
4. Add error handling
5. Test with Postman/curl
6. Update frontend to consume API

### Adding New React Component  
1. Create component in `frontend/src/components/`
2. Define TypeScript interfaces
3. Add proper state management
4. Handle loading/error states
5. Add responsive styling with Tailwind
6. Test component behavior

### Database Schema Changes
1. Update `backend/prisma/schema.prisma`
2. Run `npx prisma db push`
3. Run `npx prisma generate`
4. Update TypeScript types
5. Test migration

## Debugging Tips

### Backend Issues
- Check server logs in terminal
- Use Prisma Studio for database inspection  
- Test API endpoints with curl/Postman
- Check environment variables
- Verify Reddit API credentials

### Frontend Issues
- Check browser developer console
- Verify API endpoints are accessible
- Check network tab for failed requests
- Test component state with React DevTools
- Verify environment variables

### Common Error Patterns
- **401 Unauthorized**: Check Reddit tokens/auth
- **500 Server Error**: Check backend logs and database
- **404 Not Found**: Verify route paths
- **Rate Limiting**: Check API call frequency
- **CORS Issues**: Verify frontend/backend ports

## Repository Etiquette

### Commit Messages
Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug`  
- `docs: update documentation`
- `style: formatting changes`
- `refactor: code restructure`
- `test: add tests`
- `chore: maintenance tasks`

### Branch Strategy
- `master`: Production-ready code
- Feature branches: `feature/description`
- Bug fixes: `fix/description`
- Always test before merging

### Code Reviews
- Review TypeScript errors
- Check for security issues
- Verify error handling
- Test critical user flows
- Check responsive design

## Claude Code Specific Notes

### Advanced Claude Code Features
- **Use `/clear` frequently** - Clear context every time you start a new task to save tokens
- **Think Commands**: Use `think`, `think hard`, `think harder`, or `ultrathink` for complex planning
- **Custom Commands**: Use `/debug-api`, `/add-feature`, `/commit-changes`, `/test-full-stack`, `/analyze-performance`
- **Visual Integration**: Take screenshots (Cmd+Ctrl+Shift+4 on Mac) and paste with Ctrl+V for UI issues
- **Tab Completion**: Use tab to quickly reference files and folders

### When Working on This Project
1. **Always use `/clear`** when starting new tasks or features
2. Use `think` commands for complex planning and architecture decisions
3. Always check both backend and frontend for related changes
4. Run TypeScript checks before committing
5. Test API endpoints when modifying backend
6. Check browser console when modifying frontend
7. Verify environment variables are set
8. Use TodoWrite tool for complex multi-step tasks

### Preferred Development Flow (UPDATED)
1. **Clear Context**: `/clear` to start fresh
2. **Explore**: Read relevant files to understand context
3. **Think**: Use `think` or `ultrathink` for complex planning
4. **Plan**: Create todo list for complex tasks using TodoWrite
5. **Code**: Implement changes incrementally  
6. **Test**: Verify functionality works end-to-end
7. **Commit**: Save changes with descriptive messages
8. **Clear**: Use `/clear` before next task

### Tool Usage Best Practices
- **Context Management**: Use `/clear` every 2-3 tasks to avoid token waste
- **Visual Debugging**: Screenshot errors, UI issues, diagrams for better communication
- **Custom Commands**: Use slash commands for repeated workflows
- **File Reading**: Use Read tool extensively to understand existing code
- **Pattern Matching**: Use Grep/Glob for finding patterns across files
- **Command Execution**: Use Bash for running commands and testing
- **Code Changes**: Use Edit/MultiEdit for code changes
- **File Creation**: Use Write only for new files when necessary
- **Planning**: Use `think` commands before complex implementations