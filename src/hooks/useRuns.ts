import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { deleteRun, getRun, getWeeklyStats, listRuns, saveRun } from '@/services/runs';
import { averagePaceSecPerKm } from '@/utils/geo';
import type { SaveRunInput } from '@/types';

// CORREÇÃO: as chaves incluem o id do usuário. Assim, ao trocar de conta, nunca
// aparece (nem por um instante) o cache da conta anterior.
export function useRuns() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['runs', user?.id, 'list'],
    queryFn: listRuns,
    enabled: Boolean(user),
  });
}

export function useRun(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['runs', user?.id, 'detail', id],
    queryFn: () => getRun(id as string),
    enabled: Boolean(id && user),
  });
}

export function useWeeklyStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['runs', user?.id, 'weekly-stats'],
    queryFn: getWeeklyStats,
    enabled: Boolean(user),
  });
}

export function useSaveRun() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveRunInput) => {
      if (!user) throw new Error('Faça login para salvar a corrida.');
      const pace = averagePaceSecPerKm(input.distanceMeters, input.durationSeconds);
      return saveRun(input, user.id, pace);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['runs'] }),
  });
}

export function useDeleteRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRun(id),
    // CORREÇÃO: no guia, invalidar ['runs'] também recarregava o RESUMO da
    // corrida recém-excluída (a tela ainda está montada durante o "voltar"),
    // e piscava um erro "no rows returned". Pulamos a consulta daquele id.
    onSuccess: (_data, id) =>
      queryClient.invalidateQueries({
        queryKey: ['runs'],
        predicate: (q) => !q.queryKey.includes(id),
      }),
  });
}
