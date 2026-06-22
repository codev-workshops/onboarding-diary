import { useState, useEffect, useRef } from 'react';
import { getSocialConnections, disconnectPlatform, getConnectUrl } from '../api/share';
import type { SocialConnection } from '../types';

const PLATFORMS = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'facebook', label: 'Facebook' },
];

export default function SocialAccounts() {
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    let cancelled = false;
    getSocialConnections()
      .then((data) => { if (!cancelled) setConnections(data); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const reload = () => {
    setLoading(true);
    getSocialConnections()
      .then(setConnections)
      .finally(() => setLoading(false));
  };

  const getConnection = (platform: string): SocialConnection | undefined =>
    connections.find((c) => c.platform === platform);

  const handleDisconnect = async (platform: string) => {
    if (confirm(`Disconnect your ${platform} account?`)) {
      await disconnectPlatform(platform);
      reload();
    }
  };

  const handleConnect = (platform: string) => {
    const url = getConnectUrl(platform);
    window.open(url, '_self');
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="social-accounts">
      <h2>Connected Social Media Accounts</h2>
      <p>Connect your social media accounts to share diary entries directly.</p>

      {PLATFORMS.map((platform) => {
        const connection = getConnection(platform.value);
        return (
          <div key={platform.value} className="social-account-card">
            <div className="social-account-info">
              <h3>{platform.label}</h3>
              {connection ? (
                <span className="connected-badge">
                  Connected since {new Date(connection.connectedAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="not-connected-badge">Not connected</span>
              )}
            </div>
            <div className="social-account-actions">
              {connection ? (
                <button onClick={() => handleDisconnect(platform.value)} className="btn btn-danger btn-sm">
                  Disconnect
                </button>
              ) : (
                <button onClick={() => handleConnect(platform.value)} className="btn btn-primary btn-sm">
                  Connect
                </button>
              )}
            </div>
          </div>
        );
      })}

      {PLATFORMS.some((p) => p.value === 'facebook') && (
        <div className="notice">
          <strong>Note:</strong> Facebook sharing requires Meta App Review for production use.
          During development, only app developers and testers can use this feature.
        </div>
      )}
    </div>
  );
}
