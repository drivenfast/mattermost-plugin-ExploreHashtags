import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import {fetchHashtags, fetchTeamHashtags} from '../../client';

// Add CSS styles for hover effects
const style = document.createElement('style');
style.textContent = `
  .hashtag-button:hover {
    background-color: rgba(var(--center-channel-color-rgb), 0.04) !important;
    border-color: rgba(var(--center-channel-color-rgb), 0.04) !important;
    transform: translateY(-1px) !important;
  }
  .accordion-button:hover {
    background-color: rgba(var(--center-channel-color-rgb), 0.04) !important;
    border-color: rgba(var(--center-channel-color-rgb), 0.04) !important;
    transform: translateY(-1px) !important;
  }
`;
document.head.appendChild(style);

type Tab = 'channel' | 'team';

interface HashtagData {
    tag: string;
    count: number;
    lastUsed?: number;
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
        transition: 'all 0.2s ease'
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
        transition: 'all 0.2s ease'
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
    const [showGrouped, setShowGrouped] = useState(false);
    const [hasUserPreferences, setHasUserPreferences] = useState(false);
    const [rememberSettings, setRememberSettings] = useState(false);
    const [sortConfig, setSortConfig] = useState<{sortBy: 'time' | 'count' | 'name'; sortOrder: 'asc' | 'desc'}>({
        sortBy: 'time',
        sortOrder: 'desc'
    });
    const teamId = useSelector((state: any) => state.entities.teams.currentTeamId);

    // Default settings
    const DEFAULT_SETTINGS = {
        showGrouped: false,
        sortBy: 'time' as const,
        sortOrder: 'desc' as const
    };

    // Helper functions for localStorage
    const getStoredPreferences = () => {
        try {
            const stored = localStorage.getItem('hashtag-list-preferences');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    };

    const savePreferences = (preferences: any) => {
        try {
            localStorage.setItem('hashtag-list-preferences', JSON.stringify(preferences));
        } catch {
            // Handle storage errors silently
        }
    };

    const checkForUserPreferences = () => {
        const isDifferent = showGrouped !== DEFAULT_SETTINGS.showGrouped ||
                           sortConfig.sortBy !== DEFAULT_SETTINGS.sortBy ||
                           sortConfig.sortOrder !== DEFAULT_SETTINGS.sortOrder;
        setHasUserPreferences(isDifferent);
    };

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
        
        // Auto-expand all groups when sorting in grouped mode (Approach 4)
        if (showGrouped && data) {
            setExpandedGroups(new Set(data.groups.map(g => g.prefix)));
        }
    };

