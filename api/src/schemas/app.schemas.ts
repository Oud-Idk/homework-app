import { z } from 'zod';

// Reusable parts
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
export const idParamSchema = z.object({ id: objectIdSchema });
export const postIdParamSchema = z.object({ postId: objectIdSchema });
export const groupIdParamSchema = z.object({ groupId: objectIdSchema });

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    q: z.string().optional(),
    depth: z.coerce.number().int().min(1).max(10).default(3)
});

export const journalSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    date: z.iso.datetime({ message: "Invalid ISO date format" }).optional(),
    before: z.iso.datetime({ message: "Invalid ISO date format" }).optional(),
    after: z.iso.datetime({ message: "Invalid ISO date format" }).optional(),
});

// Posts
export const createPostSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.string().min(1, "Post content cannot be empty"),
    homeworkId: objectIdSchema.optional(),
});

export const updatePostSchema = createPostSchema.partial();

// Homework
export const createHomeworkSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    dueDate: z.iso.datetime({ message: "Invalid ISO date format" }),
    groupId: objectIdSchema,
});

// Groups
export const createGroupSchema = z.object({
    name: z.string().min(1).max(100),
    parentId: objectIdSchema.optional().nullable(),
});

// Journals
export const journalUpsertSchema = z.object({
    date: z.coerce.date(),
    activities: z.array(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
    })).min(1),
});

// Votes
export const voteSchema = z.object({
    voteType: z.enum(['up', 'down', 'none']),
});

// Preferences

export const updateJournalSchema = z.object({
    date: z.coerce.date().optional(),
    activities: z.array(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
    })).min(1).optional(),
});

// Reuses the create schema but makes everything optional
export const updateHomeworkSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    dueDate: z.iso.datetime().optional(),
    groupId: objectIdSchema.optional(),
});

export const genderSchema = z.object({
    gender: z.enum(['male', 'female'], {
        error: "Gender must be male, female, or empty.",
    }).optional(),
})

// Group updates specifically require a new name (based on your controller logic)
export const updateGroupSchema = z.object({
    name: z.string().min(1, "New group name is required").max(100)
});


export const createReplySchema = z.object({
    content: z.string().min(1, "Reply content cannot be empty"),
});

export const homeworkIdParamSchema = z.object({
    homeworkId: objectIdSchema,
});

export const updateViewPreferencesSchema = z.object({
    hidePastDueDays: z.number().int().min(0).max(365)
});

export const addNotificationPrefSchema = z.object({
    daysBefore: z.number().int().min(0).max(30),
    timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)")
});

export const preferenceIdParamSchema = z.object({
    preferenceId: objectIdSchema
});

export const pushSubscriptionSchema = z.object({
    endpoint: z.url("Invalid subscription endpoint"),
    expirationTime: z.number().nullable().optional(),
    keys: z.object({
        p256dh: z.string().min(1, "p256dh key is required"),
        auth: z.string().min(1, "auth key is required")
    })
});

export const updateUserRoleSchema = z.object({
    role: z.enum(['admin', 'member'], {
        error: () => ({ message: "Role must be either 'admin' or 'member'" })
    })
});

export const userIdParamSchema = z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID format")
});

export const classParamsSchema = z.object({
    name: z.string().min(1).max(100),
})


export const updateClassSchema = z.object({
    id: objectIdSchema,
    name: z.string().min(1).max(100).optional(),
})

export const deleteClassSchema = z.object({
    id: objectIdSchema,
});

export const createRelationshipSchema = z.object({
    classroomId: z.string().min(1, "Classroom ID is required"),
    relationships: z.array(
        z.object({
            targetId: z.string(),
            value: z.number().int(),
        })
    ),
});

export const updateRelationshipSchema = z.object({
    id: objectIdSchema,
    fromStudent: objectIdSchema.optional(),
    toStudent: objectIdSchema.optional(),
    classroom: objectIdSchema.optional(),
    weight: z.number().optional(),
});

export const deleteRelationshipSchema = z.object({
    id: objectIdSchema,
});

export const classIdParamsSchema = z.object({
    classroomId: objectIdSchema,
});
