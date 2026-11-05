// Converte qualquer erro (Error, PostgrestError do Supabase, AuthError, erro
// do Spotify, string...) numa mensagem curta, em português, para o usuário.
// Arquivo citado no guia (Etapas 11 a 14) mas cujo código não aparecia.
const KNOWN: { match: RegExp; message: string }[] = [
  {
    match: /network request failed|failed to fetch|network ?error/i,
    message: 'Sem conexão com a internet. Confira sua rede e tente de novo.',
  },
  {
    match: /row-level security/i,
    message: 'Sua sessão expirou ou não tem permissão. Entre novamente.',
  },
  {
    match: /jwt expired|invalid jwt|refresh token/i,
    message: 'Sua sessão expirou. Entre novamente.',
  },
  {
    match: /premium/i,
    message: 'O controle de reprodução exige uma conta Spotify Premium.',
  },
];

export function friendlyError(error: unknown): string {
  let raw = '';
  if (typeof error === 'string') raw = error;
  else if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') raw = message;
  }
  if (!raw) return 'Algo deu errado. Tente novamente.';
  const known = KNOWN.find((k) => k.match.test(raw));
  return known ? known.message : raw;
}
