import React, { useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Group,
  Loader,
  Modal,
  Pagination,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Eye, FileText, RotateCcw, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { auditLogApi, AuditLogRecord } from "@/services/auditLogApi";

const actionOptions = [
  { value: "Added", label: "Added" },
  { value: "Modified", label: "Modified" },
  { value: "Deleted", label: "Deleted" },
  { value: "CancelSalesOrder", label: "Cancel Sales Order" },
  { value: "BulkStockUpload", label: "Bulk Stock Upload" },
  { value: "Bulk Update", label: "Bulk Update" },
];

const entityOptions = [
  { value: "Product", label: "Product" },
  { value: "SalesOrder", label: "Sales Order" },
  { value: "ProductQuantity", label: "Stock Quantity" },
  { value: "ProductAllottedLocation", label: "Product Location" },
  { value: "ProductStockMovement", label: "Stock Movement" },
  { value: "PoInvoice", label: "PO Invoice" },
  { value: "PoInvoiceHeader", label: "PO Invoice Header" },
  { value: "StockCheckReport", label: "Stock Check Report" },
  { value: "OutwardOrder", label: "Outward Order" },
  { value: "User", label: "User" },
  { value: "Role", label: "Role" },
];

const getActionColor = (action: string) => {
  switch (action?.toLowerCase()) {
    case "added":
      return "blue";
    case "modified":
      return "yellow";
    case "deleted":
      return "red";
    case "bulkstockupload":
      return "grape";
    case "cancelsalesorder":
      return "orange";
    default:
      return "gray";
  }
};

const formatJson = (jsonStr: string | null) => {
  if (!jsonStr) return "No values captured";
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2);
  } catch {
    return jsonStr;
  }
};

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchUsername, setSearchUsername] = useState("");
  const [debouncedUsername] = useDebouncedValue(searchUsername, 500);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ["auditLogs", page, pageSize, debouncedUsername, actionFilter, entityFilter, startDate, endDate],
    queryFn: () => auditLogApi.getLogs({
      page,
      pageSize,
      username: debouncedUsername || undefined,
      actionType: actionFilter || undefined,
      entityType: entityFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate ? `${endDate}T23:59:59` : undefined,
    }),
  });

  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.total || 0) / pageSize)), [data?.total, pageSize]);
  const firstRow = data?.total ? (page - 1) * pageSize + 1 : 0;
  const lastRow = Math.min(page * pageSize, data?.total || 0);

  const resetFilters = () => {
    setSearchUsername("");
    setActionFilter(null);
    setEntityFilter(null);
    setStartDate(today);
    setEndDate(today);
    setPageSize(50);
    setPage(1);
  };

  return (
    <Stack gap="md">
      <Card radius="xl" p="lg" withBorder style={{ background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(15,23,42,0.72))" }}>
        <Group justify="space-between" align="center" gap="md">
          <Group gap="sm">
            <ThemeIcon size={46} radius="xl" variant="gradient" gradient={{ from: "cyan", to: "grape", deg: 135 }}>
              <ShieldCheck size={22} />
            </ThemeIcon>
            <Box>
              <Text fw={900} size="xl" c="white">Audit Logs</Text>
              <Text size="sm" c="dimmed">Compact system activity and change tracker</Text>
            </Box>
          </Group>
          <Badge size="lg" radius="md" variant="light" color="cyan">
            {data?.total ?? 0} records
          </Badge>
        </Group>
      </Card>

      <Card radius="xl" p="md" withBorder>
        <Group gap="xs" mb="sm">
          <SlidersHorizontal size={16} />
          <Text fw={800} size="sm">Filters</Text>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 6 }} spacing="sm">
          <TextInput
            placeholder="Username"
            leftSection={<Search size={15} />}
            value={searchUsername}
            onChange={(event) => { setSearchUsername(event.currentTarget.value); setPage(1); }}
          />
          <Select placeholder="Action" data={actionOptions} value={actionFilter} onChange={(value) => { setActionFilter(value); setPage(1); }} clearable />
          <Select placeholder="Entity" data={entityOptions} value={entityFilter} onChange={(value) => { setEntityFilter(value); setPage(1); }} clearable searchable />
          <TextInput type="date" value={startDate} onChange={(event) => { setStartDate(event.currentTarget.value); setPage(1); }} />
          <TextInput type="date" value={endDate} onChange={(event) => { setEndDate(event.currentTarget.value); setPage(1); }} />
          <Group gap="xs" wrap="nowrap">
            <Select data={["25", "50", "100", "200"]} value={String(pageSize)} onChange={(value) => { setPageSize(Number(value || 50)); setPage(1); }} w={88} allowDeselect={false} />
            <Button variant="light" color="gray" leftSection={<RotateCcw size={14} />} onClick={resetFilters} style={{ flex: 1 }}>
              Reset
            </Button>
          </Group>
        </SimpleGrid>
      </Card>

      <Card radius="xl" p={0} withBorder style={{ overflow: "hidden" }}>
        <ScrollArea>
          <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="md" miw={980}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Time</Table.Th>
                <Table.Th>User</Table.Th>
                <Table.Th>Action</Table.Th>
                <Table.Th>Entity</Table.Th>
                <Table.Th>Details</Table.Th>
                <Table.Th ta="right">View</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isFetching && !data ? (
                <Table.Tr>
                  <Table.Td colSpan={6} py="xl">
                    <Group justify="center" gap="sm"><Loader size="sm" /><Text c="dimmed">Loading audit logs...</Text></Group>
                  </Table.Td>
                </Table.Tr>
              ) : data?.data.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6} py="xl">
                    <Stack align="center" gap={6}>
                      <FileText size={26} color="var(--mantine-color-dimmed)" />
                      <Text c="dimmed" size="sm">No audit logs found</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                data?.data.map((log) => (
                  <Table.Tr key={log.id}>
                    <Table.Td w={170}>
                      <Text size="xs" fw={700}>{format(new Date(log.timestamp), "dd MMM yyyy")}</Text>
                      <Text size="11px" c="dimmed">{format(new Date(log.timestamp), "HH:mm:ss")}</Text>
                    </Table.Td>
                    <Table.Td w={150}><Text size="sm" fw={700}>{log.username || "System"}</Text></Table.Td>
                    <Table.Td w={150}><Badge color={getActionColor(log.action)} variant="light" radius="md">{log.action}</Badge></Table.Td>
                    <Table.Td w={220}>
                      <Text size="sm" fw={700}>{log.entityType}</Text>
                      <Text size="11px" c="dimmed">{log.entityId ? `#${log.entityId}` : "No entity id"}</Text>
                    </Table.Td>
                    <Table.Td maw={360}><Text size="sm" truncate="end">{log.details || "No details provided"}</Text></Table.Td>
                    <Table.Td ta="right" w={80}>
                      <Tooltip label="View details">
                        <ActionIcon color="cyan" variant="light" radius="md" onClick={() => setSelectedLog(log)}>
                          <Eye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
        <Divider />
        <Group justify="space-between" p="sm" gap="sm">
          <Text size="xs" c="dimmed">
            Showing {firstRow} to {lastRow} of {data?.total || 0}
          </Text>
          <Pagination size="sm" total={totalPages} value={page} onChange={setPage} withEdges />
        </Group>
      </Card>

      <Modal opened={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Log Details" size="xl" centered>
        {selectedLog && (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
              <Card radius="lg" p="sm" withBorder><Text size="xs" c="dimmed">Action</Text><Badge color={getActionColor(selectedLog.action)} variant="light">{selectedLog.action}</Badge></Card>
              <Card radius="lg" p="sm" withBorder><Text size="xs" c="dimmed">User</Text><Text fw={800}>{selectedLog.username || "System"}</Text></Card>
              <Card radius="lg" p="sm" withBorder><Text size="xs" c="dimmed">Timestamp</Text><Text fw={800} size="sm">{format(new Date(selectedLog.timestamp), "dd MMM yyyy HH:mm:ss")}</Text></Card>
            </SimpleGrid>
            <Card radius="lg" p="sm" withBorder>
              <Text size="xs" c="dimmed">Entity</Text>
              <Text fw={800}>{selectedLog.entityType} {selectedLog.entityId ? `#${selectedLog.entityId}` : ""}</Text>
              {selectedLog.details && <Text size="sm" c="dimmed" mt={4}>{selectedLog.details}</Text>}
            </Card>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
              <Box>
                <Text size="xs" c="dimmed" mb={4}>Old Values</Text>
                <ScrollArea h={300}><Code block>{formatJson(selectedLog.oldValues)}</Code></ScrollArea>
              </Box>
              <Box>
                <Text size="xs" c="dimmed" mb={4}>New Values</Text>
                <ScrollArea h={300}><Code block>{formatJson(selectedLog.newValues)}</Code></ScrollArea>
              </Box>
            </SimpleGrid>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
