import { useEffect, useState, useCallback, useRef } from 'react';
import { Music, X, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpotifyEmbed } from '@/hooks/useSpotifyEmbed';
import { useSpotifyMood } from '@/hooks/useSpotifyMood';
import { READING_MOODS, type ReadingMood } from '@/lib/spotify/moods';
import type { BookSettings } from '@/types/book';

interface SpotifyMoodPlayerProps {
  settings: BookSettings | null;
  saveSettings: (partial: Partial<BookSettings>) => Promise<void>;
}

export function SpotifyMoodPlayer({ settings, saveSettings }: SpotifyMoodPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const embedDivRef = useRef<HTMLDivElement | null>(null);
  const [embedEl, setEmbedEl] = useState<HTMLDivElement | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);
  const { selectedMood, setMood, tracks, loading, error, isAuthenticated, connectSpotify } =
    useSpotifyMood(settings, saveSettings);

  const trackIndexRef = useRef(trackIndex);
  trackIndexRef.current = trackIndex;
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const loadUriRef = useRef<((uri: string) => void) | undefined>(undefined);

  const advanceTrack = useCallback(() => {
    if (tracksRef.current.length === 0) return;
    const next = (trackIndexRef.current + 1) % tracksRef.current.length;
    setTrackIndex(next);
    loadUriRef.current?.(tracksRef.current[next].uri);
  }, []);

  const { isReady, loadUri } = useSpotifyEmbed(embedEl, advanceTrack);
  loadUriRef.current = loadUri;

  const attachEmbed = useCallback((wrapper: HTMLDivElement | null) => {
    if (!wrapper) return;
    if (!embedDivRef.current) {
      const div = document.createElement('div');
      div.style.height = '152px';
      div.style.width = '100%';
      div.style.borderRadius = '0.25rem';
      div.style.border = '1px solid var(--border, #e5e7eb)';
      embedDivRef.current = div;
      setEmbedEl(div);
    }
    if (!wrapper.contains(embedDivRef.current)) {
      wrapper.appendChild(embedDivRef.current);
    }
  }, []);

  // Single effect for loading tracks — handles both new mood and embed ready
  useEffect(() => {
    if (tracks.length > 0 && isReady) {
      const idx = Math.floor(Math.random() * tracks.length);
      setTrackIndex(idx);
      loadUri(tracks[idx].uri);
    }
  }, [tracks, isReady, loadUri]);

  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const prev = (trackIndex - 1 + tracks.length) % tracks.length;
    setTrackIndex(prev);
    loadUri(tracks[prev].uri);
  }, [tracks, trackIndex, loadUri]);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    const next = (trackIndex + 1) % tracks.length;
    setTrackIndex(next);
    loadUri(tracks[next].uri);
  }, [tracks, trackIndex, loadUri]);

  return (
    <>
      {!isExpanded && (
        <Button
          onClick={() => setIsExpanded(true)}
          size="sm"
          variant="outline"
          className="fixed bottom-4 right-4 z-40 h-10 w-10 rounded-full p-0 backdrop-blur-md reading-surface border"
        >
          <Music className="h-4 w-4" />
        </Button>
      )}

      <div
        className={`fixed bottom-4 right-4 z-40 w-80 reading-surface backdrop-blur-md border rounded-lg shadow-lg p-4 transition-all duration-200 ${
          isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Reading Mood</h3>
          <div className="flex items-center gap-1">
            {tracks.length > 0 && (
              <>
                <Button
                  onClick={prevTrack}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Previous track"
                >
                  <SkipBack className="h-3 w-3" />
                </Button>
                <Button
                  onClick={nextTrack}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  title="Next track"
                >
                  <SkipForward className="h-3 w-3" />
                </Button>
              </>
            )}
            <Button
              onClick={() => setIsExpanded(false)}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!isAuthenticated ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">
              Connect your Spotify account to play reading music
            </p>
            <Button onClick={connectSpotify} size="sm" className="text-xs">
              Connect Spotify
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
              {Object.entries(READING_MOODS).map(([key, mood]) => (
                <Button
                  key={key}
                  onClick={() => setMood(key as ReadingMood)}
                  size="sm"
                  variant={selectedMood === key ? "default" : "outline"}
                  className="flex-shrink-0 text-xs px-3 py-1 h-auto"
                >
                  <span className="mr-1">{mood.emoji}</span>
                  {mood.label}
                </Button>
              ))}
              {selectedMood && (
                <Button
                  onClick={() => setMood(null)}
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0 text-xs px-2 py-1 h-auto"
                >
                  Clear
                </Button>
              )}
            </div>

            {loading && (
              <div className="text-xs text-muted-foreground mb-2">Loading tracks...</div>
            )}

            {error && (
              <div className="text-xs text-red-500 mb-2">{error}</div>
            )}

            <div ref={attachEmbed} />
          </>
        )}
      </div>
    </>
  );
}
