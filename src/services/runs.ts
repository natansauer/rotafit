import { supabase } from '@/lib/supabase';
import type { Run, SaveRunInput } from '@/types';

interface RunRow {
  id: string;
  started_at: string;
  ended_at: string;
  distance_meters: number | string;
  duration_seconds: number;
  avg_pace_sec_per_km: number | string | null;
  route: unknown;
  spotify_track_name: string | null;
}

function toRun(row: RunRow): Run {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    distanceMeters: Number(row.distance_meters),
    durationSeconds: row.duration_seconds,
    avgPaceSecPerKm:
      row.avg_pace_sec_per_km === null ? null : Number(row.avg_pace_sec_per_km),
    route: Array.isArray(row.route) ? (row.route as Run['route']) : [],
    spotifyTrackName: row.spotify_track_name,
  };
}

// O histórico não precisa da rota inteira de cada corrida: pedimos só as colunas
// da lista (economia de dados). A rota vem em getRun, no resumo.
const LIST_COLUMNS =
  'id, started_at, ended_at, distance_meters, duration_seconds, avg_pace_sec_per_km, spotify_track_name';

export async function listRuns(): Promise<Run[]> {
  const { data, error } = await supabase
    .from('runs')
    .select(LIST_COLUMNS)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as RunRow[]).map((row) => toRun({ ...row, route: [] }));
}

export async function getRun(id: string): Promise<Run> {
  const { data, error } = await supabase.from('runs').select('*').eq('id', id).single();
  if (error) throw error;
  return toRun(data as RunRow);
}

// A coluna avg_pace_sec_per_km é numeric(8,2): no máximo 999999,99.
const MAX_PACE = 999_999;

// O usuário escreve direto; a política de RLS confere que user_id é dele.
export async function saveRun(
  input: SaveRunInput,
  userId: string,
  avgPace: number | null,
): Promise<string> {
  // CORREÇÃO: andar 1 cm em 1 hora daria um ritmo enorme e o Postgres recusaria
  // ("numeric field overflow"). Nesses casos guardamos o ritmo como nulo.
  const pace =
    avgPace !== null && Number.isFinite(avgPace) && avgPace > 0 && avgPace <= MAX_PACE
      ? Math.round(avgPace * 100) / 100
      : null;
  const { data, error } = await supabase
    .from('runs')
    .insert({
      user_id: userId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      distance_meters: input.distanceMeters,
      duration_seconds: input.durationSeconds,
      avg_pace_sec_per_km: pace,
      route: input.route,
      spotify_track_name: input.spotifyTrackName,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function deleteRun(id: string): Promise<void> {
  const { error } = await supabase.from('runs').delete().eq('id', id);
  if (error) throw error;
}

export interface WeeklyStats {
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  runCount: number;
}

export async function getWeeklyStats(): Promise<WeeklyStats> {
  const { data, error } = await supabase.rpc('weekly_stats').single();
  if (error) throw error;
  const row = data as {
    total_distance_meters: number | string;
    total_duration_seconds: number | string;
    run_count: number | string;
  };
  return {
    totalDistanceMeters: Number(row.total_distance_meters),
    totalDurationSeconds: Number(row.total_duration_seconds),
    runCount: Number(row.run_count),
  };
}
