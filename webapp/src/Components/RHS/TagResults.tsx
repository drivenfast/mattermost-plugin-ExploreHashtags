import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchHashtagPosts, HashtagPost } from '../../client';

// Add CSS styles for hover effects
const style = document.createElement('style');
style.textContent = `
  .search-item__container:hover {
    background: rgba(var(--center-channel-color-rgb), 0.04) !important;
  }
  .view-post-button:hover {
    background: rgba(var(--button-bg-rgb), 0.12) !important;
  }
`;
document.head.appendChild(style);

// Function to safely get the SearchResult component from various possible locations
const getSearchResult = () => {
    const paths = [
        () => (window as any).Components?.SearchResult,
        () => (window as any).Components?.SearchResults?.SearchResult,
        () => (window as any).Components?.SearchResults?.default?.SearchResult,
        () => (window as any).ReactComponents?.SearchResult,
        () => (window as any).WebappComponents?.SearchResult
    ];

    for (const getPath of paths) {
        try {
            const component = getPath();
            if (component) {
                return component;
            }
        } catch {
            // Ignore errors and try next path
        }
    }
    return null;
};

// Import SearchResult component from Mattermost webapp
const getSearchResult = () => {
    // First try to get it from modern webapp structure
    if ((window as any).Components?.SearchResults?.default?.SearchResult) {
        return (window as any).Components.SearchResults.default.SearchResult;
    }
    
    // Try legacy structure
    if ((window as any).Components?.SearchResults?.SearchResult) {
        return (window as any).Components.SearchResults.SearchResult;
    }
    
    // Try global scope
    if ((window as any).SearchResult) {
        return (window as any).SearchResult;
    }
    
    return null;
};

// Add TypeScript JSX definitions
declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elem: string]: any;
        }
    }
    interface Window {
        PostUtils: {
            formatText: (text: string) => string;
        };
    }
}

const styles = {
    container: {
        display: 'flex',
        flexDirection: 'column' as const,
        height: '100%',
        overflow: 'hidden' // Prevent double scrollbars
    },
    content: {
        flex: '1 1 auto',
        overflow: 'auto',
        padding: '0 24px 24px', // Match hashtag list padding
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 4px', // Match hashtag list padding
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        flex: '0 0 auto' // Prevent header from shrinking
    },
    backButton: {
        background: 'none',
        border: 'none',
        color: 'rgba(var(--center-channel-color-rgb), 0.56)',
        padding: '4px 8px',
        marginRight: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.15s ease',
        borderRadius: '4px',
        '&:hover': {
            backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)'
        }
    },
    title: {
        fontSize: '14px',
        fontWeight: 600 as const,
        margin: 0,
        color: 'var(--center-channel-color)'
    },
    postList: {
        padding: '12px 0',
        margin: 0
    }
};

