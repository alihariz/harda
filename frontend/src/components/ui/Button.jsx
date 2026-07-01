// Shared button primitive for the HARDA redesign.
// variant: primary (orange) · secondary (white/outline) · danger · ghost
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-xl cursor-pointer ' +
  'transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0'

const SIZES = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2.5',
  lg: 'text-base px-5 py-3',
}

const VARIANTS = {
  primary:
    'bg-orange-500 text-white shadow-[0_6px_14px_-4px_rgba(234,88,12,0.45)] ' +
    'hover:bg-orange-600 hover:-translate-y-0.5',
  secondary:
    'bg-white text-slate-800 border border-slate-300 shadow-card ' +
    'hover:border-blue-500 hover:text-blue-700 hover:-translate-y-0.5',
  danger: 'bg-red-600 text-white hover:bg-red-500 hover:-translate-y-0.5',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  as = 'button',
  className = '',
  children,
  ...props
}) {
  const Comp = as
  return (
    <Comp className={`${BASE} ${SIZES[size]} ${VARIANTS[variant] ?? VARIANTS.primary} ${className}`} {...props}>
      {children}
    </Comp>
  )
}
