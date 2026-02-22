import { useState, useEffect } from 'react';
import { READING_MOODS, getRandomQuery, type ReadingMood } from '@/lib/spotify/moods';
import { searchTracks, isSpotifyAuthenticated, startSpotifyAuth, type SpotifyTrack } from '@/lib/spotify/api';
import type { BookSettings } from '@/types/book';

interface UseSpotifyMoodReturn {
  selectedMood: ReadingMood | null;
  setMood: (mood: ReadingMood | null) => void;
  tracks: SpotifyTrack[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  connectSpotify: () => void;
}

export function useSpotifyMood(
  settings: BookSettings | null,
  saveSettings: (partial: Partial<BookSettings>) => Promise<void>
): UseSpotifyMoodReturn {
  const [selectedMood, setSelectedMood] = useState<ReadingMood | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(isSpotifyAuthenticated);
  const [fetchKey, setFetchKey] = useState(0);

  useEffect(() => {
    setIsAuthenticated(isSpotifyAuthenticated());
  }, []);

  useEffect(() => {
    if (settings?.spotifyMood && settings.spotifyMood in READING_MOODS) {
      setSelectedMood(settings.spotifyMood as ReadingMood);
    }
  }, [settings]);

  useEffect(() => {
    if (!selectedMood) {
      setTracks([]);
      return;
    }

    if (!isAuthenticated) return;

    setLoading(true);
    setError(null);

    searchTracks(getRandomQuery(selectedMood))
      .then((fetchedTracks) => {
        setTracks(fetchedTracks);
      })
      .catch((e: Error) => {
        setError(e.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedMood, isAuthenticated, fetchKey]);

  const setMood = (mood: ReadingMood | null) => {
    if (mood === selectedMood) {
      // Re-clicking same mood fetches fresh results
      setFetchKey((k) => k + 1);
    } else {
      setSelectedMood(mood);
    }
    saveSettings({ spotifyMood: mood }).catch(() => {});
  };

  const connectSpotify = () => {
    startSpotifyAuth();
  };

  return {
    selectedMood,
    setMood,
    tracks,
    loading,
    error,
    isAuthenticated,
    connectSpotify,
  };
}