export default function TagResults({teamId, tag, onBack, channelId}: {teamId: string; tag: string; onBack: ()=>void; channelId?: string}) {
  const [posts, setPosts] = useState<HashtagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get team name from Redux store
  const team = useSelector((state: any) => state.entities.teams.teams[teamId]);
  const teamName = team ? team.name : '';

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    console.log('TagResults: Fetching posts for tag:', tag, 'channelId:', channelId);
    
    fetchHashtagPosts(tag, channelId)
      .then(response => {
        console.log('TagResults: Received response:', response);
        if (!mounted) return;

        if (!response) {
          console.error('TagResults: Received null response');
          setError('Failed to fetch posts');
          setPosts([]);
          return;
        }

        if (!Array.isArray(response)) {
          console.error('TagResults: Received non-array response:', response);
          setError('Invalid response from server');
          setPosts([]);
          return;
        }

        setPosts(response);
      })
      .catch(e => {
        console.error('TagResults: Error fetching posts:', e);
        if (mounted) {
          setError(e.message);
          setPosts([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [tag, channelId]);

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="sidebar--right__content" style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backButton}>
            <i className="fa fa-arrow-left" style={{marginRight: '8px'}} />
            Back
          </button>
          <h3 style={styles.title}>#{tag}</h3>
        </div>

        {error && <div style={{color: 'var(--error-text)'}}>Error: {error}</div>}
        
        {loading ? (
          <div>Loading posts...</div>
        ) : posts.length === 0 ? (
          <div>No messages found with #{tag}</div>
        ) : (
          <div className="search-items-container" style={styles.postList}>
            {posts.map((post: HashtagPost) => {
              const SearchResult = getSearchResult();
              
              // If SearchResult component is not available, use fallback
              if (!SearchResult) {
                console.error('SearchResult component is not available');
                
                // Get user avatar URL
                const getProfileImageUrl = (userId: string, profileImage?: string) => {
                  if (!userId) return '';
                  const baseUrl = (window as any).basename || '';
                  const timestamp = profileImage || new Date().getTime();
                  // Add timestamp to prevent caching issues
                  return `${baseUrl}/api/v4/users/${userId}/image?_=${timestamp}`;
                };

                // Highlight hashtags in the message, with special highlight for the current tag
                const highlightHashtags = (text: string) => {
                  // First, escape any HTML special characters to prevent XSS
                  const escapeHtml = (str: string) => {
                    return str
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#039;');
                  };

                  const escapedText = escapeHtml(text);
                  
                  // Create a regex that matches hashtags including hyphens
                  const hashtagRegex = /#([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)/g;
                  
                  // Replace hashtags, with special highlighting only for the current tag
                  return escapedText.replace(hashtagRegex, (match, word) => {
                    // Only highlight if it's an exact match with the current tag
                    const isCurrentTag = word.toLowerCase() === tag.toLowerCase();
                    return isCurrentTag
                      ? `<span style="color: var(--link-color); font-weight: 600; background-color: rgba(var(--button-bg-rgb), 0.08);">${match}</span>`
                      : match;
                  });
                };

                const goToPost = (e?: React.MouseEvent) => {
                  if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                  
                  // Try different methods to navigate to the post
                  if ((window as any).WebappUtils?.browserHistory?.push) {
                    (window as any).WebappUtils.browserHistory.push(`/${teamName}/pl/${post.id}`);
                  } else if ((window as any).WebApp?.browserHistory?.push) {
                    (window as any).WebApp.browserHistory.push(`/${teamName}/pl/${post.id}`);
                  } else if ((window as any).PostUtils?.permalinkBrowser) {
                    (window as any).PostUtils.permalinkBrowser(`/${teamName}/pl/${post.id}`);
                  } else {
                    // Fallback to direct URL change
                    window.location.href = `/${teamName}/pl/${post.id}`;
                  }
                };

                return (
                  <div key={post.id} style={{
                    padding: '16px',
                    marginBottom: '12px',
                    border: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
                    borderRadius: '4px',
                    background: 'var(--center-channel-bg)',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                  }}
                  className="search-item__container"
                  onClick={goToPost}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}>
                          <div style={{
                            flexShrink: 0,
                            position: 'relative',
                            width: '32px',
                            height: '32px'
                          }}>
                            <div
                              className="Avatar Avatar-md"
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(var(--center-channel-color-rgb), 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                overflow: 'hidden'
                              }}
                            >
                              <img
                                className="Avatar-img"
                                src={`${(window as any).basename || ''}/api/v4/users/${post.user_id}/image?time=${post.last_picture_update || Date.now()}`}
                                alt={`${post.username}'s profile picture`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  verticalAlign: 'top'
                                }}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;

                                  // Use the default avatar from Mattermost
                                  if ((window as any).PostUtils?.getDefaultProfileImage) {
                                    target.src = (window as any).PostUtils.getDefaultProfileImage(post.username);
                                  } else {
                                    // Fallback to initials
                                    target.style.display = 'none';
                                    const parent = target.parentElement;
                                    if (parent) {
                                      const initials = document.createElement('div');
                                      initials.style.width = '32px';
                                      initials.style.height = '32px';
                                      initials.style.borderRadius = '50%';
                                      initials.style.backgroundColor = 'rgba(var(--center-channel-color-rgb), 0.12)';
                                      initials.style.color = 'var(--center-channel-color)';
                                      initials.style.display = 'flex';
                                      initials.style.alignItems = 'center';
                                      initials.style.justifyContent = 'center';
                                      initials.style.fontWeight = '600';
                                      initials.style.fontSize = '12px';
                                      initials.textContent = (post.username || '?').charAt(0).toUpperCase();
                                      parent.appendChild(initials);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div style={{
                            flex: 1,
                            minWidth: 0
                          }}>
                            <strong style={{
                                color: 'var(--center-channel-color)',
                                fontSize: '14px',
                                lineHeight: '20px',
                                fontWeight: 600,
                                display: 'block',
                                marginBottom: '2px'
                              }}>
                                {post.username || 'Unknown User'}
                              </strong>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px'
                              }}>
                                <span style={{
                                  color: 'rgba(var(--center-channel-color-rgb), 0.56)',
                                  fontSize: '12px',
                                  lineHeight: '16px'
                                }}>
                                  {formatDate(post.create_at)}
                                </span>
                                <span style={{
                                  color: 'rgba(var(--center-channel-color-rgb), 0.56)',
                                  fontSize: '12px',
                                  lineHeight: '16px'
                                }}>
                                  {post.channel_display_name}
                                </span>
                              </div>
                          </div>
                        </div>
                        <div style={{
                          color: 'rgba(var(--center-channel-color-rgb), 0.56)',
                          fontSize: '12px',
                          marginTop: '2px'
                        }}>
                          {post.channel_display_name}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          goToPost();
                        }}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(var(--button-bg-rgb), 0.08)',
                          color: 'var(--button-bg)',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                        }}
                        className="view-post-button"
                      >
                        View Post
                      </button>
                    </div>
                    <div style={{
                      color: 'var(--center-channel-color)',
                      fontSize: '14px',
                      lineHeight: '20px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                      dangerouslySetInnerHTML={{
                        __html: highlightHashtags(post.message)
                      }}
                    />
                  </div>
                );
              }

              return (
                <SearchResult
                  key={post.id}
                  post={post}
                  term={tag}
                  isMentionSearch={false}
                  isFlaggedPosts={false}
                  isPinnedPosts={false}
                  channelName={post.channel_name}
                  channelDisplayName={post.channel_display_name}
                  handleSearchTermChange={()=>{}}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}