// Surface card primitive. Pass `hover` for the lift-on-hover interaction.
export default function Card({ hover = false, className = '', children, ...props }) {
  return (
    <div
      className={
        'bg-white rounded-2xl border border-slate-100 shadow-card ' +
        (hover ? 'transition-all duration-200 hover:shadow-lift hover:-translate-y-1 ' : '') +
        className
      }
      {...props}
    >
      {children}
    </div>
  )
}
