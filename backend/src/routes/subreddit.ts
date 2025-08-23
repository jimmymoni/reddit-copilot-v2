import { Router } from 'express';
import { RedditService } from '../services/reddit';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

/**
 * GET /api/subreddit/:name
 * Get detailed subreddit information including rules
 */
router.get('/:name', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name is required'
      });
    }

    // Get subreddit info and rules
    const [subredditInfo, rules] = await Promise.all([
      RedditService.getSubredditInfo(redditId, name),
      RedditService.getSubredditRules(name).catch(() => null) // Don't fail if rules unavailable
    ]);

    res.json({
      success: true,
      subreddit: {
        ...subredditInfo,
        rules: rules?.rules || []
      }
    });
  } catch (error) {
    console.error('Subreddit info error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit information',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit information',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * GET /api/subreddit/:name/posts
 * Get latest posts from a specific subreddit
 */
router.get('/:name/posts', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { name } = req.params;
    const limit = parseInt(req.query.limit as string) || 25;
    const sort = req.query.sort as string || 'new'; // new, hot, top

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name is required'
      });
    }

    const posts = await RedditService.getSubredditPosts(redditId, name, sort, limit);

    res.json({
      success: true,
      posts,
      count: posts.length,
      subreddit: name,
      sort
    });
  } catch (error) {
    console.error('Subreddit posts error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit posts',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit posts',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * GET /api/subreddit/:name/rules
 * Get rules for a specific subreddit
 */
router.get('/:name/rules', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Subreddit name is required'
      });
    }

    const rules = await RedditService.getSubredditRules(name);

    res.json({
      success: true,
      rules: rules.rules
    });
  } catch (error) {
    console.error('Subreddit rules error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit rules',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch subreddit rules',
        message: 'Unknown error occurred'
      });
    }
  }
});

export default router;