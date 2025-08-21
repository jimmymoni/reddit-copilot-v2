import request from 'supertest';
import express from 'express';
import userRoutes from '../src/routes/user';
import { RedditService } from '../src/services/reddit';

// Mock the RedditService
jest.mock('../src/services/reddit');
const mockRedditService = RedditService as jest.Mocked<typeof RedditService>;

// Mock the auth middleware
jest.mock('../src/middleware/auth', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    if (req.headers['x-reddit-id']) {
      req.user = { redditId: req.headers['x-reddit-id'], username: 'testuser' };
      next();
    } else {
      res.status(401).json({ error: 'Reddit ID required in x-reddit-id header' });
    }
  }
}));

const app = express();
app.use(express.json());
app.use('/api', userRoutes);

describe('GET /api/subreddits', () => {
  const mockSubreddits = [
    {
      name: 'javascript',
      title: 'JavaScript',
      subscribers: 2500000,
      public_description: 'All about JavaScript',
      url: '/r/javascript',
      active_user_count: 5000
    },
    {
      name: 'node',
      title: 'Node.js',
      subscribers: 180000,
      public_description: 'Node.js community',
      url: '/r/node',
      active_user_count: 1200
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user subreddits when authenticated', async () => {
    mockRedditService.getUserSubreddits.mockResolvedValueOnce(mockSubreddits);

    const response = await request(app)
      .get('/api/subreddits')
      .set('x-reddit-id', 'test_user_123')
      .expect(200);

    expect(response.body).toEqual(mockSubreddits);
    expect(mockRedditService.getUserSubreddits).toHaveBeenCalledWith('test_user_123');
  });

  it('should return 401 when not authenticated (missing header)', async () => {
    const response = await request(app)
      .get('/api/subreddits')
      .expect(401);

    expect(response.body).toEqual({ 
      error: 'Reddit ID required in x-reddit-id header' 
    });
    expect(mockRedditService.getUserSubreddits).not.toHaveBeenCalled();
  });

  it('should return 500 when RedditService throws an error', async () => {
    const errorMessage = 'Reddit API error';
    mockRedditService.getUserSubreddits.mockRejectedValueOnce(new Error(errorMessage));

    const response = await request(app)
      .get('/api/subreddits')
      .set('x-reddit-id', 'test_user_123')
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to fetch user subreddits',
      details: errorMessage
    });
    expect(mockRedditService.getUserSubreddits).toHaveBeenCalledWith('test_user_123');
  });

  it('should return empty array when user has no subscriptions', async () => {
    mockRedditService.getUserSubreddits.mockResolvedValueOnce([]);

    const response = await request(app)
      .get('/api/subreddits')
      .set('x-reddit-id', 'test_user_123')
      .expect(200);

    expect(response.body).toEqual([]);
    expect(mockRedditService.getUserSubreddits).toHaveBeenCalledWith('test_user_123');
  });

  it('should handle user not found error', async () => {
    mockRedditService.getUserSubreddits.mockRejectedValueOnce(new Error('User not found'));

    const response = await request(app)
      .get('/api/subreddits')
      .set('x-reddit-id', 'invalid_user')
      .expect(500);

    expect(response.body).toEqual({
      error: 'Failed to fetch user subreddits',
      details: 'User not found'
    });
  });
});