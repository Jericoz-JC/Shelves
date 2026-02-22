import { useEffect, useRef, useState, useCallback } from 'react';

interface PlaybackUpdate {
  data: { isPaused: boolean; position: number; duration: number };
}

interface SpotifyController {
  loadUri: (uri: string) => void;
  play: () => void;
  togglePlay: () => void;
  destroy: () => void;
  addListener: (event: string, cb: (e: PlaybackUpdate) => void) => void;
}

interface SpotifyIFrameAPI {
  createController: (
    element: HTMLElement,
    options: { uri?: string; width: string; height: number; theme?: string },
    callback: (controller: SpotifyController) => void
  ) => void;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    _spotifyIFrameAPI?: SpotifyIFrameAPI;
  }
}

function loadSpotifyScript() {
  if (document.querySelector('script[src*="spotify.com/embed"]') || window._spotifyIFrameAPI) return;
  const script = document.createElement('script');
  script.src = 'https://open.spotify.com/embed/iframe-api/v1';
  script.async = true;
  document.head.appendChild(script);
}

if (!window._spotifyIFrameAPI) {
  const existingCallback = window.onSpotifyIframeApiReady;
  window.onSpotifyIframeApiReady = (api: SpotifyIFrameAPI) => {
    window._spotifyIFrameAPI = api;
    existingCallback?.(api);
  };
}

export function useSpotifyEmbed(
  containerEl: HTMLDivElement | null,
  onTrackEnd?: () => void
) {
  const [isReady, setIsReady] = useState(false);
  const controllerRef = useRef<SpotifyController | null>(null);
  const onTrackEndRef = useRef(onTrackEnd);
  onTrackEndRef.current = onTrackEnd;
  const endFiredRef = useRef(false);

  useEffect(() => {
    if (!containerEl) return;
    if (controllerRef.current) return;

    loadSpotifyScript();

    const init = (api: SpotifyIFrameAPI) => {
      api.createController(
        containerEl,
        { width: '100%', height: 152 },
        (controller) => {
          controllerRef.current = controller;
          setIsReady(true);

          controller.addListener('playback_update', (e: PlaybackUpdate) => {
            const { isPaused, position, duration } = e.data;
            if (!isPaused && duration > 0 && position >= duration - 1000) {
              if (!endFiredRef.current) {
                endFiredRef.current = true;
                onTrackEndRef.current?.();
              }
            } else {
              endFiredRef.current = false;
            }
          });
        }
      );
    };

    if (window._spotifyIFrameAPI) {
      init(window._spotifyIFrameAPI);
    } else {
      const prev = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => {
        window._spotifyIFrameAPI = api;
        prev?.(api);
        init(api);
      };
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
      setIsReady(false);
    };
  }, [containerEl]);

  const loadUri = useCallback((uri: string) => {
    controllerRef.current?.loadUri(uri);
    setTimeout(() => controllerRef.current?.play(), 300);
  }, []);

  const togglePlay = useCallback(() => {
    controllerRef.current?.togglePlay();
  }, []);

  return { isReady, loadUri, togglePlay };
}
