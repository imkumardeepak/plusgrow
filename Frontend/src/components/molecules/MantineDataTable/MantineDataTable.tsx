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
  itemLabel = "items",
  resetPageKey,
  minWidth = 600,
  maxHeight,
  fontSize = 12,
  className,
}: MantineDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when external filter key changes
  useEffect(() => {
    setCurrentPage(1);
  }, [resetPageKey]);

  const pagination = useMemo(() => {
    const totalItems = data.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    const startIndex = enablePagination ? (safePage - 1) * pageSize : 0;
    const endIndex = enablePagination
      ? Math.min(startIndex + pageSize, totalItems)
      : totalItems;
    const paginatedItems = enablePagination
      ? data.slice(startIndex, endIndex)
      : data;

    return {
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedItems,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
      currentPage: safePage,
    };
  }, [data, currentPage, pageSize, enablePagination]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, pagination.totalPages)));
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
              {columns.map((col) => (
                <Table.Th
                  key={col.key}
                  ta={col.align}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.className}
                >
                  {col.headerNode ?? col.header}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pagination.paginatedItems.map((row, idx) => {
              const absoluteIndex = pagination.startIndex + idx;
              return (
                <Table.Tr key={rowKey(row, absoluteIndex)}>
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
