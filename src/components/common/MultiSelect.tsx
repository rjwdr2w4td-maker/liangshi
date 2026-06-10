import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Option {
  value: string
  label: string
  subLabel?: string
}

interface MultiSelectProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export default function MultiSelect({
  options,
  value,
  onChange,
  placeholder = '请选择',
  className,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchText('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase()) ||
      (option.subLabel && option.subLabel.toLowerCase().includes(searchText.toLowerCase()))
  )

  const selectedOptions = options.filter((opt) => value.includes(opt.value))

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== optionValue))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 border border-gray-300 rounded-md cursor-pointer flex flex-wrap items-center gap-1',
          isOpen && 'ring-2 ring-blue-500',
          disabled && 'bg-gray-100 cursor-not-allowed'
        )}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          <>
            {selectedOptions.slice(0, 3).map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-sm rounded"
              >
                {opt.label}
                <button
                  onClick={(e) => handleRemove(opt.value, e)}
                  className="hover:bg-blue-200 rounded-sm"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedOptions.length > 3 && (
              <span className="text-sm text-gray-500">+{selectedOptions.length - 3}</span>
            )}
            <button
              onClick={handleClearAll}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        )}
        <ChevronDown
          className={cn('w-4 h-4 text-gray-400 ml-auto transition-transform', isOpen && 'rotate-180')}
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索..."
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 text-center">暂无数据</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    'px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center gap-2',
                    value.includes(option.value) && 'bg-blue-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 border rounded flex items-center justify-center',
                      value.includes(option.value)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    )}
                  >
                    {value.includes(option.value) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10.28 2.28L4 8.56 1.72 6.28a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06 0l7-7a.75.75 0 00-1.06-1.06z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-gray-900">{option.label}</div>
                    {option.subLabel && (
                      <div className="text-xs text-gray-500">{option.subLabel}</div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {value.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
              已选择 {value.length} 项
            </div>
          )}
        </div>
      )}
    </div>
  )
}
