export interface HashtagGroup {
    prefix: string;
    tags: Array<{tag: string; count: number}>;
}

export interface HashtagResponse {
    hashtags: Array<{tag: string; count: number}>;
    groups: HashtagGroup[];
}

export interface HashtagPost {
    id: string;
    message: string;
    create_at: number;
    username: string;
    channel_id: string;
}

export async function fetchHashtags(channelId: string) {
    const resp = await fetch(`/plugins/com.ecf.hashtags/api/hashtags?channel_id=${channelId}`, {
        method: 'GET',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        credentials: 'same-origin',
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json() as Promise<HashtagResponse>;
}

export async function fetchHashtagPosts(tag: string, channelId?: string) {
    const url = new URL('/plugins/com.ecf.hashtags/api/posts', window.location.origin);
    url.searchParams.set('tag', tag);
    if (channelId) {
        url.searchParams.set('channel_id', channelId);
    }
    const resp = await fetch(url.toString(), {
        method: 'GET',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        credentials: 'same-origin',
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json() as Promise<HashtagPost[]>;
}

export async function fetchTeamHashtags(teamId: string) {
    const resp = await fetch(`/plugins/com.ecf.hashtags/api/team_hashtags?team_id=${teamId}`, {
        method: 'GET',
        headers: {'X-Requested-With': 'XMLHttpRequest'},
        credentials: 'same-origin',
    });
    if (!resp.ok) throw new Error(await resp.text());
    return resp.json() as Promise<HashtagResponse>;
}
