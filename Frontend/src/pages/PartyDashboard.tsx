import React, { memo, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBox,
  IconClipboardCheck,
  IconMapPin,
  IconPackage,
  IconSearch,
  IconStack2,
} from "@tabler/icons-react";

import {
  partyDashboardApi,
  type PartyDashboardProduct,
  type PartyDashboardSummary,
} from "../services/masterApi";
import { toast } from "../lib/toast";

const emptySummary: PartyDashboardSummary = {
  partyName: "",
  partyEmail: "",
  productCount: 0,
  totalStockQuantity: 0,
  locatedQuantity: 0,
  unlocatedQuantity: 0,
  products: [],
};

const formatNumber = (value: number) => value.toLocaleString("en-IN");

const LocationList = ({ product }: { product: PartyDashboardProduct }) => {
  if (product.locations.length === 0) {
    return (
      <Text size="xs" c="dimmed">
        No location allotted
      </Text>
    );
  }

  return (
    <Group gap={6}>
      {product.locations.map((location) => (
        <Badge
          key={`${product.productId}-${location.locationCode}`}
          color="cyan"
          variant="light"
          radius="sm"
        >
          {location.locationCode}: {formatNumber(location.quantity)}
        </Badge>
      ))}
    </Group>
  );
};

export const PartyDashboard = memo(function PartyDashboard() {
  const [summary, setSummary] = useState<PartyDashboardSummary>(emptySummary);
  const [search, setSearch] = useState("");
  const [stockCheckProductId, setStockCheckProductId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await partyDashboardApi.getSummary();
        if (isMounted) setSummary(data);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Unable to load party stock";
        if (isMounted) setError(message);
        toast.error("Party dashboard failed to load");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return summary.products;

    return summary.products.filter((product) => {
      return (
        product.productName.toLowerCase().includes(query) ||
        product.skuCode.toLowerCase().includes(query) ||
        (product.alias || "").toLowerCase().includes(query) ||
        (product.commodityName || "").toLowerCase().includes(query) ||
        product.locations.some((location) =>
          location.locationCode.toLowerCase().includes(query),
        )
      );
    });
  }, [search, summary.products]);

  const stockCheckOptions = useMemo(() => {
    return summary.products.map((product) => ({
      value: product.productId.toString(),
      label: `${product.skuCode || "N/A"} - ${product.productName}`,
    }));
  }, [summary.products]);

  const stockCheckProduct = useMemo(() => {
    return (
      summary.products.find(
        (product) => product.productId.toString() === stockCheckProductId,
      ) ?? null
    );
  }, [stockCheckProductId, summary.products]);

  if (isLoading) {
    return (
      <Center mih="60dvh">
        <Stack align="center" gap="sm">
          <Loader color="cyan" />
          <Text size="sm" c="dimmed">
            Loading your stock ledger...
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      {error ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title="Stock ledger unavailable"
        >
          {error}
        </Alert>
      ) : null}

      <Paper
        radius="md"
        p={{ base: "md", md: "lg" }}
        withBorder
        style={{
          background:
            "linear-gradient(135deg, rgba(10, 21, 35, 0.96), rgba(8, 15, 26, 0.98))",
          borderColor: "rgba(34, 211, 238, 0.16)",
        }}
      >
        <Group justify="space-between" align="flex-start" gap="md">
          <Group gap="md" wrap="nowrap">
            <ThemeIcon color="cyan" variant="light" size={46} radius="md">
              <IconStack2 size={24} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text size="xs" c="cyan.3" fw={800} tt="uppercase">
                Party Stock Dashboard
              </Text>
              <Text fz={{ base: 22, md: 30 }} fw={900} c="white" lh={1.1}>
                {summary.partyName || "Party"}
              </Text>
              <Text size="sm" c="dimmed">
                {summary.partyEmail}
              </Text>
            </Stack>
          </Group>
          <Badge color="green" variant="light" size="lg">
            Read only
          </Badge>
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <ThemeIcon color="cyan" variant="light" size={38}>
              <IconPackage size={20} />
            </ThemeIcon>
            <Badge color="cyan" variant="light">
              Products
            </Badge>
          </Group>
          <Text size="xl" fw={900} mt="md">
            {formatNumber(summary.productCount)}
          </Text>
          <Text size="xs" c="dimmed">
            Product records mapped to your party
          </Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <ThemeIcon color="teal" variant="light" size={38}>
              <IconBox size={20} />
            </ThemeIcon>
            <Badge color="teal" variant="light">
              Stock
            </Badge>
          </Group>
          <Text size="xl" fw={900} mt="md">
            {formatNumber(summary.totalStockQuantity)}
          </Text>
          <Text size="xs" c="dimmed">
            Current available quantity
          </Text>
        </Card>
        <Card withBorder radius="md" p="md">
          <Group justify="space-between">
            <ThemeIcon color="orange" variant="light" size={38}>
              <IconMapPin size={20} />
            </ThemeIcon>
            <Badge color="orange" variant="light">
              Located
            </Badge>
          </Group>
          <Text size="xl" fw={900} mt="md">
            {formatNumber(summary.locatedQuantity)}
          </Text>
          <Text size="xs" c="dimmed">
            {formatNumber(summary.unlocatedQuantity)} units without location
          </Text>
        </Card>
      </SimpleGrid>

      <Tabs defaultValue="ledger" variant="pills" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="ledger" leftSection={<IconBox size={16} />}>
            Stock Ledger
          </Tabs.Tab>
          <Tabs.Tab
            value="stock-check"
            leftSection={<IconClipboardCheck size={16} />}
          >
            Stock Check
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ledger">
          <Card withBorder radius="md" p={0}>
            <Group justify="space-between" p="md" pb="xs" gap="md">
              <Group gap="xs">
                <IconBox size={18} color="var(--mantine-color-cyan-4)" />
                <Text fw={800}>My Products</Text>
                <Badge variant="light">{filteredProducts.length} rows</Badge>
              </Group>
              <TextInput
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search SKU, product, location..."
                leftSection={<IconSearch size={15} />}
                size="xs"
                radius="md"
                w={{ base: "100%", sm: 280 }}
              />
            </Group>

            <ScrollArea>
              <Table striped highlightOnHover miw={920}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th>Details</Table.Th>
                    <Table.Th ta="right">Stock</Table.Th>
                    <Table.Th>Location</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredProducts.map((product) => (
                    <Table.Tr key={product.productId}>
                      <Table.Td>
                        <Badge variant="light" color="gray">
                          {product.skuCode || "N/A"}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={800} lineClamp={1}>
                          {product.productName}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {product.alias || "No alias"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={700}>
                          {product.commodityName || "No commodity"}
                        </Text>
                        <Text size="11px" c="dimmed">
                          {product.netQuantity || "-"} {product.unitType || ""}
                          {product.mrp ? ` · MRP ${product.mrp}` : ""}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={900} c="cyan.3">
                          {formatNumber(product.currentQuantity)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <LocationList product={product} />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {filteredProducts.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={5}>
                        <Center py="xl">
                          <Text size="sm" c="dimmed">
                            No products match this view.
                          </Text>
                        </Center>
                      </Table.Td>
                    </Table.Tr>
                  ) : null}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="stock-check">
          <Card withBorder radius="md" p="md">
            <Stack gap="md">
              <Group justify="space-between" align="flex-start" gap="md">
                <Group gap="xs">
                  <IconClipboardCheck
                    size={18}
                    color="var(--mantine-color-cyan-4)"
                  />
                  <Text fw={800}>Stock Check</Text>
                </Group>
                <Select
                  value={stockCheckProductId}
                  onChange={setStockCheckProductId}
                  data={stockCheckOptions}
                  placeholder="Select SKU or product"
                  searchable
                  clearable
                  leftSection={<IconSearch size={15} />}
                  radius="md"
                  w={{ base: "100%", sm: 360 }}
                />
              </Group>

              {stockCheckProduct ? (
                <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                  <Card withBorder radius="md" p="md">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Product
                    </Text>
                    <Text fw={900} mt={6} lineClamp={2}>
                      {stockCheckProduct.productName}
                    </Text>
                    <Badge mt="xs" variant="light" color="gray">
                      {stockCheckProduct.skuCode || "N/A"}
                    </Badge>
                  </Card>

                  <Card withBorder radius="md" p="md">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Current Stock
                    </Text>
                    <Text fz={30} fw={900} c="cyan.3" mt={2}>
                      {formatNumber(stockCheckProduct.currentQuantity)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {stockCheckProduct.netQuantity || "-"}{" "}
                      {stockCheckProduct.unitType || ""}
                    </Text>
                  </Card>

                  <Card withBorder radius="md" p="md">
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Location
                    </Text>
                    <Stack gap="xs" mt="sm">
                      <LocationList product={stockCheckProduct} />
                    </Stack>
                  </Card>
                </SimpleGrid>
              ) : (
                <Center py="xl">
                  <Text size="sm" c="dimmed">
                    Select a product for stock check.
                  </Text>
                </Center>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
});

export default PartyDashboard;
