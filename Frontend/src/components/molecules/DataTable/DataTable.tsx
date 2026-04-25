import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  FileX,
} from 'lucide-react';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  onRowClick?: (row: TData) => void;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading = false,
  onRowClick,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue = '',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = useState(searchValue);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const memoColumns = useMemo(() => columns, [columns]);
  const memoData = useMemo(() => data, [data]);

  const table = useReactTable({
    data: memoData,
    columns: memoColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: 'includesString',
    state: {
      sorting,
      pagination,
      globalFilter,
    },
  });

  useEffect(() => {
    if (searchValue !== globalFilter) {
      setGlobalFilter(searchValue);
    }
  }, [searchValue]);

  const handleSearch = (value: string) => {
    setGlobalFilter(value);
    onSearch?.(value);
  };

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startRow = totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const endRow = Math.min(startRow + pagination.pageSize - 1, totalRows);

  return (
    <div className="flex flex-col gap-5">
      {/* Search Bar */}
      {onSearch && (
        <div className="relative">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-12 rounded-2xl pr-12"
            leftElement={<Search className="w-5 h-5" />}
            rightElement={globalFilter ? (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="rounded-full bg-white/8 p-1.5 text-neutral-500 transition-colors hover:bg-white/12 hover:text-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          />
        </div>
      )}

      {/* Table Container */}
      <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-card">
        {/* Subtle gradient overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />
        
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className="h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wider text-neutral-500 [&:has([role=checkbox])]:pr-0"
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <div className="w-1 h-4 rounded-full bg-gradient-to-b from-brand-500 to-brand-600" />
                        )}
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 hover:text-brand-600 transition-colors group"
                        >
                          {header.isPlaceholder ? null : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="p-0.5 rounded transition-colors">
                              {{
                                asc: <ArrowUp className="w-3.5 h-3.5 text-brand-600" />,
                                desc: <ArrowDown className="w-3.5 h-3.5 text-brand-600" />,
                              }[header.column.getIsSorted() as string] ?? (
                                <ArrowUpDown className="w-3.5 h-3.5 text-neutral-300 group-hover:text-neutral-400" />
                              )}
                            </span>
                          )}
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              <AnimatePresence mode="wait">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-48 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center gap-3"
                      >
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                        </div>
                        <span className="text-sm font-medium text-neutral-600">Loading data...</span>
                      </motion.div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows?.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-48 text-center">
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center justify-center gap-3"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center">
                          <FileX className="w-8 h-8 text-neutral-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800">No results found</p>
                          <p className="mt-1 text-xs text-neutral-500">Try adjusting your search or filter</p>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, rowIndex) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.15, delay: mounted ? 0 : rowIndex * 0.02 }}
                      className="group cursor-pointer transition-all duration-200 hover:bg-gradient-to-r hover:from-brand-500/8 hover:to-brand-300/6"
                      onClick={() => onRowClick?.(row.original as TData)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="p-4 align-middle [&:has([role=checkbox])]:pr-0"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pageCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 px-1 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <span className="font-medium">{totalRows}</span>
            <span className="text-neutral-400">total results</span>
            {totalRows > 0 && (
              <>
                <span className="mx-1 text-neutral-300">|</span>
                <span>
                  Showing <span className="font-medium text-neutral-700">{startRow}-{endRow}</span>
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1 mx-1">
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) {
                  pageNum = i;
                } else if (currentPage <= 3) {
                  pageNum = i;
                } else if (currentPage >= pageCount - 2) {
                  pageNum = pageCount - 5 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                const isActive = currentPage === pageNum + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => table.setPageIndex(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-slate-950 shadow-brand'
                        : 'text-neutral-600 hover:bg-white/8'
                    }`}
                  >
                    {pageNum + 1}
                  </button>
                );
              })}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
