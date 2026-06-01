import React, { memo, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Center,
  Group,
  ScrollArea,
  Table,
  Text,
} from "@mantine/core";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LucideIcon,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { OperationsEmptyState } from "../../organisms/Operations/OperationsShell";

export type ColumnAlign = "left" | "center" | "right";

export interface DataTableColumn<T> {
  /** Unique key for React key, also used as default accessor */
  key: string;
  /** Header label */
  header: React.ReactNode;
  /** Cell renderer - receives row + rowIndex */
  render: (row: T, rowIndex: number) => React.ReactNode;
  /** Text alignment */
  align?: ColumnAlign;
  /** Optional inline style for the <th> / <td> */
  width?: number | string;
  /** Optional className applied to column cells */
  className?: string;
  /** Header tooltip or any node */
  headerNode?: React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Custom sort accessor - extracts value from row for sorting */
  sortAccessor?: (row: T) => string | number | null | undefined;
}

export type SortDirection = "asc" | "desc" | null;

export interface SortState {
  columnKey: string;
  direction: SortDirection;
}

export interface MantineDataTableProps<T> {
  /** Full dataset (already filtered if external filtering used) */
  data: T[];
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Key extractor for rows */
  rowKey: (row: T, index: number) => string | number;

  /** Loading flag */
  isLoading?: boolean;

  /** Empty state content */
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;

  /** Pagination */
  pageSize?: number;
  enablePagination?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  /** Label used in footer ("Showing X-Y of Z bins") */
  itemLabel?: string;
  /** Reset page when this value changes (e.g. the search string) */
  resetPageKey?: string | number;

  /** Table sizing/styling */
  minWidth?: number | string;
  maxHeight?: number | string;
  fontSize?: number | string;

  /** Optional additional container classes */
  className?: string;

  /** Optional row click handler */
  onRowClick?: (row: T, rowIndex: number) => void;

  /** Controlled sort state (optional) */
  sortState?: SortState;
  /** Callback when sort changes (optional) */
  onSortChange?: (sort: SortState | null) => void;
}

