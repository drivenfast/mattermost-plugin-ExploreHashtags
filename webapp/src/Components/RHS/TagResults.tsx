import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchHashtagPosts, HashtagPost, PaginatedHashtagResponse } from '../../client';

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
        overflow: 'hidden' // Container should not scroll
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        flex: '0 0 auto', // Fixed header
        zIndex: 10
    },
    paginationTop: {
        padding: '12px 24px',
        borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)',
        flex: '0 0 auto', // Fixed pagination
        zIndex: 9
    },
    content: {
        flex: '1 1 auto',
        overflow: 'auto', // Only content area scrolls
        padding: '0 24px 32px', // Bottom padding for breathing room
        boxSizing: 'border-box' as const
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
        margin: '0 0 24px 0' // Add bottom margin for extra spacing
    }
};

export default function TagResults({teamId, tag, onBack, channelId}: {teamId: string; tag: string; onBack: ()=>void; channelId?: string}) {
  const [posts, setPosts] = useState<HashtagPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  
  // Get team name from Redux store
  const team = useSelector((state: any) => state.entities.teams.teams[teamId]);
  const teamName = team ? team.name : '';

  const fetchPosts = async (page: number, pageSize: number) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('TagResults: Fetching posts for tag:', tag, 'channelId:', channelId, 'page:', page, 'perPage:', pageSize);
      
      const response: PaginatedHashtagResponse = await fetchHashtagPosts(tag, channelId, page, pageSize);
      console.log('TagResults: Received paginated response:', response);
      
      if (!response) {
        console.error('TagResults: Received null response');
        setError('Failed to fetch posts');
        setPosts([]);
        return;
      }

      if (!Array.isArray(response.posts)) {
        console.error('TagResults: Received invalid posts array:', response.posts);
        setError('Invalid response from server');
        setPosts([]);
        return;
      }

      setPosts(response.posts);
      setTotalCount(response.total_count);
      setHasMore(response.has_more);
      setCurrentPage(page);
    } catch (e) {
      console.error('TagResults: Error fetching posts:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts(1, perPage);
  }, [tag, channelId, perPage]);

  const handleNextPage = () => {
    if (hasMore) {
      fetchPosts(currentPage + 1, perPage);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      fetchPosts(currentPage - 1, perPage);
    }
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    // fetchPosts will be called automatically by useEffect when perPage changes
  };

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
      {/* Fixed Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          <i className="fa fa-arrow-left" style={{marginRight: '8px'}} />
          Back
        </button>
        <h3 style={styles.title}>#{tag}</h3>
      </div>

      {/* Fixed Top Pagination */}
      {posts.length > 0 && (
        <div style={styles.paginationTop}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            fontSize: '12px',
            color: 'rgba(var(--center-channel-color-rgb), 0.56)'
          }}>
            <span>
              Showing {Math.min((currentPage - 1) * perPage + 1, totalCount)}-{Math.min(currentPage * perPage, totalCount)} of {totalCount} posts
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <label style={{
                fontSize: '12px',
                color: 'rgba(var(--center-channel-color-rgb), 0.56)'
              }}>Posts per page:</label>
              <select 
                value={perPage} 
                onChange={(e) => handlePerPageChange(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  border: '1px solid rgba(var(--center-channel-color-rgb), 0.16)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  background: 'var(--center-channel-bg)',
                  color: 'var(--center-channel-color)'
                }}
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <button 
                onClick={handlePreviousPage} 
                disabled={currentPage === 1 || loading}
                style={{
                  padding: '4px 12px',
                  background: currentPage === 1 || loading ? 'rgba(var(--center-channel-color-rgb), 0.08)' : 'var(--button-bg)',
                  color: currentPage === 1 || loading ? 'rgba(var(--center-channel-color-rgb), 0.32)' : 'var(--button-color)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: currentPage === 1 || loading ? 'default' : 'pointer'
                }}
              >
                Previous
              </button>
              <span style={{
                padding: '4px 8px',
                fontSize: '12px',
                color: 'var(--center-channel-color)',
                fontWeight: 600
              }}>{currentPage}</span>
              <button 
                onClick={handleNextPage} 
                disabled={!hasMore || loading}
                style={{
                  padding: '4px 12px',
                  background: !hasMore || loading ? 'rgba(var(--center-channel-color-rgb), 0.08)' : 'var(--button-bg)',
                  color: !hasMore || loading ? 'rgba(var(--center-channel-color-rgb), 0.32)' : 'var(--button-color)',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: !hasMore || loading ? 'default' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Content Area */}
      <div style={styles.content}>
        {error && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            color: 'var(--error-text)',
            fontSize: '14px'
          }}>
            Error: {error}
          </div>
        )}
        
        {loading && posts.length === 0 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            color: 'rgba(var(--center-channel-color-rgb), 0.72)',
            fontSize: '14px'
          }}>
            Loading posts...
          </div>
        ) : posts.length === 0 && !loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '40px 20px',
            color: 'rgba(var(--center-channel-color-rgb), 0.72)',
            fontSize: '14px'
          }}>
            No messages found with #{tag}
            {channelId && " in this channel"}
          </div>
        ) : (
          <>
            {loading && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                color: 'rgba(var(--center-channel-color-rgb), 0.72)',
                fontSize: '14px'
              }}>
                Loading...
              </div>
            )}
            
            <div className="search-items-container" style={styles.postList}>
              {posts.map((post: HashtagPost) => {
                const SearchResult = getSearchResult();
                
                // If SearchResult component is not available, use fallback
                if (!SearchResult) {
                  console.error('SearchResult component is not available');
                  
                  // Highlight hashtags in the message, with special highlight for the current tag
                  const highlightHashtags = (text: string) => {
                    if (!text) return '';
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
                          __html: highlightHashtags(post.message || '')
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
          </>
        )}
      </div>
    </div>
  );
}