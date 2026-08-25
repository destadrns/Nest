import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('rounded-md bg-[#D9E1EC]/50 dark:bg-[#181D24] animate-shimmer-smooth', className)}
      {...props}
    />
  );
}
