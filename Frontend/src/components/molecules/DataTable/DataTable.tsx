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
} from "@tanstack/react-table";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "../../atoms/Button";
import { Input } from "../../atoms/Input";

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
  searchPlaceholder = "Search…",
  onSearch,
  searchValue = "",
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
    globalFilterFn: "includesString",
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
  }, [searchValue, globalFilter]);

  const handleSearch = (value: string) => {
    setGlobalFilter(value);
    onSearch?.(value);
  };

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalRows = table.getFilteredRowModel().rows.length;
  const startRow =
    totalRows === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const endRow = Math.min(startRow + pagination.pageSize - 1, totalRows);
  const hasClickableRows = typeof onRowClick === "function";

  return (
    <div className="flex flex-col gap-2.5">
      {onSearch && (
        <div className="relative max-w-sm">
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 rounded-xl border-white/10 bg-neutral-950/55 pr-10 text-[12px] text-neutral-100 placeholder:text-neutral-500 shadow-inner shadow-black/10 backdrop-blur-sm"
            leftElement={
              <Search
                className="h-3.5 w-3.5 text-neutral-500"
                aria-hidden="true"
              />
            }
            rightElement={
              globalFilter ? (
                <button
                  type="button"
                  onClick={() => handleSearch("")}
                  aria-label="Clear search"
                  className="rounded-full border border-white/10 bg-white/[0.04] p-1 text-neutral-500 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-neutral-100"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null
            }
          />
        </div>
      )}

      <div className="relative overflow-hidden rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,rgba(16,25,41,0.96)_0%,rgba(8,14,26,0.94)_100%)] shadow-[var(--shadow-card)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/35 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-brand-400/0 via-brand-400/15 to-brand-400/0" />

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full caption-bottom text-[12px] text-neutral-100">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-white/8 bg-white/[0.03]"
                >
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className="h-10 px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400 [&:has([role=checkbox])]:pr-0"
                    >
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <div className="h-3 w-0.5 rounded-full bg-brand-400/70 shadow-[var(--shadow-brand)]" />
                        )}
                        <button
                          type="button"
                          onClick={
                            header.column.getCanSort()
                              ? header.column.getToggleSortingHandler()
                              : undefined
                          }
                          className={`inline-flex items-center gap-1.5 transition-colors ${
                            header.column.getCanSort()
                              ? "cursor-pointer hover:text-brand-200"
                              : "cursor-default text-inherit"
                          }`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                          {header.column.getCanSort() && (
                            <span className="rounded p-0.5 transition-colors">
                              {{
                                asc: (
                                  <ArrowUp className="h-3 w-3 text-brand-300" />
                                ),
                                desc: (
                                  <ArrowDown className="h-3 w-3 text-brand-300" />
                                ),
                              }[header.column.getIsSorted() as string] ?? (
                                <ArrowUpDown className="h-3 w-3 text-neutral-600 transition-colors group-hover:text-neutral-400" />
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
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="wait">
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="h-36 text-center">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center gap-2"
                      >
                        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                          Loading records
                        </span>
                      </motion.div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows?.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="h-36 text-center">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center gap-2 text-neutral-500"
                      >
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 shadow-inner shadow-black/10">
                          <FileX className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                            No records found
                          </p>
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Try a different search or filter.
                          </p>
                        </div>
                      </motion.div>
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row, rowIndex) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.14,
                        delay: mounted ? 0 : rowIndex * 0.018,
                      }}
                      className={`${hasClickableRows ? "cursor-pointer" : ""} group transition-colors even:bg-white/[0.012] hover:bg-white/[0.035]`}
                      onClick={
                        hasClickableRows
                          ? () => onRowClick?.(row.original as TData)
                          : undefined
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-3 py-2 align-middle text-[12px] leading-5 text-neutral-200"
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
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

      {pageCount > 0 && (
        <div className="flex flex-col items-center justify-between gap-2 px-1 pt-0.5 sm:flex-row">
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 font-semibold text-neutral-200">
              {totalRows}
            </span>
            <span>results</span>
            {totalRows > 0 && (
              <>
                <span className="text-neutral-700">•</span>
                <span>
                  Showing{" "}
                  <span className="font-semibold text-neutral-200">
                    {startRow}-{endRow}
                  </span>
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
              aria-label="First page"
              className="size-8 border border-transparent p-0 text-neutral-500 hover:border-white/8 hover:bg-white/[0.05] hover:text-brand-200 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
              className="size-8 border border-transparent p-0 text-neutral-500 hover:border-white/8 hover:bg-white/[0.05] hover:text-brand-200 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="mx-1 flex items-center gap-1">
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
                    type="button"
                    onClick={() => table.setPageIndex(pageNum)}
                    className={`size-8 rounded-lg border text-[11px] font-semibold transition-all duration-200 ${
                      isActive
                        ? "border-brand-300/35 bg-brand-400/18 text-brand-100 shadow-[var(--shadow-brand)]"
                        : "border-transparent text-neutral-300 hover:border-white/8 hover:bg-white/[0.05]"
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
              aria-label="Next page"
              className="size-8 border border-transparent p-0 text-neutral-500 hover:border-white/8 hover:bg-white/[0.05] hover:text-brand-200 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
              className="size-8 border border-transparent p-0 text-neutral-500 hover:border-white/8 hover:bg-white/[0.05] hover:text-brand-200 disabled:opacity-40 disabled:hover:border-transparent disabled:hover:bg-transparent"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
