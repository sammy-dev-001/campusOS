/**
 * Post Utilities
 * Shared utility functions for post-related components
 */

export const AVATAR_COLORS = ['#4D96FF', '#8A2BE2', '#FF6B6B', '#FFD93D', '#6BCB77', '#FFB86B'];

/**
 * Get initials from a name for avatar display
 */
export function getInitials(name?: string): string {
    if (!name) return '??';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

/**
 * Get a consistent color for an avatar based on the name
 */
export function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Extract hashtags from post content
 */
export function extractHashtags(text: string): string[] {
    const regex = /#(\w+)/g;
    const tags: string[] = [];
    let match;
    while ((match = regex.exec(text))) {
        tags.push(match[1]);
    }
    return tags;
}

/**
 * Add cache-busting to profile picture URLs
 */
export function getProfilePicUrl(url: string): string {
    if (!url) return '';
    const bust = Date.now();
    return url.includes('?') ? `${url}&bust=${bust}` : `${url}?bust=${bust}`;
}

/**
 * Check if a profile picture URL is valid
 */
export function isValidProfilePic(url: string | undefined | null): boolean {
    return !!url && typeof url === 'string' && url.trim() !== '' && url.trim().toLowerCase() !== 'null';
}

/**
 * Format milliseconds as m:ss for video duration
 */
export function formatMillis(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp as a short relative time string (e.g., "2h", "3d", "1w")
 */
export function formatTimestamp(timestamp: string): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) {
        return 'now';
    } else if (diffInSeconds < 60) {
        return 'now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h`;
    } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d`;
    } else if (diffInSeconds < 2592000) { // Less than 30 days
        const weeks = Math.floor(diffInSeconds / 604800);
        return `${weeks}w`;
    } else {
        // For older posts, show date
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
}
