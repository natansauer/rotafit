import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { RoutePath } from '@/components/RoutePath';
import { Screen } from '@/components/Screen';
import { ErrorState, LoadingView } from '@/components/StateViews';
import { useDeleteRun, useRun } from '@/hooks/useRuns';
import { spacing, useTheme } from '@/theme';
import { friendlyError } from '@/utils/errors';
import { estimateCalories, formatDistance, formatDuration, formatPace } from '@/utils/geo';

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' });
}

export default function RunDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { data: run, isLoading, isError, error, refetch } = useRun(id);
  const del = useDeleteRun();

  if (isLoading || del.isSuccess) return <LoadingView />;
  if (isError || !run)
    return <ErrorState message={friendlyError(error)} onRetry={refetch} />;

  function confirmDelete(runId: string) {
    Alert.alert('Excluir corrida', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () =>
          del.mutate(runId, {
            onSuccess: () => router.back(),
            onError: (e) => Alert.alert('Não foi possível excluir', friendlyError(e)),
          }),
      },
    ]);
  }

  return (
    <Screen scroll edges={['bottom', 'left', 'right']}>
      <Text style={[styles.date, { color: theme.muted }]}>
        {formatFullDate(run.startedAt)}
      </Text>
      <Text style={[styles.distance, { color: theme.text }]}>
        {formatDistance(run.distanceMeters)}
      </Text>

      {/* CORREÇÃO: o guia punha o RoutePath (que já é vidro) dentro de outro
          Card de vidro — vidro sobre vidro, com borda e brilho duplicados. */}
      <View style={styles.mapWrap}>
        <RoutePath route={run.route} height={220} />
      </View>

      <Card style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Stat label="Tempo" value={formatDuration(run.durationSeconds)} />
          <Stat label="Ritmo médio" value={formatPace(run.avgPaceSecPerKm)} />
          <Stat
            label="Calorias"
            value={`${estimateCalories(run.distanceMeters, run.durationSeconds)} kcal`}
          />
        </View>
      </Card>

      {run.spotifyTrackName ? (
        <Card style={styles.trackCard}>
          <Ionicons name="musical-notes" size={20} color={theme.primary} />
          <Text style={[styles.track, { color: theme.text }]} numberOfLines={1}>
            {run.spotifyTrackName}
          </Text>
        </Card>
      ) : null}

      <Button
        title="Excluir corrida"
        variant="danger"
        onPress={() => confirmDelete(run.id)}
        loading={del.isPending}
        style={styles.deleteBtn}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  date: { fontSize: 14 },
  distance: { fontSize: 36, fontWeight: '800', marginBottom: spacing.md },
  mapWrap: { marginBottom: spacing.md },
  statsCard: { marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 2 },
  trackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  track: { flex: 1, fontSize: 14, fontWeight: '600' },
  deleteBtn: { marginTop: spacing.sm },
});
