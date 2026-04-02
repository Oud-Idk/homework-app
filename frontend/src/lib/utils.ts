import {Homework, Post} from "@/types";
import { Session } from "next-auth";

export enum Methods {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS",
    CONNECT = "CONNECT",
    TRACE = "TRACE",
}

export function truncateString(str: string, maxLength: number): string {
    if (str.length > maxLength) {
        return str.substring(0, maxLength) + '...';
    }
    return str;
}

export const buildTree = (flatItems: Post[], parentId: string | null): Post[] => {
    const map = new Map<string, Post & { replies: Post[] }>();
    const roots: (Post & { replies: Post[] })[] = [];

    // First pass: create a map of all nodes and initialize their children array
    flatItems.forEach(item => {
        map.set(item._id, { ...item, replies: [] });
    });

    // Second pass: link children to their parents
    flatItems.forEach(item => {
        const node = map.get(item._id)!;
        if (item.parent && map.has(item.parent)) {
            const parentNode = map.get(item.parent)!;
            // Ensure replies are not duplicated if already present
            if (!parentNode.replies.some(r => r._id === node._id)) {
                parentNode.replies.push(node);
            }
        } else if (item.parent === parentId) {
            roots.push(node);
        }
    });
    return roots;
};

export const getPastDue = (homework: Homework): boolean => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDate = new Date(homework.dueDate);
    return dueDate < startOfToday;
}

export function urlBase64ToUint8Array(base64String: string): ArrayBuffer { // <--- 1. Changed return type
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray.buffer; // <--- 2. Return the underlying buffer
}

export async function reqToApi(endpoint: string, session?: Session | null, method: Methods = Methods.GET, body?: string | object): Promise<Response> {
    let bodyReq: string | undefined;
    if (typeof body === "object") {
        bodyReq = JSON.stringify(body);
    } else if (typeof body === "string") {
        bodyReq = body;
    }

    const isServer = typeof window === 'undefined';
    const baseUrl = isServer
        ? process.env.INTERNAL_API_URL + "/api"
        : process.env.NEXT_PUBLIC_API_URL

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

    return await fetch(`${baseUrl}/${cleanEndpoint}`, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.accessToken}`,
        },
        body: bodyReq,
    });
}

export function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}