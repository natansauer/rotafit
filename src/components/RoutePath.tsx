import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { GlassSurface } from '@/components/glass/GlassSurface';
import { radius, spacing, useTheme } from '@/theme';
import type { RoutePoint } from '@/types';

interface RoutePathProps {
  route: RoutePoint[];
  height?: number;
  live?: boolean; // true na corrida ativa: mostra um halo no ponto atual
}

// Suaviza a linha ligando os pontos com curvas (Catmull-Rom → Bézier).
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

// Traçado da corrida desenhado à mão (sem mapa nem chave de API).
export function RoutePath({ route, height = 240, live = false }: RoutePathProps) {
  const { theme } = useTheme();
  // CORREÇÃO: id único por instância. Com o id fixo "trail" do guia, duas
  // rotas na mesma tela podiam compartilhar (ou perder) o gradiente.
  const gradientId = `trail-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const W = 340;
  const H = height;

  if (route.length < 2) {
    return (
      <GlassSurface radius={radius.lg} style={[styles.wrap, { height }]} intensity={20}>
        <View style={styles.emptyState}>
          <Ionicons name="location-outline" size={28} color={theme.muted} />
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            {live ? 'Localizando... ande um pouco para ver a rota' : 'Sem pontos de rota'}
          </Text>
        </View>
      </GlassSurface>
    );
  }

  // CORREÇÃO: um grau de longitude "encolhe" com a latitude (cos φ). Sem esse
  // fator, o traçado sai esticado na horizontal (pouco em Brasília, muito no Sul).
  const meanLat = route.reduce((sum, p) => sum + p.lat, 0) / route.length;
  const kx = Math.cos((meanLat * Math.PI) / 180);
  const xs = route.map((p) => p.lng * kx);
  const ys = route.map((p) => p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 32;
  const spanX = maxX - minX || 0.0003;
  const spanY = maxY - minY || 0.0003;
  const scale = Math.min((W - pad * 2) / spanX, (H - pad * 2) / spanY);
  const offX = (W - spanX * scale) / 2;
  const offY = (H - spanY * scale) / 2;

  const points = route.map((p, i) => ({
    x: offX + (xs[i] - minX) * scale,
    y: H - offY - (p.lat - minY) * scale, // inverte y: latitude cresce para cima
  }));
  const d = smoothPath(points);
  const start = points[0];
  const end = points[points.length - 1];

  // Pontinhos de fundo, como um grid de mapa estilizado — puramente decorativo.
  const dots: { x: number; y: number }[] = [];
  for (let x = pad; x < W - pad + 1; x += 28) {
    for (let y = pad; y < H - pad + 1; y += 28) dots.push({ x, y });
  }

  return (
    <GlassSurface radius={radius.lg} style={[styles.wrap, { height }]} intensity={20}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* CORREÇÃO: gradientUnits="userSpaceOnUse". Com o padrão
              (objectBoundingBox), uma rota perfeitamente reta (caixa com altura
              ou largura zero) fazia o traço SUMIR. */}
          <SvgGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={String(W)}
            y2={String(H)}
          >
            <Stop offset="0" stopColor={theme.success} stopOpacity={1} />
            <Stop offset="1" stopColor={theme.primary} stopOpacity={1} />
          </SvgGradient>
        </Defs>
        {dots.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={1.1} fill={theme.muted} opacity={0.18} />
        ))}
        <Path
          d={d}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle
          cx={start.x}
          cy={start.y}
          r={7}
          fill={theme.success}
          stroke={theme.surface}
          strokeWidth={2}
        />
        {live ? (
          <>
            <Circle cx={end.x} cy={end.y} r={11} fill={theme.primary} opacity={0.25} />
            <Circle
              cx={end.x}
              cy={end.y}
              r={6}
              fill={theme.primary}
              stroke={theme.surface}
              strokeWidth={2}
            />
          </>
        ) : (
          <Circle
            cx={end.x}
            cy={end.y}
            r={7}
            fill={theme.danger}
            stroke={theme.surface}
            strokeWidth={2}
          />
        )}
      </Svg>
      <LinearGradient
        colors={['transparent', theme.mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.06)']}
        style={styles.floorShadow}
        pointerEvents="none"
      />
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', justifyContent: 'center' },
  emptyState: { alignItems: 'center', gap: spacing.xs, padding: spacing.lg },
  emptyText: { fontSize: 13, textAlign: 'center' },
  floorShadow: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 },
});
