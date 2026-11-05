import { QueryClient } from '@tanstack/react-query';

// Arquivo citado no guia (AuthContext e _layout importam) mas cujo código não
// aparecia. Um único QueryClient para o app inteiro.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
