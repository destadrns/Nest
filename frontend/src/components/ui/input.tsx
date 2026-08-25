import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full relative">
        <input
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] placeholder-[#98A2B3] dark:placeholder-[#858F9D] shadow-2xs transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] file:border-0 file:bg-transparent file:text-xs file:font-medium focus-visible:outline-none focus-visible:border-[#101828] dark:focus-visible:border-[#5B8CFF] focus-visible:ring-2 focus-visible:ring-[#101828]/10 dark:focus-visible:ring-[#5B8CFF]/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[#F6F8FB] dark:disabled:bg-[#0A0D12]',
            error &&
              'border-[#E05A67] dark:border-[#F06B78] focus-visible:border-[#E05A67] dark:focus-visible:border-[#F06B78] focus-visible:ring-[#E05A67]/20',
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-[11px] font-medium text-[#C53B4B] dark:text-[#F06B78] animate-page-enter">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
