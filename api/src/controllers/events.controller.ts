import type { Request, Response } from 'express';

interface Client {
    id: number;
    res: Response;
}

let clients: Client[] = [];

/**
 * Handles incoming requests to establish an SSE connection.
 */
export const eventsHandler = (req: Request, res: Response) => {
    // 3. Set standard SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Important to send headers immediately

    const clientId = Date.now();
    const newClient: Client = { id: clientId, res };
    clients.push(newClient);

    const connectEventPayload = { message: "SSE connection established successfully." };
    res.write(`event: connected\ndata: ${JSON.stringify(connectEventPayload)}\n\n`);

    const keepAliveInterval = setInterval(() => {
        res.write(': keep-alive\n\n');
    }, 20000); // 20 seconds

    req.on('close', () => {
        clearInterval(keepAliveInterval);
        clients = clients.filter(c => c.id !== clientId);
        console.log(`Client ${clientId} disconnected from SSE.`);
    });
};

/**
 * Sends a named event to all connected SSE clients.
 * @param eventName - The name of the event (e.g., 'new_post_notification').
 * @param data - The JSON data to send with the event.
 */
export const sendEventToAll = (eventName: string, data: object) => {
    if (clients.length === 0) {
        return; // No clients to send to
    }

    console.log(`Sending SSE event '${eventName}' to ${clients.length} clients.`);

    const sseFormattedData = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => client.res.write(sseFormattedData));
};