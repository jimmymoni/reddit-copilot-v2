// Jest setup file
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

// Mock environment variables for tests
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_chars_long!!';
process.env.REDDIT_CLIENT_ID = 'test_client_id';
process.env.REDDIT_CLIENT_SECRET = 'test_client_secret';