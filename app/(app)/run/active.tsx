import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { RoutePath } from '@/components/RoutePath';
import { SpotifyPlayerCard } from '@/components/spotify/SpotifyPlayerCard';
import { useNowPlaying } from '@/hooks/useSpotifyPlayer';
import { useRunTracker } from '@/hooks/useRunTracker';
import { useSaveRun } from '@/hooks/useRuns';
import { radius, spacing, useTheme } from '@/theme';
import type { SaveRunInput } from '@/types';
import { friendlyError } from '@/utils/errors';
import { formatDistance, formatDuration, formatPace } from '@/utils/geo';
import type { IconName } from '@/utils/icons';

// Tela cheia (sem abas): o traçado e os números ocupam o centro, e
// Pausar/Retomar/Finalizar ficam sempre visíveis, em vidro.
export default function ActiveRunScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tracker = useRunTracker();
  const saveRun = useSaveRun();
  const { data: nowPlaying } = useNowPlaying();
  const [starting, setStarting] = useState(false);
  const running = tracker.status === 'active' || tracker.status === 'paused';

  async function handleStart() {
    setStarting(true);
    const problem = await tracker.start();
    setStarting(false);
    if (problem === 'permission') {
      Alert.alert(
        'Permissão de localização necessária',
        'O RotaFit precisa da sua localização para registrar a rota da corrida. ' +
          'Ative a permissão nas configurações do aparelho.',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: 'Abrir configurações', onPress: () => Linking.openSettings() },
        ],
      );
    } else if (problem === 'services-off') {
      Alert.alert('GPS desligado', 'Ative a localização do aparelho e tente de novo.');
    } else if (problem === 'error') {
      Alert.alert('Não foi possível iniciar', 'O GPS não respondeu. Tente novamente.');
    }
  }

  // CORREÇÃO: se o salvamento falhasse (ex.: sem internet), o guia mostrava um
  // alerta e a corrida se perdia. Agora dá para tentar de novo com os mesmos dados.
  function persist(input: SaveRunInput) {
    saveRun.mutate(input, {
      onSuccess: (id) => router.replace(`/run/${id}`),
      onError: (e) =>
        Alert.alert('Não foi possível salvar', friendlyError(e), [
          { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
          { text: 'Tentar de novo', onPress: () => persist(input) },
        ]),
    });
  }

  function handleFinish() {
    Alert.alert('Finalizar corrida', 'Deseja encerrar e salvar esta corrida?', [
      { text: 'Continuar correndo', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: () => {
          const input = tracker.finish(
            nowPlaying?.name ? `${nowPlaying.name} — ${nowPlaying.artist}` : null,
          );
          if (!input || input.distanceMeters === 0) {
            Alert.alert(
              'Corrida não salva',
              'Nenhuma distância foi registrada, então não há o que salvar.',
            );
            router.back();
            return;
          }
          persist(input);
        },
      },
    ]);
  }

  function handleDiscard() {
    Alert.alert('Descartar corrida', 'Os dados desta corrida serão perdidos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          tracker.reset();
          router.back();
        },
      },
    ]);
  }

  // CORREÇÃO: o botão "voltar" do Android saía da corrida sem perguntar e o
  // percurso era perdido. Agora ele pede confirmação, como "Descartar".
  const discardRef = useRef(handleDiscard);
  discardRef.current = handleDiscard;
  useEffect(() => {
    if (!running) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      discardRef.current();
      return true;
    });
    return () => sub.remove();
  }, [running]);

  if (tracker.status === 'idle') {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="walk" size={64} color={theme.primary} />
        <Text style={[styles.readyTitle, { color: theme.text }]}>Pronto para começar?</Text>
        <Text style={[styles.readyText, { color: theme.muted }]}>
          Vamos usar sua localização para acompanhar a rota, a distância e o ritmo em
          tempo real.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={handleStart}
          disabled={starting}
          style={styles.startWrap}
        >
          <GlassSurface
            tint={theme.primary}
            radius={radius.pill}
            style={styles.startBtn}
            intensity={0}
            opacity={0.94}
            glow={theme.primary}
          >
            <Text style={[styles.startText, { color: theme.onPrimary }]}>
              {starting ? 'Localizando...' : 'Começar corrida'}
            </Text>
          </GlassSurface>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={[styles.cancel, { color: theme.muted }]}>Cancelar</Text>
        </Pressable>
      </View>
    );
  }

  if (tracker.status === 'finished') {
    // Entre o "Finalizar" e a abertura do resumo (salvando no Supabase).
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="cloud-upload-outline" size={48} color={theme.primary} />
        <Text style={[styles.readyText, { color: theme.muted }]}>Salvando corrida...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.md,
          gap: spacing.md,
        }}
      >
        <RoutePath route={tracker.route} height={260} live />

        <GlassSurface radius={radius.lg} style={styles.statsCard} intensity={30}>
          <Stat label="Distância" value={formatDistance(tracker.distanceMeters)} big />
          <View style={styles.statsRow}>
            <Stat label="Tempo" value={formatDuration(tracker.elapsedSeconds)} />
            <Stat label="Ritmo" value={formatPace(tracker.pace)} />
          </View>
          {tracker.status === 'paused' ? (
            <Text style={[styles.pausedTag, { color: theme.primary }]}>PAUSADO</Text>
          ) : null}
        </GlassSurface>

        <SpotifyPlayerCard />

        <View style={styles.controls}>
          {tracker.status === 'active' ? (
            <ControlButton
              icon="pause"
              label="Pausar"
              onPress={tracker.pause}
              tint={theme.primary}
            />
          ) : (
            <ControlButton
              icon="play"
              label="Retomar"
              onPress={tracker.resume}
              tint={theme.primary}
            />
          )}
          <ControlButton
            icon="stop"
            label="Finalizar"
            onPress={handleFinish}
            tint={theme.danger}
          />
        </View>

        <Pressable accessibilityRole="button" onPress={handleDiscard}>
          <Text style={[styles.discard, { color: theme.muted }]}>Descartar corrida</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[big ? styles.statBig : styles.statValue, { color: theme.text }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function ControlButton({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tint: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.controlWrap}
    >
      <GlassSurface
        tint={tint}
        radius={radius.pill}
        style={styles.controlBtn}
        intensity={0}
        opacity={0.94}
        glow={tint}
      >
        <Ionicons name={icon} size={28} color={theme.onPrimary} />
      </GlassSurface>
      <Text style={[styles.controlLabel, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  readyTitle: { fontSize: 24, fontWeight: '800', marginTop: spacing.md },
  readyText: { fontSize: 15, textAlign: 'center' },
  startWrap: { marginTop: spacing.lg, alignSelf: 'stretch' },
  startBtn: { minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  startText: { fontSize: 17, fontWeight: '800' },
  cancel: { marginTop: spacing.md, fontSize: 15 },
  screen: { flex: 1 },
  statsCard: { padding: spacing.lg, gap: spacing.sm },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statBig: { fontSize: 44, fontWeight: '800', textAlign: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  pausedTag: { textAlign: 'center', fontWeight: '800', letterSpacing: 1 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  controlWrap: { alignItems: 'center', gap: 6 },
  controlBtn: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  controlLabel: { fontSize: 13, fontWeight: '600' },
  discard: { textAlign: 'center', marginTop: spacing.sm, fontSize: 14 },
});
