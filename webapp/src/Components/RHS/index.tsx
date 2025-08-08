import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import HashtagList from './HashtagList';
import TagResults from './TagResults';

export default function RHS() {
  const channelId = useSelector((s: any) => s.entities.channels.currentChannelId);
  const teamId = useSelector((s: any) => s.entities.teams.currentTeamId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="alert alert-danger">
        <i className="fa fa-warning" /> {error}
      </div>
    );
  }

  try {
    if (!channelId) {
      return (
        <div className="alert alert-warning">
          <i className="fa fa-info-circle" /> Please select a channel to view hashtags.
        </div>
      );
    }

    if (!selectedTag) {
      return <HashtagList channelId={channelId} onSelect={setSelectedTag} />;
    }
    
    return (
      <TagResults 
        teamId={teamId} 
        tag={selectedTag} 
        onBack={() => setSelectedTag(null)} 
      />
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    return null;
  }
}