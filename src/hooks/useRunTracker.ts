import * as Location from 'expo-location';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { averagePaceSecPerKm, simplifyRoute } from '@/utils/geo';
import { elapsedSeconds, initialTrackerState, trackerReducer } from '@/utils/tracker';
import type { SaveRunInput } from '@/types';

// Resultado de start(): null = começou; string = motivo para mostrar ao usuário.
export type StartError = 'permission' | 'services-off' | 'error';

// Liga o reducer puro (utils/tracker.ts) ao GPS de verdade e a um relógio de
// 1 em 1 segundo. A lógica de "o que fazer com cada evento" já está testada.
export function useRunTracker() {
  const [state, dispatch] = useReducer(trackerReducer, initialTrackerState);
  const [now, setNow] = useState(() => Date.now());
  const [permissionDenied, setPermissionDenied] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  // CORREÇÃO: "geração" da escuta. Se o usuário pausar enquanto
  // watchPositionAsync ainda está resolvendo, a inscrição que chega atrasada é
  // descartada (no guia ela ficava ativa, gastando bateria e "vazando").
  const generation = useRef(0);

  useEffect(() => {
    if (state.status !== 'active') return undefined;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  const stopWatching = useCallback(() => {
    generation.current += 1;
    subscription.current?.remove();
    subscription.current = null;
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  const startWatching = useCallback(async () => {
    stopWatching(); // CORREÇÃO: nunca duas inscrições ao mesmo tempo
    const myGeneration = generation.current;
    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (loc) =>
        dispatch({
          type: 'ADD_POINT',
          now: loc.timestamp,
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        }),
    );
    if (myGeneration !== generation.current) {
      sub.remove(); // pausaram/finalizaram enquanto esperávamos
      return;
    }
    subscription.current = sub;
  }, [stopWatching]);

  const start = useCallback(async (): Promise<StartError | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return 'permission';
      }
      setPermissionDenied(false);
      // CORREÇÃO: com o GPS do aparelho desligado, watchPositionAsync lançava
      // uma exceção não tratada e a tela ficava presa em "Localizando...".
      if (!(await Location.hasServicesEnabledAsync())) return 'services-off';
      dispatch({ type: 'START', now: Date.now() });
      await startWatching();
      return null;
    } catch {
      stopWatching();
      dispatch({ type: 'RESET' });
      return 'error';
    }
  }, [startWatching, stopWatching]);

  const pause = useCallback(() => {
    stopWatching();
    dispatch({ type: 'PAUSE', now: Date.now() });
  }, [stopWatching]);

  const resume = useCallback(async () => {
    dispatch({ type: 'RESUME', now: Date.now() });
    try {
      await startWatching();
    } catch {
      // GPS indisponível ao retomar: o cronômetro segue e o próximo
      // pausar/retomar tenta de novo.
    }
  }, [startWatching]);

  // Encerra a corrida e devolve os dados prontos para salvar no Supabase.
  const finish = useCallback(
    (spotifyTrackName: string | null): SaveRunInput | null => {
      stopWatching();
      const at = Date.now();
      dispatch({ type: 'FINISH', now: at });
      if (state.startedAt === null) return null;
      const finished = trackerReducer(state, { type: 'FINISH', now: at });
      // CORREÇÃO: a coluna duration_seconds exige > 0 no banco. Uma corrida de
      // menos de meio segundo arredondava para 0 e o insert era recusado.
      const durationSeconds = Math.max(1, Math.round(elapsedSeconds(finished, at)));
      return {
        startedAt: new Date(state.startedAt).toISOString(),
        endedAt: new Date(at).toISOString(),
        distanceMeters: Math.round(state.distanceMeters * 100) / 100,
        durationSeconds,
        route: simplifyRoute(state.route),
        spotifyTrackName,
      };
    },
    [state, stopWatching],
  );

  const reset = useCallback(() => {
    stopWatching();
    dispatch({ type: 'RESET' });
  }, [stopWatching]);

  const seconds = elapsedSeconds(state, now);

  return {
    status: state.status,
    route: state.route,
    distanceMeters: state.distanceMeters,
    elapsedSeconds: seconds,
    pace: averagePaceSecPerKm(state.distanceMeters, seconds),
    permissionDenied,
    start,
    pause,
    resume,
    finish,
    reset,
  };
}
