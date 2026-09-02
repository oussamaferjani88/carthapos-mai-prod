import type { BadgeProps } from '@/components/ui/badge';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

/**
 * Maps a normalized POS build/licence status label to a CarthaPos Badge
 * variant + French label. Shared by the client dashboard and "Mes Projets".
 */
export const posStatusMeta = (status: string): { label: string; variant: BadgeVariant } => {
  switch (status) {
    case 'building':
      return { label: 'Construction…', variant: 'info' };
    case 'ready':
      return { label: 'Prête', variant: 'success' };
    case 'active':
      return { label: 'Active', variant: 'success' };
    case 'failed':
      return { label: 'Échec', variant: 'destructive' };
    case 'cleaned':
      return { label: 'Nettoyée', variant: 'neutral' };
    default:
      return { label: 'Inactive', variant: 'neutral' };
  }
};
