import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/lib/secureStore';
import { SPOTIFY_SCOPES, spotifyClientId, spotifyDiscovery } from '@/lib/spotify';
import type { SpotifyTokens } from '@/types';
import { friendlyError } from '@/utils/errors';

WebBrowser.maybeCompleteAuthSession();

const STORE_KEY = 'rotafit.spotify.tokens';

interface SpotifyContextValue {
  tokens: SpotifyTokens | null;
  connecting: boolean;
  error: string | null;
  redirectUri: string;
  connect: () => void;
  disconnect: () => Promise<void>;
  getValidAccessToken: () => Promise<string | null>;
}

const SpotifyContext = createContext<SpotifyContextValue | undefined>(undefined);

// ATENÇÃO (correção): em build de desenvolvimento/produção isto vale
// "rotafit://spotify-auth"; no Expo Go vale "exp://SEU-IP:8081/--/spotify-auth".
// O Spotify exige que o valor seja IDÊNTICO a um Redirect URI cadastrado no
// painel — por isso o Perfil mostra este valor em modo de desenvolvimento.
export const spotifyRedirectUri = AuthSession.makeRedirectUri({
  scheme: 'rotafit',
  path: 'spotify-auth',
});

if (__DEV__) {
  console.log('[RotaFit] Redirect URI do Spotify:', spotifyRedirectUri);
}

async function saveTokens(tokens: SpotifyTokens) {
  await setSecureItem(STORE_KEY, JSON.stringify(tokens));
}

async function loadTokens(): Promise<SpotifyTokens | null> {
  const raw = await getSecureItem(STORE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyTokens;
  } catch {
    return null;
  }
}

// Login e controle de sessão do Spotify. Usa PKCE (sem client secret) e guarda
// os tokens no SecureStore do aparelho.
export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<SpotifyTokens | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);
  const handledCode = useRef<string | null>(null);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: spotifyClientId,
      scopes: SPOTIFY_SCOPES,
      redirectUri: spotifyRedirectUri,
      usePKCE: true,
    },
    spotifyDiscovery,
  );

  useEffect(() => {
    loadTokens()
      .then(setTokens)
      .catch(() => setTokens(null));
  }, []);

  useEffect(() => {
    if (!response) return;
    if (response.type === 'error') {
      setError(response.error?.message ?? 'O Spotify recusou o login.');
      setConnecting(false);
      return;
    }
    if (response.type !== 'success') {
      setConnecting(false); // cancel / dismiss
      return;
    }
    const code = response.params.code;
    // CORREÇÃO: o guia podia trocar o MESMO code duas vezes (o efeito roda de
    // novo quando "request" muda), e o Spotify responde "invalid_grant".
    if (!code || !request?.codeVerifier || handledCode.current === code) return;
    handledCode.current = code;

    setConnecting(true);
    AuthSession.exchangeCodeAsync(
      {
        clientId: spotifyClientId,
        code,
        redirectUri: spotifyRedirectUri,
        extraParams: { code_verifier: request.codeVerifier },
      },
      spotifyDiscovery,
    )
      .then(async (result) => {
        const next: SpotifyTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken ?? '',
          expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
        };
        await saveTokens(next);
        setTokens(next);
        setError(null);
      })
      // CORREÇÃO: no guia, uma falha na troca virava "unhandled promise rejection".
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setConnecting(false));
  }, [response, request]);

  const connect = useCallback(() => {
    if (!spotifyClientId) {
      setError('EXPO_PUBLIC_SPOTIFY_CLIENT_ID não está no .env.');
      return;
    }
    setError(null);
    setConnecting(true);
    promptAsync().catch((e) => {
      setError(friendlyError(e));
      setConnecting(false);
    });
  }, [promptAsync]);

  const disconnect = useCallback(async () => {
    await deleteSecureItem(STORE_KEY);
    setTokens(null);
  }, []);

  // Renova o token de acesso quando falta menos de um minuto para expirar.
  const getValidAccessToken = useCallback(async (): Promise<string | null> => {
    if (!tokens) return null;
    if (tokens.expiresAt - Date.now() > 60_000) return tokens.accessToken;
    if (!refreshing.current) {
      refreshing.current = AuthSession.refreshAsync(
        { clientId: spotifyClientId, refreshToken: tokens.refreshToken },
        spotifyDiscovery,
      )
        .then(async (result) => {
          const next: SpotifyTokens = {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken ?? tokens.refreshToken,
            expiresAt: Date.now() + (result.expiresIn ?? 3600) * 1000,
          };
          await saveTokens(next);
          setTokens(next);
          return next.accessToken;
        })
        .catch(async () => {
          await disconnect(); // refresh token revogado: conectar de novo
          return null;
        })
        .finally(() => {
          refreshing.current = null;
        });
    }
    return refreshing.current;
  }, [tokens, disconnect]);

  const value = useMemo(
    () => ({
      tokens,
      connecting,
      error,
      redirectUri: spotifyRedirectUri,
      connect,
      disconnect,
      getValidAccessToken,
    }),
    [tokens, connecting, error, connect, disconnect, getValidAccessToken],
  );

  return <SpotifyContext.Provider value={value}>{children}</SpotifyContext.Provider>;
}

export function useSpotify(): SpotifyContextValue {
  const context = useContext(SpotifyContext);
  if (!context) throw new Error('useSpotify deve ser usado dentro de <SpotifyProvider>');
  return context;
}
