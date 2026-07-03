import { ButtonHTMLAttributes, forwardRef } from 'react'

/**
 * Button sesuai design.md §7.
 * variant="primary"   → CTA utama, background biru
 * variant="secondary" → outline, transparent
 * variant="danger"    → HANYA untuk aksi hapus/suspend, background merah subtle
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
}

const baseStyle =
  'inline-flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold font-body transition-all duration-150 ease-in-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'

const variantStyle: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-blue text-white hover:bg-blue-hover hover:shadow-blue focus-visible:outline-blue dark:bg-blue-dark dark:hover:bg-blue-hover-dark',
  secondary:
    'bg-transparent border border-border text-text-primary hover:bg-surface hover:border-blue dark:border-border-dark dark:text-text-primary-dark dark:hover:bg-surface-dark',
  danger:
    'bg-red-subtle text-red border border-red/30 hover:bg-red/10 dark:bg-red-subtle-dark',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variantStyle[variant]} ${className}`}
        {...props}
      />
    )
  }
)

Button.displayName = 'Button'