    const sortHashtags = (tags: {tag: string; count: number; lastUsed?: number}[]) => {
        if (!tags || tags.length === 0) return [];
        
        return [...tags].sort((a, b) => {
            switch (sortConfig.sortBy) {
                case 'time':
                    const aTime = a.lastUsed || 0;
                    const bTime = b.lastUsed || 0;
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

    // Sort groups by the same criteria as hashtags (Approach 1)
    const sortGroups = (groups: HashtagGroup[]) => {
        return [...groups].sort((a, b) => {
            const getGroupMetric = (group: HashtagGroup) => {
                switch (sortConfig.sortBy) {
                    case 'time':
                        // Most recent hashtag in the group
                        return Math.max(...group.tags.map(tag => tag.lastUsed || 0));
                    case 'count':
                        // Total count of all hashtags in group
                        return group.tags.reduce((sum, tag) => sum + tag.count, 0);
                    case 'name':
                        // Sort by group prefix
                        return group.prefix;
                    default:
                        return group.prefix;
                }
            };

            const aMetric = getGroupMetric(a);
            const bMetric = getGroupMetric(b);
            
            if (sortConfig.sortBy === 'name') {
                return sortConfig.sortOrder === 'desc'
                    ? (bMetric as string).localeCompare(aMetric as string)
                    : (aMetric as string).localeCompare(bMetric as string);
            }
            
            return sortConfig.sortOrder === 'desc' 
                ? (bMetric as number) - (aMetric as number)
                : (aMetric as number) - (bMetric as number);
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

    // Load preferences on component mount
    useEffect(() => {
        const stored = getStoredPreferences();
        if (stored && stored.remember) {
            setShowGrouped(stored.showGrouped ?? DEFAULT_SETTINGS.showGrouped);
            setSortConfig({
                sortBy: stored.sortBy ?? DEFAULT_SETTINGS.sortBy,
                sortOrder: stored.sortOrder ?? DEFAULT_SETTINGS.sortOrder
            });
            setRememberSettings(true);
            setHasUserPreferences(true);
        }
    }, []);

    // Check for changes when settings change
    useEffect(() => {
        checkForUserPreferences();
    }, [showGrouped, sortConfig]);

    // Save preferences when checkbox is checked
    useEffect(() => {
        if (rememberSettings) {
            savePreferences({
                showGrouped,
                sortBy: sortConfig.sortBy,
                sortOrder: sortConfig.sortOrder,
                remember: true
            });
        } else {
            localStorage.removeItem('hashtag-list-preferences');
        }
    }, [rememberSettings, showGrouped, sortConfig]);

    if (error) {
        return (
            <div className="sidebar--right__content" style={styles.container}>
                <div style={{padding: '24px'}}>Error: {error}</div>
            </div>
        );
    }

    if (!data || loading) {
        return (
            <div className="sidebar--right__content" style={styles.container}>
                <div style={{padding: '24px'}}>Loading...</div>
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
                    onClick={() => setShowGrouped(!showGrouped)}
                    style={{
                        ...styles.sortButton,
                        ...(showGrouped ? styles.sortButtonActive : {}),
                        marginRight: '12px',
                        borderRight: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
                        paddingRight: '12px'
                    }}
                >
                    {showGrouped ? 'Grouped' : 'List View'}
                </button>
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
            {hasUserPreferences && (
                <div style={{
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
                    marginBottom: '8px',
                    backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.02)'
                }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: 'rgba(var(--center-channel-color-rgb), 0.72)',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            checked={rememberSettings}
                            onChange={(e) => setRememberSettings(e.target.checked)}
                            style={{
                                marginRight: '6px',
                                accentColor: 'var(--button-bg)'
                            }}
                        />
                        Remember these settings
                    </label>
                </div>
            )}
            <div style={styles.list}>
                {showGrouped ? (
                    <>
                        {/* Grouped view */}
                        {sortGroups(data.groups).map((group) => {
                            const sortedGroupTags = sortHashtags(group.tags);
                            return (
                                <div key={group.prefix} style={styles.accordionItem}>
                                <button
                                    onClick={() => toggleGroup(group.prefix)}
                                    style={styles.accordionButton}
                                    className="accordion-button"
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
                                                    className="hashtag-button"
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
                                        className="hashtag-button"
                                    >
                                        <span style={styles.tag}>#{tag}</span>
                                        <span style={styles.count}>
                                            {count} {count === 1 ? 'post' : 'posts'}
                                        </span>
                                    </button>
                                </div>
                            ))}
                    </>
                ) : (
                    <>
                        {/* Flat list view */}
                        {sortHashtags([
                            ...data.groups.flatMap(group => group.tags),
                            ...data.hashtags.filter(tag => !data.groups.some(g => g.tags.some(t => t.tag === tag.tag)))
                        ]).map(({tag, count}) => (
                            <div key={tag} style={styles.listItem}>
                                <button
                                    onClick={() => onSelect(tag, activeTab === 'channel' ? channelId : undefined)}
                                    style={styles.hashtagButton}
                                    className="hashtag-button"
                                >
                                    <span style={styles.tag}>#{tag}</span>
                                    <span style={styles.count}>
                                        {count} {count === 1 ? 'post' : 'posts'}
                                    </span>
                                </button>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}