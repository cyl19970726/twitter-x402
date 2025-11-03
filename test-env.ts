// Test script to verify environment variables
console.log('\n=== ALL ENVIRONMENT VARIABLES ===');
console.log(JSON.stringify(process.env, null, 2));
console.log('\n=== SPECIFIC VARIABLES ===');
console.log('PORT:', process.env.PORT);
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY?.substring(0, 20) + '...');
console.log('TWITTER_COOKIES:', process.env.TWITTER_COOKIES?.substring(0, 50) + '...');
console.log('TWITTER_USERNAME:', process.env.TWITTER_USERNAME);
console.log('TWITTER_PASSWORD:', process.env.TWITTER_PASSWORD ? '***' : 'missing');
console.log('TWITTER_EMAIL:', process.env.TWITTER_EMAIL);
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY?.substring(0, 20) + '...');
console.log('NETWORK:', process.env.NETWORK);
console.log('FACILITATOR_URL:', process.env.FACILITATOR_URL);
console.log('\n=== VARIABLES COUNT ===');
console.log('Total env vars:', Object.keys(process.env).length);
