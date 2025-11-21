import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL!);
        channel = await connection.createChannel();
        await channel.assertQueue('notification_queue', { durable: true });
        console.log('RabbitMQ Connected and Queue Asserted');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ', error);
    }
};

export const publishToQueue = (queueName: string, data: object) => {
    if (channel) {
        channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
            persistent: true,
        });
        console.log(`Sent ${JSON.stringify(data)} to queue ${queueName}`);
    }
};

export const publishToExchange = (exchangeName: string, routingKey: string, data: object) => {
    if (channel) {
        channel.publish(exchangeName, routingKey, Buffer.from(JSON.stringify(data)), {
            persistent: true,
        });
        console.log(`Sent ${JSON.stringify(data)} to exchange ${exchangeName} with routing key ${routingKey}`);
    }
}