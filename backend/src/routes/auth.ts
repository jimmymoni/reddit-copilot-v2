import { Router, Request, Response } from 'express';
import { RedditService } from '../services/reddit';

const router = Router();

// Get Reddit OAuth URL
router.get('/reddit/url', (req: Request, res: Response) => {
  try {
    const authUrl = RedditService.getAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle Reddit OAuth callback
router.get('/reddit/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      return res.status(400).json({ error: 'Reddit OAuth error', details: error });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Authorization code required' });
    }

    // Exchange code for tokens
    const { accessToken, refreshToken } = await RedditService.exchangeCodeForTokens(code);
    
    // Get user info to save
    const tempReddit = new (await import('snoowrap')).default({
      userAgent: 'RedditCopilot/1.0.0',
      accessToken,
      clientId: process.env.REDDIT_CLIENT_ID!,
      clientSecret: process.env.REDDIT_CLIENT_SECRET!
    });

    const mePromise = tempReddit.getMe();
    // @ts-ignore: Circular reference issue with snoowrap types
    const me = await mePromise;
    
    // Save user and tokens
    await RedditService.saveUserTokens(me.id, me.name, accessToken, refreshToken);

    res.json({ 
      success: true, 
      user: { 
        redditId: me.id, 
        username: me.name 
      },
      message: 'Authentication successful. Use the redditId in x-reddit-id header for subsequent requests.'
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

export default router;