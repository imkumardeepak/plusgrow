import React, { useState } from "react";
import {
  Card,
  Table,
  Badge,
  Group,
  Text,
  Select,
  TextInput,
  Modal,
  Code,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@mantine/hooks";
import { Eye, FileText, Search } from "lucide-react";
import { format } from "date-fns";
import { auditLogApi, AuditLogRecord } from "@/services/auditLogApi";

export default function AuditLogs() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchUsername, setSearchUsername] = useState("");
  const [debouncedUsername] = useDebouncedValue(searchUsername, 500);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [entityFilter, setEntityFilter] = useState<string | null>(null);
  
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["auditLogs", page, pageSize, debouncedUsername, actionFilter, entityFilter],
    queryFn: () => auditLogApi.getLogs({
      page,
      pageSize,
      username: debouncedUsername,
      actionType: actionFilter || undefined,
      entityType: entityFilter || undefined
    }),
  });

  const getActionColor = (action: string) => {
    switch (action?.toLowerCase()) {
      case "added": return "blue";
      case "modified": return "yellow";
      case "deleted": return "red";
      default: return "gray";
    }
  };

  const handleViewDetails = (log: AuditLogRecord) => {
    setSelectedLog(log);
    setModalOpened(true);
  };

  const formatJson = (jsonStr: string | null) => {
    if (!jsonStr) return "null";
    try {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    } catch {
      return jsonStr;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500">System-wide event and change tracker</p>
        </div>
      </div>

      <Card shadow="sm" radius="md" p="md" className="flex items-center gap-4">
        <TextInput
          placeholder="Search by Username..."
          icon={<Search size={16} />}
          value={searchUsername}
          onChange={(e) => setSearchUsername(e.target.value)}
          className="flex-1"
        />
        <Select
          placeholder="Filter by Action"
          data={[
            { value: "", label: "All Actions" },
            { value: "Added", label: "Added" },
            { value: "Modified", label: "Modified" },
            { value: "Deleted", label: "Deleted" },
            { value: "CancelSalesOrder", label: "Cancel Sales Order" },
            { value: "BulkStockUpload", label: "Bulk Stock Upload" }
          ]}
          value={actionFilter}
          onChange={setActionFilter}
          clearable
          className="w-48"
        />
        <Select
          placeholder="Filter by Entity"
          data={[
            { value: "", label: "All Entities" },
            { value: "Product", label: "Product" },
            { value: "SalesOrder", label: "Sales Order" },
            { value: "ProductQuantity", label: "Stock Quantity" }
          ]}
          value={entityFilter}
          onChange={setEntityFilter}
          clearable
          className="w-48"
        />
      </Card>

      <Card shadow="sm" radius="md" p={0}>
        <div className="overflow-x-auto">
          <Table striped highlightOnHover>
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">View</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">Loading logs...</td>
                </tr>
              ) : data?.data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={24} className="text-gray-400" />
                      <span>No audit logs found</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.data.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {format(new Date(log.timestamp), "MMM dd, yyyy HH:mm:ss")}
                    </td>
                    <td className="py-2 px-4">
                      <Text size="sm" weight={500}>{log.username || "System"}</Text>
                    </td>
                    <td className="py-2 px-4">
                      <Badge color={getActionColor(log.action)} variant="light">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-2 px-4">
                      {log.entityType}
                    </td>
                    <td className="py-2 px-4">
                      <Text size="sm" color="dimmed">{log.entityId || "-"}</Text>
                    </td>
                    <td className="py-2 px-4 max-w-[300px] truncate">
                      {log.details || "-"}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Tooltip label="View Details">
                        <ActionIcon color="cyan" variant="light" onClick={() => handleViewDetails(log)}>
                          <Eye size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        
        {data && data.total > pageSize && (
          <div className="p-4 border-t flex justify-between items-center">
            <Text size="sm" color="dimmed">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of {data.total}
            </Text>
            <Group spacing="xs">
              <button
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </button>
              <button
                className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= data.total}
              >
                Next
              </button>
            </Group>
          </div>
        )}
      </Card>

      <Modal 
        opened={modalOpened} 
        onClose={() => setModalOpened(false)} 
        title="Audit Log Details"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <Group position="apart">
              <div>
                <Text size="sm" color="dimmed">Action</Text>
                <Badge color={getActionColor(selectedLog.action)} variant="light">{selectedLog.action}</Badge>
              </div>
              <div>
                <Text size="sm" color="dimmed">User</Text>
                <Text weight={500}>{selectedLog.username || "System"}</Text>
              </div>
              <div>
                <Text size="sm" color="dimmed">Timestamp</Text>
                <Text>{format(new Date(selectedLog.timestamp), "MMM dd, yyyy HH:mm:ss")}</Text>
              </div>
            </Group>

            <div>
              <Text size="sm" color="dimmed">Entity</Text>
              <Text>{selectedLog.entityType} {selectedLog.entityId ? `(#${selectedLog.entityId})` : ""}</Text>
            </div>

            {selectedLog.details && (
              <div>
                <Text size="sm" color="dimmed">Details</Text>
                <Text>{selectedLog.details}</Text>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {selectedLog.oldValues && (
                <div>
                  <Text size="sm" color="dimmed" mb={4}>Old Values</Text>
                  <ScrollArea h={300}>
                    <Code block>{formatJson(selectedLog.oldValues)}</Code>
                  </ScrollArea>
                </div>
              )}
              {selectedLog.newValues && (
                <div>
                  <Text size="sm" color="dimmed" mb={4}>New Values</Text>
                  <ScrollArea h={300}>
                    <Code block>{formatJson(selectedLog.newValues)}</Code>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
