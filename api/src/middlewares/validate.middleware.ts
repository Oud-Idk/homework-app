import { Request, Response, NextFunction, RequestHandler } from 'express';
import { z, ZodSchema } from 'zod';

interface ValidationConfig {
    params?: ZodSchema;
    query?: ZodSchema;
    body?: ZodSchema;
}

export const validate = (schemas: ValidationConfig): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        const targets = ['params', 'query', 'body'] as const;

        for (const target of targets) {
            const schema = schemas[target];
            if (schema) {
                const validation = schema.safeParse(req[target]);

                if (!validation.success) {
                    res.status(400).json({
                        message: `Validation failed in ${target}`,
                        errors: z.treeifyError(validation.error),
                    });
                    return;
                }

                Object.assign(req[target], validation.data);
            }
        }
        next();
    };
};