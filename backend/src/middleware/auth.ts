import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user?: {
    redditId: string;
    username: string;
  };
}

export const authenticateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const redditId = req.headers['x-reddit-id'] as string;
    
    if (!redditId) {
      return res.status(401).json({ error: 'Reddit ID required in x-reddit-id header' });
    }

    const user = await prisma.user.findUnique({ 
      where: { redditId },
      select: { redditId: true, username: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};