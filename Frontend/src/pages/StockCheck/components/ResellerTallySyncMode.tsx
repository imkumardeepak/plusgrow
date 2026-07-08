import React, { useState } from "react";
import { ArrowLeft, RefreshCw, Navigation, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Code,
  Divider,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5179/api";

type PendingOrderItem = {
  sku: string;
  quantity: number;
  rate: number;
  lineTotal: number;
  productName: string | null;
  productSku: string | null;
  productAlias: string | null;
  unitType: string | null;
  ownership: string | null;
  mrp: number | null;
  productFound: boolean;
};

type PendingOrder = {
  orderNo: string;
  orderDate: string;
  customerName: string;
  compositeShippingCharges: number;
  totalItems: number;
  syncStatus: string;
  items: PendingOrderItem[];
};

type TallySyncApiResponse = {
  message?: string;
  tallyResponse?: string;
};

class TallySyncError extends Error {
  tallyResponse: string;

  constructor(message: string, tallyResponse?: string) {
    super(message);
    this.name = "TallySyncError";
    this.tallyResponse = tallyResponse ?? message;
  }
}

const formatAmount = (value: number | null | undefined) =>
  `INR ${new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))}`;

const decodeTallyResponse = (value: string) =>
  value
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const extractTallyCompanyName = (response?: string) => {
  if (!response) return null;

  const decodedResponse = decodeTallyResponse(response);
  if (!decodedResponse.toLowerCase().includes("svcurrentcompany")) return null;

  const match = decodedResponse.match(/SVCurrentCompany'\s+to\s+'([^']+)'/i);
  return match?.[1] ?? null;
};

export function ResellerTallySyncMode({
  onBack,
  isMobile,
}: {
  onBack: () => void;
  isMobile: boolean;
}) {
  const queryClient = useQueryClient();
  const [tallyResponses, setTallyResponses] = useState<Record<string, string>>({});
  const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ["reseller-tally-pending"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/resellertally/pending`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch pending orders");
      const result = await response.json();
      return result.data as PendingOrder[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (orderNo: string) => {
      const response = await fetch(`${API_BASE_URL}/resellertally/sync/${encodeURIComponent(orderNo)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result = (await response.json().catch(() => ({}))) as TallySyncApiResponse;
      if (!response.ok) {
        throw new TallySyncError(
          result.message || "Failed to sync to Tally",
          result.tallyResponse || result.message,
        );
      }
      return {
        orderNo,
        tallyResponse: result.tallyResponse ?? "",
        message: result.message ?? "Successfully synced to Tally",
      };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setTallyResponses((prev) => ({ ...prev, [data.orderNo]: data.tallyResponse }));
      queryClient.invalidateQueries({ queryKey: ["reseller-tally-pending"] });
    },
    onError: (error: any, orderNo) => {
      toast.error(error.message || "An error occurred");
      if (error instanceof TallySyncError) {
        setTallyResponses((prev) => ({ ...prev, [orderNo]: error.tallyResponse }));

        const failedOrder = orders?.find((order) => order.orderNo === orderNo);
        if (failedOrder) {
          setSelectedOrder({ ...failedOrder, syncStatus: "Failed" });
        }
      }
    },
  });

  const hideMutation = useMutation({
    mutationFn: async (orderNo: string) => {
      const response = await fetch(`${API_BASE_URL}/resellertally/orders/${encodeURIComponent(orderNo)}/hide`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to hide order");
      return { orderNo, message: result.message };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setTallyResponses((prev) => {
        const next = { ...prev };
        delete next[data.orderNo];
        return next;
      });
      if (selectedOrder?.orderNo === data.orderNo) {
        setSelectedOrder(null);
      }
      queryClient.invalidateQueries({ queryKey: ["reseller-tally-pending"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to hide order");
    },
  });

  const handleHideOrder = (orderNo: string) => {
    const confirmed = window.confirm(
      `Hide order #${orderNo} from this list? It will not be fetched again because the order number remains saved.`,
    );

    if (confirmed) {
      hideMutation.mutate(orderNo);
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "Success") {
      return (
        <Badge color="green" variant="light" size="xs" leftSection={<CheckCircle2 size={11} />}>
          Synced
        </Badge>
      );
    }

    if (status === "Failed") {
      return (
        <Badge color="red" variant="light" size="xs" leftSection={<XCircle size={11} />}>
          Failed
        </Badge>
      );
    }

    return (
      <Badge color="blue" variant="light" size="xs">
        Pending
      </Badge>
    );
  };

  return (
    <Stack gap="md" h="100%">
      <Modal
        opened={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder ? (
            <Box>
              <Text fw={700}>Order #{selectedOrder.orderNo}</Text>
              <Text size="xs" c="dimmed">
                {selectedOrder.customerName}
              </Text>
            </Box>
          ) : null
        }
        size="xl"
        centered
        scrollAreaComponent={ScrollArea.Autosize}
      >
        {selectedOrder && (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
              <Paper withBorder p="xs" radius="sm">
                <Text size="xs" c="dimmed">Date</Text>
                <Text size="sm" fw={700}>{selectedOrder.orderDate}</Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="xs" c="dimmed">Items</Text>
                <Text size="sm" fw={700}>{selectedOrder.totalItems}</Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="xs" c="dimmed">Shipping</Text>
                <Text size="sm" fw={700}>{formatAmount(selectedOrder.compositeShippingCharges)}</Text>
              </Paper>
              <Paper withBorder p="xs" radius="sm">
                <Text size="xs" c="dimmed">Status</Text>
                <Box mt={4}>{renderStatusBadge(selectedOrder.syncStatus)}</Box>
              </Paper>
            </SimpleGrid>

            <ScrollArea type="auto">
              <Table striped highlightOnHover withTableBorder withColumnBorders miw={820}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Ownership</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Qty</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Rate</Table.Th>
                    <Table.Th style={{ textAlign: "right" }}>Amount</Table.Th>
                    <Table.Th>Unit</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedOrder.items.map((item, index) => (
                    <Table.Tr key={`${item.sku}-${index}`}>
                      <Table.Td>
                        <Text size="sm" fw={700}>{item.sku}</Text>
                        {item.productAlias && item.productAlias !== item.sku && (
                          <Text size="xs" c="dimmed">{item.productAlias}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={2}>
                          {item.productName || "Product master not found"}
                        </Text>
                      </Table.Td>
                      <Table.Td>{item.ownership || "-"}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{item.quantity}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{formatAmount(item.rate)}</Table.Td>
                      <Table.Td style={{ textAlign: "right" }}>{formatAmount(item.lineTotal)}</Table.Td>
                      <Table.Td>{item.unitType || "-"}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {tallyResponses[selectedOrder.orderNo] && (
              <Stack gap="xs">
                {extractTallyCompanyName(tallyResponses[selectedOrder.orderNo]) && (
                  <Alert color="red" variant="light" title="Tally company is not active">
                    Tally could not switch to company{" "}
                    <Code>{extractTallyCompanyName(tallyResponses[selectedOrder.orderNo])}</Code>.
                    Open/select this exact company in Tally, then retry the push.
                  </Alert>
                )}
                <Box p="sm" style={{ backgroundColor: "#1a1b1e", borderRadius: 6 }}>
                  <Text size="xs" fw={700} mb="xs" c="dimmed">Tally Response</Text>
                  <ScrollArea type="auto" mah={180}>
                    <Code block style={{ backgroundColor: "transparent", color: "#a6e22e", whiteSpace: "pre-wrap" }}>
                      {tallyResponses[selectedOrder.orderNo]}
                    </Code>
                  </ScrollArea>
                </Box>
              </Stack>
            )}
          </Stack>
        )}
      </Modal>

      <Paper p={isMobile ? "sm" : "md"} radius="md" withBorder shadow="sm">
        <Group justify="space-between">
          <Group gap="sm">
            <ActionIcon variant="subtle" onClick={onBack} size="lg">
              <ArrowLeft size={20} />
            </ActionIcon>
            <Box>
              <Text fw={700} size="lg">
                Reseller API to Tally Sync
              </Text>
              <Text c="dimmed" size="xs">
                Manually push pending sales orders to Tally
              </Text>
            </Box>
          </Group>
          <Button
            variant="outline"
            onClick={() => refetch()}
            loading={isLoading}
            leftIcon={<RefreshCw size={16} />}
          >
            Refresh List
          </Button>
        </Group>
      </Paper>

      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <Box pb="xl">
          {isLoading ? (
            <Text c="dimmed" ta="center" mt="xl">
              Loading pending orders...
            </Text>
          ) : isError ? (
            <Text c="red" ta="center" mt="xl">
              Failed to load pending orders from Reseller API.
            </Text>
          ) : !orders || orders.length === 0 ? (
            <Text c="dimmed" ta="center" mt="xl">
              No pending orders found.
            </Text>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }} spacing="sm" verticalSpacing="sm">
              {orders.map((order) => {
                const isSyncing = syncMutation.isPending && syncMutation.variables === order.orderNo;
                const isHiding = hideMutation.isPending && hideMutation.variables === order.orderNo;
                const itemTotal = order.items.reduce((sum, item) => sum + item.lineTotal, 0);

                return (
                  <Paper
                    key={order.orderNo}
                    withBorder
                    p="sm"
                    radius="sm"
                    shadow="xs"
                    onClick={() => setSelectedOrder(order)}
                    style={{ cursor: "pointer", minHeight: 190, display: "flex", flexDirection: "column" }}
                  >
                    <Group justify="space-between" align="flex-start" wrap="nowrap" mb="xs">
                      <Box style={{ minWidth: 0 }}>
                        <Text fw={800} size="sm" truncate>
                          #{order.orderNo}
                        </Text>
                        <Box mt={4}>{renderStatusBadge(order.syncStatus)}</Box>
                      </Box>
                      <ActionIcon
                        aria-label={`Hide order ${order.orderNo} from Tally sync list`}
                        title="Hide from this list"
                        color="red"
                        variant="light"
                        size="sm"
                        loading={isHiding}
                        disabled={isSyncing}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleHideOrder(order.orderNo);
                        }}
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    </Group>

                    <Stack gap={4} style={{ flex: 1 }}>
                      <Text size="xs" c="dimmed">{order.orderDate}</Text>
                      <Text size="sm" fw={700} lineClamp={2}>
                        {order.customerName}
                      </Text>
                      <Group gap={6} mt={4}>
                        <Badge size="xs" variant="outline" color="gray">
                          {order.totalItems} items
                        </Badge>
                        {order.compositeShippingCharges > 0 && (
                          <Badge size="xs" variant="outline" color="orange">
                            Ship {formatAmount(order.compositeShippingCharges)}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" mt={4}>
                        Item value {formatAmount(itemTotal)}
                      </Text>
                    </Stack>

                    <Divider my="xs" />
                    <Button
                      fullWidth
                      size="xs"
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        syncMutation.mutate(order.orderNo);
                      }}
                      loading={isSyncing}
                      disabled={order.syncStatus === "Success" || isHiding}
                      leftIcon={<Navigation size={14} />}
                      color="blue"
                    >
                      Push to Tally
                    </Button>
                  </Paper>
                );
              })}
            </SimpleGrid>
          )}
        </Box>
      </ScrollArea>
    </Stack>
  );
}
