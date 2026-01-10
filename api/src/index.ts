import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './db.js';
import { redisSubscriber } from './services/redis.service.js';
import { connectRabbitMQ } from './services/rabbitmq.service.js';
import { eventsHandler, sendEventToAll } from './controllers/events.controller.js';
import mainRouter from './routes/index.js';
import { initializeMeili } from "./services/meilisearch.service.js";
import { startCleanupJob } from "./cronJobs.js";

const app = express();
const PORT = process.env.PORT || 4000;

void connectDB();
void connectRabbitMQ();
void initializeMeili();
startCleanupJob();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Pong!'));
app.get('/api/events', eventsHandler);
app.use('/api', mainRouter);

redisSubscriber.subscribe('homework-updates', (err: unknown) => {
  if (err) console.error('Failed to subscribe to Redis channel', err);
  else console.log(`Subscribed to 'homework-updates' channel.`);
});

redisSubscriber.subscribe('post-events', (err: unknown) => {
    if (err) console.error('Failed to subscribe to Redis channel', err);
    else console.log(`Subscribed to 'post-events' channel.`);
});

redisSubscriber.subscribe('journal-events', (err: unknown) => {
    if (err) console.error('Failed to subscribe to Redis channel', err);
    else console.log(`Subscribed to 'journal-events' channel.`);
});

redisSubscriber.on('message', (channel, message) => {
    switch (channel) {
        case 'homework-updates': {
            console.log(`Received message from Redis on channel '${channel}'`);
            const { action, payload } = JSON.parse(message);
            const eventName = `homework_${action}`;
            sendEventToAll(eventName, payload);
            break;
        }

        case 'post-events': {
            console.log(`Received message from Redis on channel '${channel}'`);
            const { action, payload } = JSON.parse(message);
            const eventName = `post_${action}`;
            sendEventToAll(eventName, payload);
            break;
        }

        case 'journal-events': {
            console.log(`Received message from Redis on channel '${channel}'`);
            const { action, payload } = JSON.parse(message);
            const eventName = `journal_${action}`; // e.g., 'journal_create'
            sendEventToAll(eventName, payload);
            break;
        }

        default:
            console.warn(`Received message on unhandled Redis channel: ${channel}`);
            break;
    }
});

const HOST = '0.0.0.0';

const server = app.listen(Number(PORT), HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
        throw error;
    }

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(`Port ${PORT} requires elevated privileges.`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`Port ${PORT} is already in use.`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});