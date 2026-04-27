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
  Loader2,
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
    <div className="flex flex-col gap-2">
      {/* Search Bar - Compacted */}
      {onSearch && (
        <div className="relative">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-8 rounded-lg pr-10 text-[11px] bg-white/[0.03] border-white/10"
            leftElement={<Search className="w-3.5 h-3.5 text-neutral-500" />}
            rightElement={globalFilter ? (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="rounded-full bg-white/5 p-1 text-neutral-500 transition-colors hover:bg-white/10 hover:text-neutral-100"
              >
                <X className="w-3 h-3" />
              </button>
            ) : null}
          />
        </div>
      )}

      {/* Table Container - Pro Max Compact */}
      <div className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.01] shadow-xl backdrop-blur-sm">
        {/* Subtle gradient overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full caption-bottom text-[11px]">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-white/5 bg-white/[0.02]">
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className="h-8 px-3 text-left align-middle text-[10px] font-bold uppercase tracking-widest text-neutral-500 [&:has([role=checkbox])]:pr-0"
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <div className="w-0.5 h-3 rounded-full bg-brand-500/50 shadow-[0_0_8px_rgba(6,182,212,0.5)]" />
                        )}
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1.5 hover:text-brand-400 transition-colors group"
                        >
                          {header.isPlaceholder ? null : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {header.column.getCanSort() && (
                            <span className="p-0.5 rounded transition-colors">
                              {{
                                asc: <ArrowUp className="w-3 h-3 text-brand-400" />,
                                desc: <ArrowDown className="w-3 h-3 text-brand-400" />,
                              }[header.column.getIsSorted() as string] ?? (
                                  <ArrowUpDown className="w-3 h-3 text-neutral-600 group-hover:text-neutral-400" />
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
            <tbody className="divide-y divide-white/[0.03]">
              <AnimatePresence mode="wait">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-32 text-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center gap-2"
                      >
                        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                        <span className="text-[10px] font-medium text-neutral-500 tracking-wider">Syncing Data...</span>
                      </motion.div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows?.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-32 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center gap-2 opacity-50"
                      >
                        <FileX className="w-8 h-8 text-neutral-500" />
                        <div>
                          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">No Records</p>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, rowIndex) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.1, delay: mounted ? 0 : rowIndex * 0.01 }}
                      className="group cursor-pointer transition-colors hover:bg-brand-500/5"
                      onClick={() => onRowClick?.(row.original as TData)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-1.5 align-middle font-medium text-neutral-300"
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
                  Showing <span className="font-medium text-neutral-200">{startRow}-{endRow}</span>
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
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-300 hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-300 hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent"
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
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-slate-950 shadow-brand'
                      : 'text-neutral-300 hover:bg-white/8'
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
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-300 hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="w-8 h-8 p-0 text-neutral-500 hover:text-brand-300 hover:bg-brand-400/10 disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronsRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
