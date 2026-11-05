import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { useSpotify } from '@/context/SpotifyContext';
import {
  useNowPlaying,
  usePausePlayback,
  useResumePlayback,
  useSkipNext,
  useSkipPrevious,
} from '@/hooks/useSpotifyPlayer';
import { spacing, useTheme } from '@/theme';
import { friendlyError } from '@/utils/errors';

// Player compacto, em vidro, mostrado no Início e na tela de corrida.
export function SpotifyPlayerCard() {
  const { theme } = useTheme();
  const { tokens, connect, connecting, error: connectError } = useSpotify();
  const { data: track, isLoading, error: queryError } = useNowPlaying();
  const pause = usePausePlayback();
  const resume = useResumePlayback();
  const next = useSkipNext();
  const prev = useSkipPrevious();

  // CORREÇÃO: o guia dizia que os erros dos controles "aparecem prontos para o
  // usuário", mas nenhum era exibido — o toque simplesmente não fazia nada.
  const controlError = [pause, resume, next, prev].find((m) => m.isError)?.error;
  const busy = pause.isPending || resume.isPending || next.isPending || prev.isPending;
  const resetErrors = () => [pause, resume, next, prev].forEach((m) => m.reset());

  if (!tokens) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="musical-notes" size={22} color={theme.primary} />
          <Text style={[styles.hint, { color: theme.text }]}>
            Conecte o Spotify para ouvir música durante a corrida.
          </Text>
        </View>
        {connectError ? (
          <Text style={[styles.error, { color: theme.danger }]}>{connectError}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={connect}
          disabled={connecting}
          style={[styles.connectBtn, { backgroundColor: theme.primary }]}
        >
          <Text style={[styles.connectText, { color: theme.onPrimary }]}>
            {connecting ? 'Conectando...' : 'Conectar Spotify'}
          </Text>
        </Pressable>
      </Card>
    );
  }

  if (!isLoading && !track) {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <Ionicons name="musical-note" size={22} color={theme.muted} />
          <Text style={[styles.hint, { color: theme.muted }]}>
            {queryError
              ? friendlyError(queryError)
              : 'Nada tocando agora. Abra o Spotify e escolha uma música.'}
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        {track?.albumArt ? (
          <Image source={{ uri: track.albumArt }} style={styles.art} />
        ) : (
          <View style={[styles.art, { backgroundColor: theme.primarySoft }]} />
        )}
        <View style={styles.info}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {track?.name ?? 'Carregando...'}
          </Text>
          <Text style={[styles.artist, { color: theme.muted }]} numberOfLines={1}>
            {track?.artist ?? ''}
          </Text>
        </View>
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Faixa anterior"
          disabled={busy}
          hitSlop={12}
          onPress={() => {
            resetErrors();
            prev.mutate();
          }}
        >
          <Ionicons name="play-skip-back" size={26} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={track?.isPlaying ? 'Pausar' : 'Tocar'}
          disabled={busy}
          onPress={() => {
            resetErrors();
            if (track?.isPlaying) pause.mutate();
            else resume.mutate();
          }}
          style={[styles.playBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons
            name={track?.isPlaying ? 'pause' : 'play'}
            size={24}
            color={theme.onPrimary}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próxima faixa"
          disabled={busy}
          hitSlop={12}
          onPress={() => {
            resetErrors();
            next.mutate();
          }}
        >
          <Ionicons name="play-skip-forward" size={26} color={theme.text} />
        </Pressable>
      </View>
      {controlError ? (
        <Text style={[styles.error, { color: theme.danger }]}>
          {friendlyError(controlError)}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hint: { flex: 1, fontSize: 14 },
  art: { width: 52, height: 52, borderRadius: 10 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  artist: { fontSize: 13, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: { borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  connectText: { fontWeight: '700' },
  error: { fontSize: 13, textAlign: 'center' },
});
