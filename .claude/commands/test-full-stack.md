# Test Full Stack

Test the application: $ARGUMENTS

## Complete Testing Flow:

### 1. Backend Testing
```bash
cd backend
npm run build          # Check TypeScript compilation
npm run lint           # Check code style
npm run typecheck      # Verify types
npm test              # Run unit tests (if available)
```

### 2. Frontend Testing  
```bash
cd frontend
npm run build          # Check Next.js build
npm run lint           # Check code style
npm run type-check     # Verify TypeScript
npm test              # Run component tests (if available)
```

### 3. Integration Testing
- Start both servers (backend:3001, frontend:3000)
- Test authentication flow
- Test API endpoints with real data
- Test UI functionality end-to-end
- Check browser console for errors
- Verify responsive design

### 4. Manual Testing Checklist
- [ ] User can authenticate with Reddit
- [ ] Home feed loads real posts
- [ ] Filtering works correctly  
- [ ] AI suggestions generate properly
- [ ] Comments can be posted
- [ ] Error handling works
- [ ] Performance is acceptable

Report any issues found during testing.