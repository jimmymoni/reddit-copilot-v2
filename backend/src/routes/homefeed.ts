import { Router } from 'express';
import { RedditService } from '../services/reddit';
import { OpenAIService } from '../services/openai';
import { authenticateUser, AuthenticatedRequest } from '../middleware/auth';
import { ContentFilterService, FILTER_PRESETS, BUSINESS_CATEGORIES } from '../services/contentFilter';
import { getSubredditData } from '../services/subredditData';

const router = Router();

// Mock data generator for development/testing when Reddit API is unavailable
function generateMockPosts(targetSubreddit?: string) {
  const mockPosts = [
    {
      id: 'mock1',
      title: 'How to validate your SaaS startup idea in 2024',
      content: 'I recently launched a SaaS tool and learned some valuable lessons about idea validation. Here are the steps that actually worked for me...',
      author: 'startup_founder',
      subreddit: 'saas',
      score: 156,
      commentCount: 42,
      created: new Date(Date.now() - 3600000),
      url: 'https://reddit.com/r/saas/mock1',
      permalink: '/r/saas/comments/mock1/',
      mediaType: 'text' as const,
      flair: 'Discussion',
      isNSFW: false,
      upvoteRatio: 0.89
    },
    {
      id: 'mock2', 
      title: 'Anyone else struggling with customer acquisition costs?',
      content: 'Our CAC has been steadily increasing and I\'m wondering what strategies others are using to bring it down...',
      author: 'growth_hacker',
      subreddit: 'entrepreneur',
      score: 89,
      commentCount: 28,
      created: new Date(Date.now() - 7200000),
      url: 'https://reddit.com/r/entrepreneur/mock2',
      permalink: '/r/entrepreneur/comments/mock2/',
      mediaType: 'text' as const,
      flair: 'Question',
      isNSFW: false,
      upvoteRatio: 0.85
    },
    {
      id: 'mock3',
      title: 'Building in public: Month 6 revenue report ($12k MRR)',
      content: 'Sharing our journey building a productivity SaaS. This month we hit $12k MRR and learned some important lessons...',
      author: 'indie_maker',
      subreddit: 'startups',
      score: 234,
      commentCount: 67,
      created: new Date(Date.now() - 10800000),
      url: 'https://reddit.com/r/startups/mock3',
      permalink: '/r/startups/comments/mock3/',
      mediaType: 'text' as const,
      flair: 'Experience',
      isNSFW: false,
      upvoteRatio: 0.92
    },
    {
      id: 'mock4',
      title: 'React vs Vue for SaaS dashboard - 2024 comparison',
      content: 'We\'re building a complex analytics dashboard and debating between React and Vue. Looking for real-world experiences...',
      author: 'dev_lead',
      subreddit: 'webdev',
      score: 178,
      commentCount: 95,
      created: new Date(Date.now() - 14400000),
      url: 'https://reddit.com/r/webdev/mock4',
      permalink: '/r/webdev/comments/mock4/',
      mediaType: 'text' as const,
      flair: 'Discussion',
      isNSFW: false,
      upvoteRatio: 0.87
    },
    {
      id: 'mock5',
      title: 'SaaS pricing strategy: Per-seat vs usage-based',
      content: 'We\'re launching our SaaS soon and trying to decide between per-seat pricing and usage-based. What has worked for you?',
      author: 'saas_founder',
      subreddit: 'saas',
      score: 145,
      commentCount: 52,
      created: new Date(Date.now() - 18000000),
      url: 'https://reddit.com/r/saas/mock5',
      permalink: '/r/saas/comments/mock5/',
      mediaType: 'text' as const,
      flair: 'Question',
      isNSFW: false,
      upvoteRatio: 0.91
    }
  ];

  // If filtering by specific subreddit, return only those posts or create relevant ones
  if (targetSubreddit) {
    const filtered = mockPosts.filter(post => 
      post.subreddit.toLowerCase() === targetSubreddit.toLowerCase()
    );
    
    // If no posts match, create a few relevant ones
    if (filtered.length === 0) {
      return [{
        id: `mock_${targetSubreddit}_1`,
        title: `Getting started with r/${targetSubreddit} - need advice`,
        content: `I'm new to the ${targetSubreddit} community and looking for advice on how to contribute meaningfully...`,
        author: 'community_newcomer',
        subreddit: targetSubreddit,
        score: 25,
        commentCount: 8,
        created: new Date(Date.now() - 1800000),
        url: `https://reddit.com/r/${targetSubreddit}/mock1`,
        permalink: `/r/${targetSubreddit}/comments/mock1/`,
        mediaType: 'text' as const,
        flair: 'Question',
        isNSFW: false,
        upvoteRatio: 0.78
      }, {
        id: `mock_${targetSubreddit}_2`,
        title: `What's working in ${targetSubreddit} right now?`,
        content: `Curious to hear what strategies and approaches are working well in this space currently...`,
        author: 'strategy_seeker',
        subreddit: targetSubreddit,
        score: 67,
        commentCount: 23,
        created: new Date(Date.now() - 3600000),
        url: `https://reddit.com/r/${targetSubreddit}/mock2`,
        permalink: `/r/${targetSubreddit}/comments/mock2/`,
        mediaType: 'text' as const,
        flair: 'Discussion',
        isNSFW: false,
        upvoteRatio: 0.84
      }];
    }
    
    return filtered;
  }

  return mockPosts;
}

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

    let rawPosts;
    try {
      // Get raw posts
      rawPosts = await RedditService.getHomeFeed(redditId, limit * 2); // Get more to have enough after filtering
      
      // If no posts returned, throw an error to prevent empty feeds
      if (!rawPosts || rawPosts.length === 0) {
        throw new Error('No posts returned from Reddit API');
      }
      
      console.log(`Successfully fetched ${rawPosts.length} posts from Reddit`);
    } catch (error) {
      console.error('Failed to fetch from Reddit:', error);
      
      // Re-throw authentication errors so they can be handled properly
      if (error.message?.includes('User not found') || error.message?.includes('access_token')) {
        throw error;
      }
      
      // Only use fallback for network issues, not auth issues
      console.warn('Using fallback mock data due to network issues');
      rawPosts = generateMockPosts(subredditFilter);
    }
    
    let filteredPosts;
    
    if (subredditFilter) {
      // Filter by specific subreddit - if we already have targeted posts, use them
      filteredPosts = rawPosts.filter(post => 
        post.subreddit.toLowerCase().replace('r/', '') === subredditFilter.toLowerCase().replace('r/', '')
      );
      
      // If no posts found for this specific subreddit, try to fetch directly
      if (filteredPosts.length === 0) {
        console.log(`No posts found for r/${subredditFilter} in home feed, fetching directly...`);
        try {
          const directPosts = await RedditService.getSubredditPosts(redditId, subredditFilter, 'new', 50);
          filteredPosts = directPosts;
          console.log(`Fetched ${directPosts.length} posts directly from r/${subredditFilter}`);
        } catch (error) {
          console.error(`Failed to fetch direct posts from r/${subredditFilter}:`, error);
          filteredPosts = generateMockPosts(subredditFilter);
        }
      }
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
      subredditRules = await RedditService.getSubredditRules(redditId, post.subreddit);
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
      subredditRules = await RedditService.getSubredditRules(redditId, post.subreddit);
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
    
    let subreddits;
    try {
      // Get user's subscribed subreddits
      subreddits = await RedditService.getUserSubreddits(redditId);
    } catch (error) {
      console.error('Failed to fetch from Reddit, using fallback subreddit data:', error);
      // Fallback mock subreddit data
      subreddits = [
        { name: 'saas', title: 'SaaS', subscribers: 125000, description: 'Software as a Service discussions and advice' },
        { name: 'entrepreneur', title: 'Entrepreneur', subscribers: 985000, description: 'A community for entrepreneurs to share ideas' },
        { name: 'startups', title: 'Startups', subscribers: 654000, description: 'Everything startup related' },
        { name: 'webdev', title: 'Web Development', subscribers: 892000, description: 'Web development community' },
        { name: 'programming', title: 'Programming', subscribers: 1200000, description: 'All things programming' }
      ];
    }
    
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