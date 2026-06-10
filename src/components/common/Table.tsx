import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { ReactNode } from 'react'

interface Column<T> {
  key: string
  title: string
  render?: (record: T, index: number) => ReactNode
  width?: string | number
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey?: string
  loading?: boolean
  emptyText?: string
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number) => void
  }
  className?: string
}

export default function Table<T extends Record<string, any>>({
  columns,
  data,
  rowKey = 'id',
  loading = false,
  emptyText = '暂无数据',
  pagination,
  className,
}: TableProps<T>) {
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0

  return (
    <div className={cn('bg-white rounded-lg shadow-md overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="ml-2 text-gray-500">加载中...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <Inbox className="w-12 h-12 mb-2" />
                    <span>{emptyText}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((record, index) => (
                <tr key={record[rowKey] || index} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render ? col.render(record, index) : record[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            显示第 {(pagination.current - 1) * pagination.pageSize + 1} -{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onChange(pagination.current - 1)}
              disabled={pagination.current === 1}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-700">
              {pagination.current} / {totalPages}
            </span>
            <button
              onClick={() => pagination.onChange(pagination.current + 1)}
              disabled={pagination.current === totalPages}
              className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
