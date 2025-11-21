import { Redis } from 'ioredis';

export const redisClient = new Redis(process.env.REDIS_URL!);
export const redisSubscriber = new Redis(process.env.REDIS_URL!);

redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisSubscriber.on('connect', () => console.log('Redis Subscriber Connected'));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));