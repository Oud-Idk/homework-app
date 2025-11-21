import amqp from 'amqplib';
import * as rabbitmqConfig from '../config/rabbitmq.js';

let channel: amqp.Channel;

const MAX_RETRIES = 10;
const INITIAL_RETRY_DELAY = 2000;

export const connectToRabbitMQ = async () => {
    if (!process.env.RABBITMQ_URL) {
        throw new Error("RABBITMQ_URL is not defined");
    }

    let retries = 0;
    while (retries < MAX_RETRIES) {
        try {
            const connection = await amqp.connect(process.env.RABBITMQ_URL);

            connection.on('error', (err) => {
                console.error('RabbitMQ connection error:', err.message);
            });

            connection.on('close', () => {
                console.log('RabbitMQ connection closed. Attempting to reconnect...');
            });

            channel = await connection.createChannel();
            console.log('Connected to RabbitMQ');
            return channel; // Success
        } catch (err: unknown) { // Explicitly type err as unknown
            retries++;
            const delay = INITIAL_RETRY_DELAY * Math.pow(1.5, retries - 1);

            let errorMessage = 'An unknown error occurred';
            if (err instanceof Error) {
                errorMessage = err.message;
            }

            console.error(`Failed to connect to RabbitMQ (attempt ${retries}/${MAX_RETRIES}):`, errorMessage);

            if (retries >= MAX_RETRIES) {
                console.error('Max retries reached. Could not connect to RabbitMQ.');
                throw new Error('Could not connect to RabbitMQ after multiple retries.');
            }

            console.log(`Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Exited connection loop unexpectedly.');
};

export const setupTopology = async (channel: amqp.Channel) => {
    await channel.assertExchange(rabbitmqConfig.NOTIFICATION_EXCHANGE, 'x-delayed-message', {
        durable: true,
        arguments: { 'x-delayed-type': 'direct' },
    });
    await channel.assertExchange(rabbitmqConfig.EVENTS_EXCHANGE, "topic", { durable: true });

    // Assert all queues
    for (const queue of Object.values(rabbitmqConfig.QUEUES)) {
        if (typeof queue === "string") {
            await channel.assertQueue(queue, { durable: true });
        }
    }

    // Set up all bindings
    await channel.bindQueue(rabbitmqConfig.QUEUES.HOMEWORK_DUE_NOTIFICATION, rabbitmqConfig.NOTIFICATION_EXCHANGE, rabbitmqConfig.ROUTING_KEYS.NOTIFICATION_SEND);
    await channel.bindQueue(rabbitmqConfig.QUEUES.POST_FANOUT, rabbitmqConfig.EVENTS_EXCHANGE, rabbitmqConfig.ROUTING_KEYS.POST_CREATED);

    console.log('RabbitMQ topology asserted.');
};