import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

// Nome de ícone válido do Ionicons (o TypeScript acusa nomes inexistentes).
export type IconName = ComponentProps<typeof Ionicons>['name'];
