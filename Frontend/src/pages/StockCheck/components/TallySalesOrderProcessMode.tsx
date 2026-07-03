import React, { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import {
  Card,
  Group,
  Text,
  Badge,
  SimpleGrid,
  Modal,
  Table,
  ActionIcon,
  Stack,
  Loader,
  Center,
  Button,
  Box,
} from "@mantine/core";
import { Search, ExternalLink, Calendar, User, Hash, FileText, Trash2 } from "lucide-react";
import { toast } from "../../../lib/toast";
import { outwardOrdersApi, SalesOrderRecord } from "../../../services/masterApi";
import { ModeHeader } from "./ModeHeader";

interface Props {
  onBack: () => void;
  isMobile: boolean;
}

export function TallySalesOrderProcessMode({ onBack, isMobile }: Props) {
  const [orders, setOrders] = useState<SalesOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string>(format(subDays(new Date(), 10), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedOrder, setSelectedOrder] = useState<SalesOrderRecord | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await outwardOrdersApi.getUnprocessedSalesOrders({ search, fromDate, toDate });
      setOrders(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load unprocessed orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fromDate, toDate]);

  const handleProcess = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent opening modal
    try {
      setProcessingId(id);
      await outwardOrdersApi.processSalesOrder(id);
      toast.success("Order processed successfully. It is now ready for dispatch.");
      setOrders(orders.filter((o) => o.id !== id));
      if (selectedOrder?.id === id) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process order");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setDeletingId(orderToDelete);
      await outwardOrdersApi.deleteSalesOrder(orderToDelete);
      toast.success("Order deleted successfully.");
      setOrders(orders.filter((o) => o.id !== orderToDelete));
      if (selectedOrder?.id === orderToDelete) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete order");
    } finally {
      setDeletingId(null);
      setOrderToDelete(null);
    }
  };

  return (
    <Stack gap="lg" h="100%">
      <ModeHeader title="Tally Sales Order Process" icon={FileText} onBack={onBack} isMobile={isMobile} />

      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm" align="center" style={{ flex: 1 }}>
          <div className="relative max-w-sm w-full" style={{ flex: isMobile ? "1 1 100%" : undefined }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by order no, customer, sku..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
            />
          </div>

          <Group gap="xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{
                background: "rgba(2,6,23,0.7)",
                border: "1px solid rgba(51,65,85,1)",
                color: "white",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
                colorScheme: "dark",
              }}
            />
            <Text c="dimmed" size="xs">to</Text>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{
                background: "rgba(2,6,23,0.7)",
                border: "1px solid rgba(51,65,85,1)",
                color: "white",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 14,
                outline: "none",
                cursor: "pointer",
                colorScheme: "dark",
              }}
            />
          </Group>
        </Group>

        <ActionIcon variant="subtle" color="cyan" onClick={loadOrders} loading={loading}>
          <ExternalLink size={18} />
        </ActionIcon>
      </Group>

      <Box style={{ opacity: loading && orders.length > 0 ? 0.5 : 1, transition: "opacity 0.2s ease" }}>

      {loading && orders.length === 0 ? (
        <Center h={200}>
          <Loader color="cyan" />
        </Center>
      ) : orders.length === 0 ? (
        <Center h={200}>
          <Text c="dimmed">No unprocessed orders found.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="md">
          {orders.map((order) => {
            const totalQty = order.items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

            return (
              <Card
                key={order.id}
                shadow="sm"
                padding="md"
                radius="md"
                withBorder
                bg="dark.7"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  transition: "transform 0.2s, box-shadow 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                onClick={() => setSelectedOrder(order)}
              >
                <Card.Section withBorder inheritPadding py="xs" bg="dark.8">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <Hash size={16} color="gray" />
                      <Text fw={600} size="sm" c="cyan.4">
                        {order.orderNumber}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Badge color="yellow" variant="light" size="sm">
                        {order.status}
                      </Badge>
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        loading={deletingId === order.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOrderToDelete(order.id);
                        }}
                      >
                        <Trash2 size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>
                </Card.Section>

                <Stack gap="xs" mt="md" style={{ flex: 1 }}>
                  <Group gap="xs" wrap="nowrap">
                    <User size={14} color="gray" />
                    <Text size="sm" fw={500} lineClamp={1}>
                      {order.customerName}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Calendar size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    Total Items: {order.items.length} | Qty: {totalQty}
                  </Text>
                </Stack>

                <Card.Section withBorder inheritPadding py="xs" mt="md" bg="dark.8">
                  <Button
                    fullWidth
                    variant="light"
                    color="cyan"
                    loading={processingId === order.id}
                    onClick={(e) => handleProcess(e, order.id)}
                  >
                    Process
                  </Button>
                </Card.Section>
              </Card>
            );
          })}
        </SimpleGrid>
      )}
      </Box>

      <Modal
        opened={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={
          <Group gap="sm">
            <Text fw={600}>Order Details</Text>
            <Badge color="cyan">{selectedOrder?.orderNumber}</Badge>
          </Group>
        }
        size="xl"
      >
        {selectedOrder && (
          <Stack>
            <Group justify="space-between" bg="dark.8" p="sm" style={{ borderRadius: 8 }}>
              <Box>
                <Text size="xs" c="dimmed">Customer</Text>
                <Text fw={500}>{selectedOrder.customerName}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Date</Text>
                <Text fw={500}>{new Date(selectedOrder.orderDate).toLocaleDateString()}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">Status</Text>
                <Badge>{selectedOrder.status}</Badge>
              </Box>
            </Group>

            <Text fw={600} mt="md">Order Items</Text>
            <div className="overflow-x-auto">
              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Quantity</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <Table.Tr key={idx}>
                      <Table.Td>
                        <Badge variant="outline" color="gray">{item.skuCode}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{item.productName}</Text>
                        {item.alias && (
                          <Text size="xs" c="dimmed">{item.alias}</Text>
                        )}
                      </Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>
                        <Text fw={500}>{item.quantity}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>

            <Group justify="flex-end" mt="xl">
              <Button variant="default" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
              <Button
                color="cyan"
                loading={processingId === selectedOrder.id}
                onClick={(e) => handleProcess(e as any, selectedOrder.id)}
              >
                Process Order
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal opened={!!orderToDelete} onClose={() => setOrderToDelete(null)} title="Confirm Deletion" centered size="sm">
        <Text size="sm" mb="lg">Are you sure you want to delete this sales order? This action cannot be undone.</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setOrderToDelete(null)}>Cancel</Button>
          <Button color="red" onClick={confirmDelete} loading={!!deletingId}>Delete</Button>
        </Group>
      </Modal>
    </Stack>
  );
}
