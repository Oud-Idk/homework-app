export interface Homework {
    _id: string;
    title: string;
    description: string;
    dueDate: string;
    userId: string;
    groupId: string;
    completed: boolean;
    isFollowing?: boolean;
}

export interface Group {
    _id: string;
    name: string;
    path: string;
    parent?: string | null;
}

export interface Author {
    _id: string;
    name: string;
    email?: string;
}

export interface Post {
    _id: string;
    title?: string;
    content: string;
    author: Author;
    createdAt: string; // Comes as an ISO string from the API
    homework?: {
        _id: string;
        title: string;
    };
    isDeleted?: boolean;

    upvotes: number;
    downvotes: number;
    score: number;
    userVote?: 'up' | 'down' | null;

    parent?: string | null;
    depth: number;
    replyCount: number;
    replies: Post[];
}

export interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface Activity {
    name: string;
    description: string;
}

export interface Journal {
    _id: string;
    author: Author;
    entryDate: string;
    activities: Activity[];
    createdAt: string;
    updatedAt: string;
    __v?: number;
}

export interface ApiFile {
    _id: string;
    originalName: string;
    mimetype: string;
    size: number;
    createdAt: string;
    filename: string;
    bucket: string;
    url: string;
}