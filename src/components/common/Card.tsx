import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export default function Card({ title, children, actions, className }: CardProps) {
  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          {title && <div className="text-lg font-semibold text-gray-900">{title}</div>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
    </div>
  )
}
