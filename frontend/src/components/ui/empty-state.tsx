import { AlertCircle, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#11151B] p-8 text-center sm:p-12',
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F0F4F8] dark:bg-[#181D24] text-[#667085] dark:text-[#B7C0CC] mb-3.5">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <h4 className="text-sm font-semibold text-[#101828] dark:text-[#F3F4F6]">{title}</h4>
      <p className="mt-1 max-w-sm text-xs text-[#475467] dark:text-[#B7C0CC] leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="outline" className="mt-4">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
