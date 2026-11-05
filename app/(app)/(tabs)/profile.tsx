import Constants from 'expo-constants';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuth } from '@/context/AuthContext';
import { useSpotify } from '@/context/SpotifyContext';
import { spacing, useTheme } from '@/theme';
import { friendlyError } from '@/utils/errors';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user, signOut } = useAuth();
  const { tokens, connect, disconnect, connecting, error, redirectUri } = useSpotify();

  const name = String(user?.user_metadata?.full_name ?? 'Usuário');
  const avatarUrl = (user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture) as
    | string
    | undefined;

  function confirmSignOut() {
    Alert.alert('Sair', 'Deseja encerrar a sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => signOut().catch((e) => Alert.alert('Erro', friendlyError(e))),
      },
    ]);
  }

  return (
    <Screen scroll contentStyle={styles.content}>
      <Text style={[styles.title, { color: theme.text }]}>Perfil</Text>

      <Card style={styles.card}>
        {/* CORREÇÃO: o guia importava Image e lia avatar_url, mas nunca mostrava
            a foto — aparecia sempre a inicial. */}
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.avatarText, { color: theme.onPrimary }]}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
        <Text style={[styles.email, { color: theme.muted }]}>{user?.email}</Text>
      </Card>

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>APARÊNCIA</Text>
      <ThemePicker />

      <Text style={[styles.sectionTitle, { color: theme.muted }]}>SPOTIFY</Text>
      <Card style={styles.spotifyCard}>
        {tokens ? (
          <>
            <Text style={{ color: theme.text, textAlign: 'center' }}>Conta conectada.</Text>
            <Button title="Desconectar Spotify" variant="secondary" onPress={disconnect} />
          </>
        ) : (
          <Button
            title={connecting ? 'Conectando...' : 'Conectar Spotify'}
            onPress={connect}
            disabled={connecting}
          />
        )}
        {error ? (
          <Text style={[styles.small, { color: theme.danger }]}>{error}</Text>
        ) : null}
        {__DEV__ ? (
          <Text style={[styles.small, { color: theme.muted }]} selectable>
            Redirect URI (cadastre igual no painel do Spotify):{'\n'}
            {redirectUri}
          </Text>
        ) : null}
      </Card>

      <Button
        title="Sair da conta"
        variant="danger"
        onPress={confirmSignOut}
        style={styles.signOut}
      />

      <Text style={[styles.version, { color: theme.muted }]}>
        RotaFit v{Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: 120 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: spacing.sm },
  card: { alignItems: 'center', gap: 2 },
  spotifyCard: { gap: spacing.sm },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: { fontSize: 30, fontWeight: '800' },
  name: { fontSize: 20, fontWeight: '700' },
  email: { fontSize: 14 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
  },
  small: { fontSize: 12, textAlign: 'center' },
  signOut: { marginTop: spacing.md },
  version: { textAlign: 'center', fontSize: 12, marginTop: spacing.sm },
});
