import React, { useState } from "react";
import { ArrowLeft, RefreshCw, Navigation, CheckCircle2, XCircle } from "lucide-react";
import { Box, Group, Paper, Stack, Text, Badge, ActionIcon, ScrollArea, Code } from "@mantine/core";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5179/api";

type PendingOrder = {
  orderNo: number;
  orderDate: string;
  customerName: string;
  compositeShippingCharges: number;
  totalItems: number;
  syncStatus: string;
};

export function ResellerTallySyncMode({
  onBack,
  isMobile,
}: {
  onBack: () => void;
  isMobile: boolean;
}) {
  const queryClient = useQueryClient();
  const [tallyResponses, setTallyResponses] = useState<Record<number, string>>({});

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
    mutationFn: async (orderNo: number) => {
      const response = await fetch(`${API_BASE_URL}/resellertally/sync/${orderNo}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to sync to Tally");
      return { orderNo, tallyResponse: result.tallyResponse, message: result.message };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      setTallyResponses((prev) => ({ ...prev, [data.orderNo]: data.tallyResponse }));
      queryClient.invalidateQueries({ queryKey: ["reseller-tally-pending"] });
    },
    onError: (error: any, orderNo) => {
      toast.error(error.message || "An error occurred");
      // Even on error, we might have a tally response if it failed on Tally side
      if (error.tallyResponse) {
        setTallyResponses((prev) => ({ ...prev, [orderNo]: error.tallyResponse }));
      }
    },
  });

  return (
    <Stack gap="md" h="100%">
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
            leftSection={<RefreshCw size={16} />}
          >
            Refresh List
          </Button>
        </Group>
      </Paper>

      <ScrollArea style={{ flex: 1 }} type="auto" offsetScrollbars>
        <Stack gap="md" pb="xl">
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
            orders.map((order) => (
              <Paper key={order.orderNo} withBorder p="md" radius="md">
                <Group justify="space-between" align="flex-start" mb="sm">
                  <Box>
                    <Group gap="xs">
                      <Text fw={700} size="md">
                        Order #{order.orderNo}
                      </Text>
                      {order.syncStatus === "Success" ? (
                        <Badge color="green" variant="light" leftSection={<CheckCircle2 size={12} />}>
                          Synced
                        </Badge>
                      ) : order.syncStatus === "Failed" ? (
                        <Badge color="red" variant="light" leftSection={<XCircle size={12} />}>
                          Failed
                        </Badge>
                      ) : (
                        <Badge color="blue" variant="light">
                          Pending
                        </Badge>
                      )}
                    </Group>
                    <Text size="sm" c="dimmed" mt={4}>
                      Date: {order.orderDate} &bull; Customer: {order.customerName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Items: {order.totalItems} &bull; Shipping: {order.compositeShippingCharges}
                    </Text>
                  </Box>
                  <Button
                    onClick={() => syncMutation.mutate(order.orderNo)}
                    loading={syncMutation.isPending && syncMutation.variables === order.orderNo}
                    disabled={order.syncStatus === "Success"}
                    leftSection={<Navigation size={16} />}
                    color="blue"
                  >
                    Push to Tally
                  </Button>
                </Group>
                
                {tallyResponses[order.orderNo] && (
                  <Box mt="md" p="sm" style={{ backgroundColor: "#1a1b1e", borderRadius: 8 }}>
                    <Text size="xs" fw={700} mb="xs" c="dimmed">Tally Response:</Text>
                    <ScrollArea type="auto">
                      <Code block style={{ backgroundColor: "transparent", color: "#a6e22e", whiteSpace: "pre-wrap" }}>
                        {tallyResponses[order.orderNo]}
                      </Code>
                    </ScrollArea>
                  </Box>
                )}
              </Paper>
            ))
          )}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