function MantineDataTableInner<T>({
  data,
  columns,
  rowKey,
  isLoading = false,
  emptyIcon,
  emptyTitle = "No records found",
  emptyDescription = "No records match the current filters.",
  pageSize = 10,
  enablePagination = true,
  totalItems,
  currentPage: controlledPage,
  onPageChange,
  itemLabel = "items",
  resetPageKey,
  minWidth = 600,
  maxHeight,
  fontSize = 12,
  className,
  onRowClick,
  sortState: controlledSortState,
  onSortChange,
}: MantineDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [internalSortState, setInternalSortState] = useState<SortState | null>(
    null,
  );

  // Use controlled or uncontrolled sort state
  const sortState = controlledSortState ?? internalSortState;
  const activePage = controlledPage ?? currentPage;
  const isServerPaginated = typeof totalItems === "number" && Boolean(onPageChange);

  // Reset to page 1 when external filter key changes
  useEffect(() => {
    if (onPageChange) {
      onPageChange(1);
    } else {
      setCurrentPage(1);
    }
  }, [onPageChange, resetPageKey]);

  const handleSort = (columnKey: string) => {
    const newSortState: SortState | null = (() => {
      if (sortState?.columnKey !== columnKey) {
        return { columnKey, direction: "asc" };
      }
      if (sortState.direction === "asc") {
        return { columnKey, direction: "desc" };
      }
      if (sortState.direction === "desc") {
        return null;
      }
      return { columnKey, direction: "asc" };
    })();

    if (onSortChange) {
      onSortChange(newSortState);
    } else {
      setInternalSortState(newSortState);
    }

    // Reset to page 1 when sorting changes
    setCurrentPage(1);
  };

  const sortedData = useMemo(() => {
    if (!sortState || !sortState.direction) return data;

    const column = columns.find((col) => col.key === sortState.columnKey);
    if (!column || !column.sortable) return data;

    const accessor =
      column.sortAccessor ?? ((row: any) => row[sortState.columnKey]);
    const direction = sortState.direction === "asc" ? 1 : -1;

    return [...data].sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);

      // Handle null/undefined
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Numeric comparison
      if (typeof aVal === "number" && typeof bVal === "number") {
        return (aVal - bVal) * direction;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return aStr.localeCompare(bStr) * direction;
    });
  }, [data, sortState, columns]);

  const pagination = useMemo(() => {
    const resolvedTotalItems = totalItems ?? sortedData.length;
    const totalPages = Math.max(1, Math.ceil(resolvedTotalItems / pageSize));
    const safePage = Math.min(activePage, totalPages);
    const startIndex = enablePagination ? (safePage - 1) * pageSize : 0;
    const endIndex = enablePagination
      ? Math.min(startIndex + pageSize, resolvedTotalItems)
      : resolvedTotalItems;
    const paginatedItems = enablePagination && !isServerPaginated
      ? sortedData.slice(startIndex, endIndex)
      : sortedData;

    return {
      totalItems: resolvedTotalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedItems,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
      currentPage: safePage,
    };
  }, [activePage, enablePagination, isServerPaginated, pageSize, sortedData, totalItems]);

  const goToPage = (page: number) => {
    const nextPage = Math.max(1, Math.min(page, pagination.totalPages));
    if (onPageChange) {
      onPageChange(nextPage);
      return;
    }
    setCurrentPage(nextPage);
  };

  if (isLoading) {
    return (
      <Center h={260}>
        <Loader2 size={18} className="animate-spin text-cyan-400" />
      </Center>
    );
  }

  if (pagination.totalItems === 0) {
    return (
      <OperationsEmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={className}>
      <ScrollArea style={maxHeight ? { maxHeight } : undefined}>
        <Table
          highlightOnHover
          stickyHeader
          verticalSpacing={6}
          horizontalSpacing="sm"
          style={{ minWidth, fontSize }}
        >
          <Table.Thead>
            <Table.Tr>
              {columns.map((col) => {
                const isSorted = sortState?.columnKey === col.key;
                const sortDirection = isSorted ? sortState?.direction : null;
                const isSortable = col.sortable === true;

                return (
                  <Table.Th
                    key={col.key}
                    ta={col.align}
                    style={{
                      ...((col.width
                        ? { width: col.width }
                        : undefined) as React.CSSProperties),
                      ...(isSortable
                        ? { cursor: "pointer", userSelect: "none" }
                        : undefined),
                    }}
                    className={col.className}
                    onClick={() => isSortable && handleSort(col.key)}
                  >
                    <Group
                      gap="xs"
                      wrap="nowrap"
                      justify={
                        col.align === "right"
                          ? "flex-end"
                          : col.align === "center"
                            ? "center"
                            : "flex-start"
                      }
                    >
                      <span>{col.headerNode ?? col.header}</span>
                      {isSortable && (
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color={isSorted ? "cyan" : "gray"}
                          style={{ opacity: isSorted ? 1 : 0.5 }}
                        >
                          {!isSorted && <ArrowUpDown size={14} />}
                          {isSorted && sortDirection === "asc" && (
                            <ArrowUp size={14} />
                          )}
                          {isSorted && sortDirection === "desc" && (
                            <ArrowDown size={14} />
                          )}
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Th>
                );
              })}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pagination.paginatedItems.map((row, idx) => {
              const absoluteIndex = pagination.startIndex + idx;
              return (
                <Table.Tr
                  key={rowKey(row, absoluteIndex)}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row, absoluteIndex)
                      : undefined
                  }
                  style={
                    onRowClick
                      ? { cursor: "pointer" }
                      : undefined
                  }
                >
                  {columns.map((col) => (
                    <Table.Td
                      key={col.key}
                      ta={col.align}
                      className={col.className}
                    >
                      {col.render(row, absoluteIndex)}
                    </Table.Td>
                  ))}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {enablePagination && pagination.totalItems > pageSize && (
        <Group
          justify="space-between"
          align="center"
          px="md"
          py="sm"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.07)" }}
        >
          <Text size="xs" c="dimmed">
            Showing{" "}
            <Text component="span" fw={700} c="cyan.3">
              {pagination.startIndex + 1}-{pagination.endIndex}
            </Text>{" "}
            of{" "}
            <Text component="span" fw={700} c="cyan.3">
              {pagination.totalItems}
            </Text>{" "}
            {itemLabel}
          </Text>

          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              size="sm"
              variant="light"
              color="gray"
              onClick={() => goToPage(1)}
              disabled={!pagination.hasPrevPage}
              aria-label="First page"
            >
              <ChevronsLeft size={16} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="light"
              color="gray"
              onClick={() => goToPage(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </ActionIcon>

            <Group gap={4} wrap="nowrap">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (
                    pagination.currentPage >=
                    pagination.totalPages - 2
                  ) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }

                  return (
                    <ActionIcon
                      key={pageNum}
                      size="sm"
                      variant={
                        pagination.currentPage === pageNum ? "filled" : "light"
                      }
                      color={
                        pagination.currentPage === pageNum ? "cyan" : "gray"
                      }
                      onClick={() => goToPage(pageNum)}
                      style={{ fontWeight: 700, fontSize: 11 }}
                    >
                      {pageNum}
                    </ActionIcon>
                  );
                },
              )}
            </Group>

            <ActionIcon
              size="sm"
              variant="light"
              color="gray"
              onClick={() => goToPage(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </ActionIcon>
            <ActionIcon
              size="sm"
              variant="light"
              color="gray"
              onClick={() => goToPage(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
              aria-label="Last page"
            >
              <ChevronsRight size={16} />
            </ActionIcon>
          </Group>
        </Group>
      )}
    </div>
  );
}

export const MantineDataTable = memo(MantineDataTableInner) as <T>(
  props: MantineDataTableProps<T>,
) => React.ReactElement;
