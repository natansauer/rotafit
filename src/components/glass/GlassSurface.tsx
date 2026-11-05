import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

interface GlassSurfaceProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  tint?: string; // cor de destaque do vidro (ex.: cor do status)
  intensity?: number;
  opacity?: number; // 0 a 1: quanto mais alto, mais sólida a cor (menos "vidro")
  glow?: string; // cor do "glow" (sombra colorida) por baixo do vidro
}

// Propriedades de posicionamento que precisam ir para o invólucro externo
// quando há glow (o restante — padding, gap, flexDirection... — fica no vidro).
const OUTER_KEYS = [
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
  'marginHorizontal', 'marginVertical', 'alignSelf', 'flex', 'flexGrow',
  'flexShrink', 'width', 'position', 'top', 'left', 'right', 'bottom',
] as const;

// A peça-base do estilo Liquid Glass: um vidro fosco (BlurView) com um brilho
// diagonal no topo (LinearGradient) e uma borda clara fina, imitando reflexo.
// Android não desfoca de verdade como o iOS, então ali a camada de cor
// semitransparente já entrega o efeito — o brilho e a borda completam.
export function GlassSurface({
  children,
  style,
  radius = 24,
  tint,
  intensity = 40,
  opacity,
  glow,
}: GlassSurfaceProps) {
  const { theme } = useTheme();
  const glassTint = tint ?? theme.glass;

  // CORREÇÃO: no guia, a sombra (glassShadow) ia na MESMA View que tem
  // overflow: 'hidden' — no iOS isso corta a sombra, e o "glow" nunca aparecia.
  // Agora o glow fica num invólucro externo, sem overflow hidden.
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = { ...flat };
  if (glow) {
    for (const key of OUTER_KEYS) {
      if (key in inner) {
        outer[key] = inner[key];
        delete inner[key];
      }
    }
  }

  const surface = (
    <View style={[{ borderRadius: radius, overflow: 'hidden' }, inner as ViewStyle, glow && outer.flex ? { flex: 1 } : null]}>
      {/* CORREÇÃO: com intensity 0 não montamos o BlurView (economiza GPU no
          Android e evita o "véu" do blur sobre botões de cor sólida). */}
      {intensity > 0 ? (
        <BlurView
          intensity={intensity}
          tint={theme.mode === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: glassTint,
            opacity: opacity ?? (theme.mode === 'dark' ? 0.55 : 0.5),
          },
        ]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[
          // CORREÇÃO: no tema claro o brilho (branco 75%) sobre um botão de cor
          // sólida deixava o lado esquerdo rosa/desbotado ("Iniciar corrida",
          // "Sair da conta"). Em superfícies quase opacas o brilho fica sutil.
          (opacity ?? 0) >= 0.9 ? 'rgba(255, 255, 255, 0.16)' : theme.glassHighlight,
          'transparent',
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.7, y: 0.8 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: radius, borderWidth: 1, borderColor: theme.glassBorder },
        ]}
      />
      {children}
    </View>
  );

  if (!glow) return surface;
  return (
    <View
      style={[
        outer as ViewStyle,
        { borderRadius: radius },
        glassShadow(glow),
        Platform.OS === 'android' && glow !== 'transparent'
          ? { backgroundColor: glow }
          : null,
      ]}
    >
      {surface}
    </View>
  );
}

// Sombra colorida por baixo do vidro — o "glow" que dá profundidade ao efeito.
export function glassShadow(color: string): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: color,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: color === 'transparent' ? 0 : 6 },
    default: {
      shadowColor: color,
      shadowOpacity: 0.35,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
    },
  }) as ViewStyle;
}
