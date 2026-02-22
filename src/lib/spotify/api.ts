export interface SpotifyTrack {
  uri: string;
  name: string;
  artist: string;
  albumArt: string | null;
}

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const REDIRECT_URI = import.meta.env.PROD
  ? `${window.location.origin}/callback/spotify`
  : 'http://127.0.0.1:5173/callback/spotify';
const SCOPES = 'user-read-private';
const TOKEN_KEY = 'spotify_token';
const EXPIRY_KEY = 'spotify_token_expiry';
const REFRESH_KEY = 'spotify_refresh_token';
const VERIFIER_KEY = 'spotify_pkce_verifier';
const STATE_KEY = 'spotify_oauth_state';
const RETURN_URL_KEY = 'spotify_return_url';

function getStoredToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (token && expiry && Date.now() < Number(expiry)) return token;
  return null;
}

function storeToken(token: string, expiresIn: number, refreshToken?: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSpotifyAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    clearSpotifyAuth();
    return null;
  }

  const data = await response.json();
  if (!data.access_token) return null;

  storeToken(data.access_token, data.expires_in, data.refresh_token);
  return data.access_token;
}

async function getToken(): Promise<string | null> {
  return getStoredToken() ?? refreshAccessToken();
}

export function isSpotifyAuthenticated(): boolean {
  return getStoredToken() !== null || localStorage.getItem(REFRESH_KEY) !== null;
}

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 128);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function startSpotifyAuth() {
  const verifier = await generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = generateState();
  localStorage.setItem(VERIFIER_KEY, verifier);
  localStorage.setItem(STATE_KEY, state);
  localStorage.setItem(RETURN_URL_KEY, window.location.pathname);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function handleSpotifyCallback(code: string, state: string): Promise<boolean> {
  const storedState = localStorage.getItem(STATE_KEY);
  if (!storedState || storedState !== state) {
    console.error('Spotify OAuth state mismatch — possible CSRF');
    return false;
  }
  localStorage.removeItem(STATE_KEY);

  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    console.error('Spotify PKCE verifier not found in localStorage');
    return false;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Spotify token exchange failed:', response.status, err);
    return false;
  }

  const data = await response.json();

  if (!data.access_token || typeof data.expires_in !== 'number') {
    console.error('Spotify token response missing required fields:', data);
    return false;
  }

  storeToken(data.access_token, data.expires_in, data.refresh_token);
  localStorage.removeItem(VERIFIER_KEY);
  return true;
}

export function getAndClearReturnUrl(): string {
  const url = localStorage.getItem(RETURN_URL_KEY) || '/library';
  localStorage.removeItem(RETURN_URL_KEY);
  return url;
}

export async function searchTracks(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated with Spotify');

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) {
    if (response.status === 401) clearSpotifyAuth();
    const err = await response.text();
    throw new Error(`Search failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.tracks.items.map((track: any) => ({
    uri: track.uri,
    name: track.name,
    artist: track.artists[0]?.name || '',
    albumArt: track.album.images[0]?.url || null,
  }));
}
