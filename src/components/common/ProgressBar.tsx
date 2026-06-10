import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  className?: string
}

export default function ProgressBar({ value, max = 100, showLabel = true, className }: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const getColor = () => {
    if (percentage < 30) return 'bg-red-500'
    if (percentage < 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <>
            <span className="text-sm font-medium text-gray-700">进度</span>
            <span className="text-sm font-medium text-gray-700">{percentage.toFixed(0)}%</span>
          </>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={cn('h-2.5 rounded-full transition-all duration-500 ease-out', getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
