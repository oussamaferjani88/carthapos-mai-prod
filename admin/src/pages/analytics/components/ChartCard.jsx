import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';

const MotionDiv = motion.div;

export default function ChartCard({ title, description, loading, children, actions, delay = 0, className = '' }) {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="h-full"
    >
      <Card className={`h-full ${className}`}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description && <CardDescription className="text-xs mt-0.5">{description}</CardDescription>}
            </div>
            {actions}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-[220px] w-full rounded-md" />
            </div>
          ) : children}
        </CardContent>
      </Card>
    </MotionDiv>
  );
}
