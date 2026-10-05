import type { ButtonHTMLAttributes } from 'react'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ variant = 'secondary', size = 'default', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'btn btn-primary',
    secondary: 'btn',
    ghost: 'btn-link',
    danger: 'btn-link text-bad',
    default: 'btn btn-primary',
    outline: 'btn',
  }
  const sizes = { default: '', sm: 'text-xs px-2 py-1', lg: 'px-5 py-3', icon: 'size-9 p-0' }
  return <button {...props} className={`${styles[variant]} ${sizes[size]} ${className}`} />
}
