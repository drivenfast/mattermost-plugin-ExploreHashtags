import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {fetchHashtags, fetchTeamHashtags} from '../../client';

type Tab = 'channel' | 'team';

interface HashtagGroup {
    prefix: string;
    tags: {tag: string; count: number}[];
}

interface HashtagResponse {
    hashtags: {tag: string; count: number}[];
    groups: HashtagGroup[];
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        overflow: 'hidden' // Prevent double scrollbars
    },
    header: {
        fontSize: '16px',
        fontWeight: 600 as const,
        padding: '24px 24px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        color: 'var(--center-channel-color)',
        flex: '0 0 auto' // Prevent header from shrinking
    },
    tabContainer: {
        display: 'flex',
        padding: '0 24px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        marginBottom: '8px',
        flex: '0 0 auto'
    },
    tab: {
        padding: '12px 16px',
        cursor: 'pointer',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '14px',
        background: 'none',
        border: 'none',
        borderBottom: '2px solid transparent',
        marginRight: '16px'
    },
    activeTab: {
        color: 'var(--button-bg)',
        borderBottom: '2px solid var(--button-bg)',
        fontWeight: 600
    },
    list: {
        listStyle: 'none',
        padding: '24px 24px 24px', // Added top padding
        margin: 0,
        flex: '1 1 auto',
        overflowY: 'auto' as const,
        // Add space after the last item
        '&::after': {
            content: '""',
            display: 'block',
            height: '24px' // Extra padding at bottom of list
        }
    },
    listItem: {
        marginBottom: '12px'
    },
    hashtagButton: {
        width: '100%',
        textAlign: 'left' as const,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--center-channel-bg)',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '4px',
        color: 'var(--link-color)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)'
        }
    },
    tag: {
        fontWeight: 600 as const
    },
    count: {
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        fontSize: '12px'
    },
    accordion: {
        width: '100%',
        border: 'none'
    },
    accordionItem: {
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        marginBottom: '8px'
    },
    accordionButton: {
        width: '100%',
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--center-channel-bg)',
        border: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        borderRadius: '4px',
        color: 'var(--center-channel-color)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
            backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)'
        }
    },
    accordionPanel: {
        padding: '8px 16px'
    },
    groupPrefix: {
        fontSize: '14px',
        fontWeight: 600,
        color: 'var(--center-channel-color)'
    },
    groupTagCount: {
        fontSize: '12px',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)'
    }
};

export default function HashtagList({channelId, onSelect}: {channelId: string; onSelect: (t: string)=>void}) {
    const [activeTab, setActiveTab] = useState<Tab>('channel');
    const [data, setData] = useState<HashtagResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const teamId = useSelector((state: any) => state.entities.teams.currentTeamId);

    const toggleGroup = (prefix: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(prefix)) {
                next.delete(prefix);
            } else {
                next.add(prefix);
            }
            return next;
        });
    };

    useEffect(() => {
        setLoading(true);
        setError(null);

        const fetchData = activeTab === 'channel' 
            ? fetchHashtags(channelId)
            : fetchTeamHashtags(teamId);

        fetchData
            .then(response => {
                setData(response);
                setLoading(false);
            })
            .catch(e => {
                setError(e.message);
                setLoading(false);
            });
    }, [channelId, teamId, activeTab]);

    if (error) {
        return (
            <div className="sidebar--right__content" style={styles.container}>
                <div style={styles.header}>Error: {error}</div>
            </div>
        );
    }

    if (!data || loading) {
        return (
            <div className="sidebar--right__content" style={styles.container}>
                <div style={styles.header}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="sidebar--right__content" style={styles.container}>
            <div style={styles.header}>
                Explore Hashtags
            </div>
            <div style={styles.tabContainer}>
                <button
                    onClick={() => setActiveTab('channel')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'channel' ? styles.activeTab : {})
                    }}
                >
                    This Channel
                </button>
                <button
                    onClick={() => setActiveTab('team')}
                    style={{
                        ...styles.tab,
                        ...(activeTab === 'team' ? styles.activeTab : {})
                    }}
                >
                    Entire Team
                </button>
            </div>
            <div style={styles.list}>
                {data.groups.map((group) => (
                    <div key={group.prefix} style={styles.accordionItem}>
                        <button
                            onClick={() => toggleGroup(group.prefix)}
                            style={styles.accordionButton}
                        >
                            <span style={styles.groupPrefix}>{group.prefix}</span>
                            <span style={styles.groupTagCount}>
                                {group.tags.length} {group.tags.length === 1 ? 'tag' : 'tags'}
                            </span>
                        </button>
                        {expandedGroups.has(group.prefix) && (
                            <div style={styles.accordionPanel}>
                                {group.tags.map(({tag, count}) => (
                                    <div key={tag} style={styles.listItem}>
                                        <button
                                            onClick={() => onSelect(tag)}
                                            style={styles.hashtagButton}
                                        >
                                            <span style={styles.tag}>#{tag}</span>
                                            <span style={styles.count}>
                                                {count} {count === 1 ? 'post' : 'posts'}
                                            </span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {/* Show ungrouped tags (those without prefixes) */}
                {data.hashtags
                    .filter(tag => !data.groups.some(g => g.tags.some(t => t.tag === tag.tag)))
                    .map(({tag, count}) => (
                        <div key={tag} style={styles.listItem}>
                            <button
                                onClick={() => onSelect(tag)}
                                style={styles.hashtagButton}
                            >
                                <span style={styles.tag}>#{tag}</span>
                                <span style={styles.count}>
                                    {count} {count === 1 ? 'post' : 'posts'}
                                </span>
                            </button>
                        </div>
                    ))}
            </div>
        </div>
    );
}