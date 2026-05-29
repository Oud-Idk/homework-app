import { UserPayload } from '../middlewares/auth.middleware.js'; // Or wherever it lives

declare global {
    namespace Express {
        // This part stays the same
        export interface Request {
            user?: UserPayload;
        }
    }
}

// THIS IS THE MAGIC LINE
export {};