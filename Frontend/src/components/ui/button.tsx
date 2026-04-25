import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          {
            'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-float hover:from-brand-600 hover:to-brand-700 hover:shadow-lg hover:-translate-y-px': variant === 'default',
            'border border-white/10 bg-white/[0.04] hover:bg-white/[0.02] hover:border-white/15 hover:shadow text-neutral-200 shadow-card': variant === 'outline',
            'hover:bg-neutral-100 hover:text-white': variant === 'ghost',
            'bg-danger-400/100 text-white hover:bg-danger-600 shadow-card hover:shadow-float hover:-translate-y-px': variant === 'destructive',
            'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-float hover:from-success-600 hover:to-success-700 hover:shadow-lg hover:-translate-y-px': variant === 'success',
            'h-10 px-4 py-2': size === 'default',
            'h-9 rounded-lg px-3': size === 'sm',
            'h-11 rounded-xl px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
