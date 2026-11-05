import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { SpotifyProvider } from '@/context/SpotifyContext';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider, useTheme } from '@/theme';

// Lê o tema (só possível dentro do ThemeProvider) para a barra de status e
// para o fundo da raiz — evita o "flash" branco entre telas no tema escuro.
function Chrome({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.statusBar} />
      {children}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SpotifyProvider>
              <Chrome>
                <Stack screenOptions={{ headerShown: false }} />
              </Chrome>
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
