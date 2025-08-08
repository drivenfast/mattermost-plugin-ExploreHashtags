import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {fetchHashtags, fetchTeamHashtags} from '../../client';

type Tab = 'channel' | 'team';

interface HashtagData {
    tag: string;
    count: number;
    last_used?: number;
}

interface HashtagGroup {
    prefix: string;
    tags: HashtagData[];
}

interface HashtagResponse {
    hashtags: HashtagData[];
    groups: HashtagGroup[];
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        overflow: 'hidden' // Prevent double scrollbars
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
    sortHeader: {
        display: 'flex',
        padding: '8px 16px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        marginBottom: '8px'
    },
    sortButton: {
        background: 'none',
        border: 'none',
        padding: '4px 8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '13px',
        color: 'var(--center-channel-color)',
        display: 'flex',
        alignItems: 'center',
        opacity: 0.5,
        transition: 'all 0.15s ease',
        '&:hover': {
            backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.04)',
            opacity: 0.8
        }
    },
    sortButtonActive: {
        opacity: 1,
    },
    sortIndicator: {
        marginLeft: '4px',
        fontSize: '11px'
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

export default function HashtagList({channelId, onSelect}: {channelId: string; onSelect: (t: string, channelId?: string)=>void}) {
    const [activeTab, setActiveTab] = useState<Tab>('channel');
    const [data, setData] = useState<HashtagResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [sortConfig, setSortConfig] = useState<{sortBy: 'time' | 'count' | 'name'; sortOrder: 'asc' | 'desc'}>({
        sortBy: 'time',
        sortOrder: 'desc'
    });
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

    const handleSort = (newSortBy: 'time' | 'count' | 'name') => {
        setSortConfig(prevConfig => ({
            sortBy: newSortBy,
            sortOrder: prevConfig.sortBy === newSortBy
                ? (prevConfig.sortOrder === 'desc' ? 'asc' : 'desc')
                : 'desc'
        }));
    };

    const sortHashtags = (tags: {tag: string; count: number; last_used?: number}[]) => {
        if (!tags || tags.length === 0) return [];
        
        return [...tags].sort((a, b) => {
            switch (sortConfig.sortBy) {
                case 'time':
                    const aTime = a.last_used || 0;
                    const bTime = b.last_used || 0;
                    return sortConfig.sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
                case 'count':
                    return sortConfig.sortOrder === 'desc' ? b.count - a.count : a.count - b.count;
                case 'name':
                default:
                    return sortConfig.sortOrder === 'desc'
                        ? b.tag.localeCompare(a.tag)
                        : a.tag.localeCompare(b.tag);
            }
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
                <div style={{padding: '16px'}}>Error: {error}</div>
            </div>
        );
    }

    if (!data || loading) {
        return (
            <div className="sidebar--right__content" style={styles.container}>
                <div style={{padding: '16px'}}>Loading...</div>
            </div>
        );
    }

    return (
        <div className="sidebar--right__content" style={styles.container}>
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
            <div style={styles.sortHeader}>
                <button
                    onClick={() => handleSort('time')}
                    style={{
                        ...styles.sortButton,
                        ...(sortConfig.sortBy === 'time' ? styles.sortButtonActive : {})
                    }}
                >
                    Recent Activity
                    {sortConfig.sortBy === 'time' && (
                        <span style={styles.sortIndicator}>
                            {sortConfig.sortOrder === 'desc' ? '▼' : '▲'}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => handleSort('count')}
                    style={{
                        ...styles.sortButton,
                        ...(sortConfig.sortBy === 'count' ? styles.sortButtonActive : {})
                    }}
                >
                    Post Count
                    {sortConfig.sortBy === 'count' && (
                        <span style={styles.sortIndicator}>
                            {sortConfig.sortOrder === 'desc' ? '▼' : '▲'}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => handleSort('name')}
                    style={{
                        ...styles.sortButton,
                        ...(sortConfig.sortBy === 'name' ? styles.sortButtonActive : {})
                    }}
                >
                    A-Z
                    {sortConfig.sortBy === 'name' && (
                        <span style={styles.sortIndicator}>
                            {sortConfig.sortOrder === 'desc' ? '▼' : '▲'}
                        </span>
                    )}
                </button>
            </div>
            <div style={styles.list}>
                {data.groups.map((group) => {
                    const sortedGroupTags = sortHashtags(group.tags);
                    return (
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
                                {sortedGroupTags.map(({tag, count}) => (
                                    <div key={tag} style={styles.listItem}>
                                        <button
                                            onClick={() => {
                                                console.log('HashtagList: Selecting tag', tag, 'activeTab:', activeTab, 'channelId:', channelId);
                                                onSelect(tag, activeTab === 'channel' ? channelId : undefined);
                                            }}
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
                    );
                })}
                {/* Show ungrouped tags (those without prefixes) */}
                {sortHashtags(
                    data.hashtags.filter(tag => !data.groups.some(g => g.tags.some(t => t.tag === tag.tag)))
                ).map(({tag, count}) => (
                        <div key={tag} style={styles.listItem}>
                            <button
                                onClick={() => onSelect(tag, activeTab === 'channel' ? channelId : undefined)}
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