// Hardcoded subreddit data for 2-day sprint
// This gets us working flair selection quickly without complex API parsing

export interface SimpleSubredditData {
  name: string;
  flairRequired: boolean;
  minLength?: number;
  commonFlairs: string[];
  keyRules: string[];
}

export const SUBREDDIT_DATA: Record<string, SimpleSubredditData> = {
  startups: {
    name: 'startups',
    flairRequired: true,
    minLength: 50,
    commonFlairs: ['Idea Validation', 'Feedback Request', 'Discussion', 'Resource', 'Question'],
    keyRules: [
      'Flair required for all posts',
      'No self-promotion without value',
      'Posts must be substantial (50+ characters)'
    ]
  },
  entrepreneur: {
    name: 'entrepreneur',
    flairRequired: true,
    minLength: 30,
    commonFlairs: ['Question', 'Discussion', 'Feedback', 'Case Study', 'Resource'],
    keyRules: [
      'Flair required for all posts',
      'Minimum 30 characters',
      'No pure self-promotion'
    ]
  },
  smallbusiness: {
    name: 'smallbusiness',
    flairRequired: false,
    minLength: 25,
    commonFlairs: ['Question', 'Help', 'Discussion', 'Success', 'Rant'],
    keyRules: [
      'Be respectful and constructive',
      'Minimum 25 characters for quality'
    ]
  },
  technology: {
    name: 'technology',
    flairRequired: false,
    minLength: 0,
    commonFlairs: ['Discussion', 'Article', 'Question'],
    keyRules: [
      'Keep discussions technology-focused',
      'No blogspam or self-promotion'
    ]
  },
  programming: {
    name: 'programming',
    flairRequired: false,
    minLength: 20,
    commonFlairs: ['Discussion', 'Question', 'Article'],
    keyRules: [
      'Programming-related content only',
      'No homework help requests'
    ]
  },
  // Default fallback
  default: {
    name: 'default',
    flairRequired: false,
    minLength: 10,
    commonFlairs: ['Discussion', 'Question', 'Help'],
    keyRules: [
      'Follow subreddit rules',
      'Be respectful and constructive'
    ]
  }
};

export function getSubredditData(subredditName: string): SimpleSubredditData {
  const normalizedName = subredditName.toLowerCase();
  return SUBREDDIT_DATA[normalizedName] || SUBREDDIT_DATA.default;
}