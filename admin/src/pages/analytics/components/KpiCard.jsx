import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { cn } from '../../../lib/utils';

const MotionDiv = motion.div;

export default function KpiCard({ label, value, sub, changePct, icon: Icon, color = '#8b5cf6', loading, onClick, delay = 0 }) {
  const trend = changePct === null || changePct === undefined ? null : changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'flat';
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="h-full"
    >
      <Card
        className={cn('h-full overflow-hidden relative transition-shadow', onClick && 'cursor-pointer hover:shadow-lg hover:shadow-primary/5')}
        onClick={onClick}
      >
        <CardContent className="p-4 sm:p-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-3 w-16" />
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
                  <p className="mt-1.5 text-2xl font-bold tracking-tight text-foreground leading-none truncate">{value}</p>
                </div>
                {Icon && (
                  <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: `${color}1a`, color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 min-h-[18px]">
                {trend && (
                  <span className={cn(
                    'inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded',
                    trend === 'up' && 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                    trend === 'down' && 'text-red-600 dark:text-red-400 bg-red-500/10',
                    trend === 'flat' && 'text-muted-foreground bg-muted/60'
                  )}>
                    {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : trend === 'down' ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                    {Math.abs(changePct).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%
                  </span>
                )}
                {sub && <span className="text-xs text-muted-foreground truncate">{sub}</span>}
              </div>
            </>
          )}
        </CardContent>
        <div className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: color, opacity: 0.7 }} />
      </Card>
    </MotionDiv>
  );
}
