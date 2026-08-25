import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'btn-tactile inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#101828] dark:focus-visible:ring-[#5B8CFF] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E5E7EB] active:bg-[#0A0E17] shadow-xs',
        accent: 'bg-[#356AE6] dark:bg-[#5B8CFF] text-white hover:bg-[#2855C4] dark:hover:bg-[#4A7CE6] active:bg-[#1D4099] shadow-xs',
        teal: 'bg-[#18B89A] dark:bg-[#2BC7A4] text-white hover:bg-[#13987E] dark:hover:bg-[#22A789] active:bg-[#0E7763] shadow-xs',
        secondary: 'bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6] hover:bg-[#E2E8F0] dark:hover:bg-[#20262E] active:bg-[#CBD5E1]',
        outline: 'border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#F3F4F6] hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] hover:border-[#CBD5E1] dark:hover:border-[#3B4450] shadow-2xs',
        ghost: 'text-[#475467] dark:text-[#B7C0CC] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]',
        danger: 'bg-[#E05A67] dark:bg-[#F06B78] text-white hover:bg-[#C53B4B] dark:hover:bg-[#D95562] active:bg-[#A82B3A] shadow-xs',
        dangerOutline: 'border border-[#E05A67]/40 dark:border-[#F06B78]/40 bg-white dark:bg-[#11151B] text-[#E05A67] dark:text-[#F06B78] hover:bg-[#E05A67]/10 dark:hover:bg-[#F06B78]/10 shadow-2xs',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        icon: 'h-9 w-9 p-0',
        iconSm: 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
        <span className={cn('inline-flex items-center gap-1.5', isLoading && 'opacity-90')}>
          {children}
        </span>
      </button>
    );
  }
);
Button.displayName = 'Button';
