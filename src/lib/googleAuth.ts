import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

// Link de volta para o app depois do login.
// ATENÇÃO (correção): no Expo Go este valor NÃO é "rotafit://", e sim algo como
// "exp://192.168.0.10:8081/--/". Por isso, em Authentication → URL Configuration
// do Supabase cadastre também "exp://**" (desenvolvimento) além de "rotafit://**".
export const authRedirectUri = AuthSession.makeRedirectUri({ scheme: 'rotafit' });

if (__DEV__) {
  console.log('[RotaFit] Redirect do login Google:', authRedirectUri);
}

// CORREÇÃO: o guia importava 'expo-auth-session/build/QueryParams', um caminho
// INTERNO do pacote (não faz parte da API pública e pode sumir numa atualização).
// Lemos os parâmetros da query (?code=...) e do fragmento (#access_token=...).
export function parseAuthParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.includes('?') ? beforeHash.split('?')[1] : '';
  for (const part of [query, hash]) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [k, v = ''] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }
  }
  return params;
}

// Login com Google, delegado ao próprio Supabase: o app nunca vê um client
// secret do Google. Abrimos a URL de login numa aba controlada (WebBrowser) e,
// ao voltar para o app, transformamos o retorno numa sessão.
export async function signInWithGoogle(): Promise<void> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUri,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Não foi possível iniciar o login com o Google.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, authRedirectUri);
  if (result.type !== 'success' || !result.url) {
    if (result.type === 'cancel' || result.type === 'dismiss') return; // cancelou
    throw new Error('O login com o Google não foi concluído.');
  }

  const params = parseAuthParams(result.url);
  if (params.error) throw new Error(params.error_description ?? params.error);

  // Se o projeto usar o fluxo PKCE (flowType: 'pkce'), chega um "code".
  if (params.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      params.code,
    );
    if (exchangeError) throw exchangeError;
    return;
  }

  // Fluxo implícito (padrão do supabase-js): tokens no fragmento (#) da URL.
  const { access_token: accessToken, refresh_token: refreshToken } = params;
  if (!accessToken || !refreshToken)
    throw new Error('O Google não devolveu uma sessão válida.');
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (sessionError) throw sessionError;
}
