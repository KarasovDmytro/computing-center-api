const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Oh no :(. Redis Client Error', err));
redisClient.on('connect', () => console.log('Successfully connected to Redis! Very good'));

(async () => {
    try {
        await redisClient.connect();
    } catch(e){
        console.error('Failed to connect to Redis:', e);
    }
})();

module.exports = redisClient;