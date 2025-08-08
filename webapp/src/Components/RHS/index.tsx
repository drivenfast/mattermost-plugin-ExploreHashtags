import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';
import HashtagList from './HashtagList';
import TagResults from './TagResults';

export default function RHS() {
  const channelId = useSelector((s: any) => s.entities.channels.currentChannelId);
  const teamId = useSelector((s: any) => s.entities.teams.currentTeamId);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | undefined>(undefined);
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
      return <HashtagList channelId={channelId} onSelect={(tag, cid) => {
        console.log('Selected hashtag:', tag, 'with channel:', cid);
        setSelectedTag(tag);
        setSelectedChannelId(cid);
      }} />;
    }
    
    console.log('Rendering TagResults:', { tag: selectedTag, channelId: selectedChannelId });
    return (
      <TagResults 
        teamId={teamId} 
        tag={selectedTag} 
        channelId={selectedChannelId}
        onBack={() => {
          setSelectedTag(null);
          setSelectedChannelId(undefined);
        }} 
      />
    );
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    return null;
  }
}