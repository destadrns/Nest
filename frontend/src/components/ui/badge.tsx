import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors select-none',
  {
    variants: {
      variant: {
        neutral: 'bg-slate-100 dark:bg-[#181D24] text-slate-700 dark:text-[#B7C0CC] border border-[#D9E1EC] dark:border-[#2A313A]',
        brand: 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12]',
        income: 'bg-[rgba(24,184,154,0.08)] dark:bg-[rgba(43,199,164,0.15)] text-[#0E8A73] dark:text-[#2BC7A4] border border-[rgba(24,184,154,0.25)] dark:border-[rgba(43,199,164,0.3)]',
        expense: 'bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.15)] text-[#C53B4B] dark:text-[#F06B78] border border-[rgba(224,90,103,0.25)] dark:border-[rgba(240,107,120,0.3)]',
        warning: 'bg-[rgba(231,168,59,0.1)] dark:bg-[rgba(232,178,74,0.15)] text-[#B3791B] dark:text-[#E8B24A] border border-[rgba(231,168,59,0.3)] dark:border-[rgba(232,178,74,0.35)]',
        info: 'bg-[rgba(53,106,230,0.08)] dark:bg-[rgba(91,140,255,0.15)] text-[#2B54BF] dark:text-[#5B8CFF] border border-[rgba(53,106,230,0.25)] dark:border-[rgba(91,140,255,0.3)]',
        outline: 'border border-[#D9E1EC] dark:border-[#2A313A] text-slate-600 dark:text-[#B7C0CC] bg-white dark:bg-[#11151B]',
      },
      size: {
        sm: 'px-1.5 py-0.2 text-[10px]',
        md: 'px-2 py-0.5 text-xs',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}
