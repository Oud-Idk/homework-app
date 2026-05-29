import { NextFunction, Request, Response } from 'express';
import { getToken } from 'next-auth/jwt';

export interface UserPayload {
    name?: string | null;
    email?: string | null;
    picture?: string | null;
    sub?: string; // This is the user ID
    role?: string; // This is our custom role
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        return res.status(500).json({ message: 'Server configuration error: JWT secret is missing.' });
    }

    const token = await getToken({ req, secret, raw: true });

    if (token) {
        const decoded = await getToken({ req, secret });

        if (decoded && decoded.sub) {
            req.user = {
                sub: decoded.sub,
                role: decoded.role || 'member',
            };
            return next();
        }
    }

    res.status(401).json({ message: 'Unauthorized, token failed or missing' });
};


export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden, admin role required' });
    }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        // This is a server configuration error, so it's okay to fail hard.
        console.error('Server configuration error: AUTH_SECRET is missing.');
        return res.status(500).json({ message: 'Internal Server Error' });
    }

    try {
        const decoded = await getToken({ req, secret });

        if (decoded && decoded.sub) {
            req.user = {
                sub: decoded.sub,
                role: decoded.role || 'member',
            };
        }
    } catch (error) {
        // If getToken throws an unexpected error, log it but don't block the request.
        console.error('Error in optionalAuth middlewares:', error);
    }

    return next();
};