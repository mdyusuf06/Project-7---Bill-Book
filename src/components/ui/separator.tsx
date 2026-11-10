import * as React from 'react';
import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { dashed?: boolean }
>(({ className, dashed = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'w-full border-t',
      dashed ? 'border-dashed' : 'border-solid',
      'border-slate-200 dark:border-zinc-800',
      className
    )}
    {...props}
  />
));
Separator.displayName = 'Separator';

export { Separator };

