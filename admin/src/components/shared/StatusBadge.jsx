import { cn } from '@/lib/utils';

const TONES = {
  neutral: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
  cyan: 'bg-cyan-50 text-cyan-700',
};

const DOTS = {
  neutral: 'bg-gray-400',
  info: 'bg-blue-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  violet: 'bg-violet-500',
  cyan: 'bg-cyan-500',
};

/**
 * One consistent status badge across the whole admin panel.
 * Usage: <StatusBadge label="Publié" tone="success" />
 */
export default function StatusBadge({ label, tone = 'neutral', dot = true, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone] || DOTS.neutral)} />}
      {label}
    </span>
  );
}
