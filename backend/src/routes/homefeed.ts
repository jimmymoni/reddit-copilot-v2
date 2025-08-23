import { Router } from 'express';
import { RedditService } from '../services/reddit';
import { OpenAIService } from '../services/openai';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { ContentFilterService, FILTER_PRESETS, BUSINESS_CATEGORIES } from '../services/contentFilter';
import { getSubredditData } from '../services/subredditData';

const router = Router();

/**
 * GET /api/homefeed
 * Get home feed posts from user's subscribed subreddits with filtering
 */
router.get('/', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const limit = parseInt(req.query.limit as string) || 200;
    const filterPreset = req.query.filter as string || 'business_opportunities';
    const subredditFilter = req.query.subreddit as string;

    // Get raw posts
    const rawPosts = await RedditService.getHomeFeed(redditId, limit * 2); // Get more to have enough after filtering
    
    let filteredPosts;
    
    if (subredditFilter) {
      // Filter by specific subreddit
      filteredPosts = rawPosts.filter(post => 
        post.subreddit.toLowerCase() === subredditFilter.toLowerCase()
      );
    } else {
      // Apply content filtering
      filteredPosts = ContentFilterService.getFilteredFeed(rawPosts, filterPreset);
    }
    
    // Limit final results
    const finalPosts = filteredPosts.slice(0, limit);
    
    res.json({
      success: true,
      posts: finalPosts,
      count: finalPosts.length,
      totalScanned: rawPosts.length,
      filterApplied: subredditFilter ? `subreddit:${subredditFilter}` : filterPreset
    });
  } catch (error) {
    console.error('Home feed error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch home feed',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch home feed',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * POST /api/homefeed/engagement-suggestions
 * Generate AI engagement suggestions for a specific post
 */
router.post('/engagement-suggestions', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { postId } = req.body;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Post ID is required'
      });
    }

    // Get user profile for context
    const userProfile = await RedditService.getUserProfile(redditId);
    
    // Get the specific post from home feed
    const homeFeed = await RedditService.getHomeFeed(redditId, 100);
    const post = homeFeed.find(p => p.id === postId);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found in home feed'
      });
    }

    // Get subreddit rules
    let subredditRules;
    try {
      subredditRules = await RedditService.getSubredditRules(post.subreddit);
    } catch (error) {
      console.warn(`Could not fetch rules for r/${post.subreddit}:`, error);
    }

    // Generate engagement suggestions
    const suggestions = await OpenAIService.generateEngagementSuggestions(
      post,
      userProfile,
      subredditRules
    );

    res.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        subreddit: post.subreddit
      },
      suggestions,
      rulesAvailable: !!subredditRules
    });
  } catch (error) {
    console.error('Engagement suggestions error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to generate engagement suggestions',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to generate engagement suggestions',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * POST /api/homefeed/improve-comment
 * Improve user's comment to be more engaging and appropriate
 */
router.post('/improve-comment', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { postId, userComment } = req.body;

    if (!postId || !userComment) {
      return res.status(400).json({
        success: false,
        error: 'Post ID and user comment are required'
      });
    }

    // Get user profile and post
    const userProfile = await RedditService.getUserProfile(redditId);
    const homeFeed = await RedditService.getHomeFeed(redditId, 100);
    const post = homeFeed.find(p => p.id === postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }

    // Get subreddit rules
    let subredditRules;
    try {
      subredditRules = await RedditService.getSubredditRules(post.subreddit);
    } catch (error) {
      console.warn(`Could not fetch rules for r/${post.subreddit}:`, error);
    }

    // Improve user comment
    const improvedComment = await OpenAIService.refineUserInput(
      userComment,
      post,
      userProfile,
      subredditRules
    );

    res.json({
      success: true,
      originalComment: userComment,
      improvedComment,
      post: {
        id: post.id,
        title: post.title,
        subreddit: post.subreddit
      }
    });
  } catch (error) {
    console.error('Input refinement error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to refine input',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to refine input',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * GET /api/homefeed/subreddit-rules/:subreddit
 * Get rules for a specific subreddit (simplified for 2-day sprint)
 */
router.get('/subreddit-rules/:subreddit', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { subreddit } = req.params;
    
    // Use hardcoded data for quick implementation
    const subredditData = getSubredditData(subreddit);
    
    res.json({
      success: true,
      rules: {
        subreddit: subreddit,
        flairRequired: subredditData.flairRequired,
        minLength: subredditData.minLength || 0,
        commonFlairs: subredditData.commonFlairs,
        keyRules: subredditData.keyRules
      }
    });
  } catch (error) {
    console.error('Subreddit rules error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subreddit rules',
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/homefeed/comment
 * Post a comment to Reddit using refined suggestion
 */
router.post('/comment', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { postId, content } = req.body;

    if (!postId || !content) {
      return res.status(400).json({
        success: false,
        error: 'Post ID and comment content are required'
      });
    }

    // Create comment action
    const action = {
      id: `comment_${Date.now()}`,
      type: 'comment' as const,
      title: '',
      content,
      targetSubreddit: '',
      parentId: postId
    };

    const result = await RedditService.executeAction(redditId, action);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Comment posting error:', error);
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        error: 'Failed to post comment',
        message: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to post comment',
        message: 'Unknown error occurred'
      });
    }
  }
});

/**
 * GET /api/homefeed/subreddits
 * Get user's subscribed subreddits for filtering
 */
router.get('/subreddits', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    
    // Get user's subscribed subreddits
    const subreddits = await RedditService.getUserSubreddits(redditId);
    
    res.json({
      success: true,
      subreddits: subreddits.map(sub => ({
        name: sub.name,
        title: sub.title,
        subscribers: sub.subscribers,
        description: sub.description
      }))
    });
  } catch (error) {
    console.error('Subreddits fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subreddits'
    });
  }
});

/**
 * GET /api/homefeed/filters
 * Get available filter presets
 */
router.get('/filters', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({
      success: true,
      presets: FILTER_PRESETS,
      categories: BUSINESS_CATEGORIES
    });
  } catch (error) {
    console.error('Filter presets error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter presets'
    });
  }
});

/**
 * POST /api/homefeed/preview-filter
 * Preview posts with a specific filter without saving
 */
router.post('/preview-filter', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const redditId = req.user!.redditId;
    const { filterPreset, customFilter } = req.body;

    // Get sample posts
    const rawPosts = await RedditService.getHomeFeed(redditId, 100);
    
    let filteredPosts;
    if (customFilter) {
      // Use custom filter
      filteredPosts = ContentFilterService.filterPosts(rawPosts, customFilter);
    } else {
      // Use preset
      filteredPosts = ContentFilterService.getFilteredFeed(rawPosts, filterPreset);
    }
    
    // Return preview with stats
    res.json({
      success: true,
      preview: filteredPosts.slice(0, 10),
      stats: {
        totalPosts: rawPosts.length,
        filteredPosts: filteredPosts.length,
        filterEfficiency: Math.round((filteredPosts.length / rawPosts.length) * 100)
      }
    });
  } catch (error) {
    console.error('Filter preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview filter'
    });
  }
});

export default router;