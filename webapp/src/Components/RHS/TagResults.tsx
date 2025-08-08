import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { fetchHashtagPosts, HashtagPost } from '../../client';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%'
  },
  content: {
    padding: '20px 24px',
    flex: '1 1 auto',
    overflow: 'auto'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '0 0 16px',
    borderBottom: '1px solid rgba(var(--center-channel-color-rgb), 0.08)'
  },
  backButton: {
    background: '#f4f4f4',
    border: 'none',
    color: '#000000',
    padding: '8px 16px',
    marginRight: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  title: {
    fontSize: '16px',
    fontWeight: 600 as const,
    margin: 0,
    color: 'var(--center-channel-color)'
  },
  postList: {
    listStyle: 'none',
    margin: 0,
    padding: '20px 0'
  },
  postItem: {
    margin: '0 0 16px',
    padding: '20px',
    background: 'rgba(var(--center-channel-color-rgb), 0.04)',
    borderRadius: '4px'
  },
  postHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    fontSize: '13px'
  },
  username: {
    fontWeight: 600,
    marginRight: '8px',
    color: 'var(--center-channel-color)'
  },
  timestamp: {
    color: 'rgba(var(--center-channel-color-rgb), 0.56)'
  },
  message: {
    fontSize: '14px',
    lineHeight: '20px',
    margin: '0 0 12px',
    color: 'var(--center-channel-color)',
    whiteSpace: 'pre-wrap' as const
  },
  viewLink: {
    color: 'var(--link-color)',
    textDecoration: 'none',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center'
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
          <ul style={styles.postList}>
            {posts.map((post) => (
              <li key={post.id} style={styles.postItem}>
                <div style={styles.postHeader}>
                  <span style={styles.username}>@{post.username}</span>
                  <span style={styles.timestamp}>{formatDate(post.create_at)}</span>
                </div>
                <p style={styles.message}>{post.message}</p>
                <a 
                  href={`/${teamName}/pl/${post.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.viewLink}
                >
                  View message <i className="fa fa-external-link" style={{marginLeft: '4px'}} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}