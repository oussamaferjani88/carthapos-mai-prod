import { cn } from '@/lib/utils';

/**
 * Shared page header following the Shopify-style pattern:
 *
 *   Page title                       [Primary action]
 *   Short description
 */
export default function PageHeader({ title, description, actions, className }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
