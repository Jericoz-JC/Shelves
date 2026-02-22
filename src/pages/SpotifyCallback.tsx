import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleSpotifyCallback, getAndClearReturnUrl } from '@/lib/spotify/api';

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const err = params.get('error');

    if (err) {
      setError(`Spotify auth failed: ${err}`);
      return;
    }

    if (code && state) {
      handleSpotifyCallback(code, state).then((success) => {
        if (success) {
          navigate(getAndClearReturnUrl(), { replace: true });
        } else {
          setError('Failed to exchange token with Spotify');
        }
      });
    } else {
      navigate('/library', { replace: true });
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <p className="text-sm text-red-500">{error}</p>
        <button className="text-sm underline" onClick={() => navigate('/library')}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Connecting to Spotify...</p>
    </div>
  );
}
