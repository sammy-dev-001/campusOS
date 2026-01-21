/**
 * Post Types
 * Shared type definitions for post-related components
 */

export interface Post {
    id: number;
    userId: number;
    username: string;
    content: string;
    timestamp: string;
    media_url?: string;
    likes_count: number;
    comments_count: number;
    is_liked: boolean;
    author: {
        username: string;
        display_name: string;
        profile_picture: string;
    };
    createdAt?: string;
    publishedAt?: string;
}

export interface Comment {
    id: number;
    post_id: number;
    user_id: number;
    username: string;
    content: string;
    timestamp: string;
    display_name: string;
    profile_picture: string;
    is_liked: boolean;
    likes_count: number;
    parent_comment_id?: number | null;
    replies?: Comment[];
    createdAt?: string;
    publishedAt?: string;
}

export interface VideoProgress {
    position: number;
    duration: number;
}
