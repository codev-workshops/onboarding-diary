import { useState, useEffect, useMemo } from 'react';
import { shareEntry, getSocialConnections } from '../api/share';
import type { SocialConnection, ShareRequest } from '../types';

interface ShareDialogProps {
  entryId: number;
  entryTitle: string;
  entryContent: string;
  onClose: () => void;
}

const PLATFORMS = [
  { value: 'twitter' as const, label: 'Twitter / X' },
  { value: 'linkedin' as const, label: 'LinkedIn' },
  { value: 'facebook' as const, label: 'Facebook' },
];

export default function ShareDialog({ entryId, entryTitle, entryContent, onClose }: ShareDialogProps) {
  const defaultMessage = useMemo(() => {
    const excerpt = entryContent.length > 200 ? entryContent.substring(0, 200) + '...' : entryContent;
    return `${entryTitle}\n\n${excerpt}`;
  }, [entryTitle, entryContent]);

  const [platform, setPlatform] = useState<ShareRequest['platform']>('twitter');
  const [message, setMessage] = useState(defaultMessage);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let cancelled = false;
    getSocialConnections().then((data) => {
      if (!cancelled) setConnections(data);
    });
    return () => { cancelled = true; };
  }, []);

  const isConnected = (p: string) => connections.some((c) => c.platform === p);

  const handleShare = async () => {
    if (!isConnected(platform)) {
      setFeedback(`Please connect your ${platform} account first in Settings.`);
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      const response = await shareEntry(entryId, { platform, message: message || undefined });
      setFeedback(`Shared successfully! ${response.postUrl ? `View post: ${response.postUrl}` : ''}`);
      setStatus('success');
    } catch {
      setFeedback('Failed to share. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Share Entry</h2>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>

        <div className="modal-body">
          <label>Platform</label>
          <div className="platform-selector" role="radiogroup" aria-label="Select platform">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                className={`platform-btn ${platform === p.value ? 'active' : ''} ${!isConnected(p.value) ? 'not-connected' : ''}`}
                onClick={() => setPlatform(p.value)}
                type="button"
              >
                {p.label}
                {!isConnected(p.value) && <span className="badge">Not connected</span>}
              </button>
            ))}
          </div>

          <label htmlFor="share-message">Message</label>
          <textarea
            id="share-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            placeholder="Enter your share message..."
          />

          {feedback && (
            <div className={`feedback ${status}`}>
              {feedback}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn">Cancel</button>
          <button
            onClick={handleShare}
            className="btn btn-primary"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Sharing...' : 'Share'}
          </button>
        </div>
      </div>
    </div>
  );
}
