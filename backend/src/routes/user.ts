import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateUser } from '../middleware/auth';
import { RedditService, RedditAction } from '../services/reddit';
import { OpenAIService } from '../services/openai';

const router = Router();

// Get current user's Reddit profile
router.get('/me', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profile = await RedditService.getUserProfile(req.user.redditId);
    res.json(profile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user profile', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get user's subscribed subreddits
router.get('/subreddits', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const subreddits = await RedditService.getUserSubreddits(req.user.redditId);
    res.json(subreddits);
  } catch (error) {
    console.error('Error fetching user subreddits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user subreddits', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Generate AI-powered content suggestions
router.post('/suggestions', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user profile and subreddits
    const [profile, subreddits] = await Promise.all([
      RedditService.getUserProfile(req.user.redditId),
      RedditService.getUserSubreddits(req.user.redditId)
    ]);

    // Prepare data for OpenAI
    const suggestionRequest = {
      userProfile: {
        username: profile.username,
        karma: profile.totalKarma,
        accountAge: `${Math.floor((Date.now() - profile.accountCreated.getTime()) / (1000 * 60 * 60 * 24))} days`
      },
      subreddits: subreddits.slice(0, 20).map(sub => ({
        name: sub.name,
        title: sub.title,
        description: sub.public_description,
        subscribers: sub.subscribers
      })),
      recentPosts: profile.recentPosts.slice(0, 5).map(post => ({
        title: post.title,
        subreddit: post.subreddit,
        score: post.score
      }))
    };

    // Generate suggestions using OpenAI
    const suggestions = await OpenAIService.generateSuggestions(suggestionRequest);

    res.json({
      suggestions,
      metadata: {
        generatedAt: new Date().toISOString(),
        basedOnSubreddits: subreddits.length,
        userKarma: profile.totalKarma
      }
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to generate suggestions', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Execute approved Reddit actions
router.post('/actions', authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const action: RedditAction = req.body;

    // Validate required fields
    if (!action.type || !action.title || !action.content || !action.targetSubreddit) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, title, content, targetSubreddit' 
      });
    }

    // Add unique ID if not provided
    if (!action.id) {
      action.id = `action_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    // Execute the action on Reddit
    const result = await RedditService.executeAction(req.user.redditId, action);

    res.json(result);
  } catch (error) {
    console.error('Error executing Reddit action:', error);
    res.status(500).json({ 
      error: 'Failed to execute action', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;