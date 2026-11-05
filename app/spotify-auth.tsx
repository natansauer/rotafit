import { Redirect } from 'expo-router';

// CORREÇÃO: depois do login no Spotify, o celular abre o app pelo endereço
// ".../--/spotify-auth?code=...". O Expo Router trata esse endereço como uma
// tela a ser aberta e, como ela não existia no guia, mostrava "Unmatched Route".
// O código de login já é capturado pelo SpotifyProvider (na raiz do app); esta
// rota só existe para levar o usuário de volta ao Perfil, já conectado.
export default function SpotifyAuthCallback() {
  return <Redirect href="/profile" />;
}
