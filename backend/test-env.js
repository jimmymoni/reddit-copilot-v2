require('dotenv').config();
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('Key starts with:', process.env.OPENAI_API_KEY?.substring(0, 10));