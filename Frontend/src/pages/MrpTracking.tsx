import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { OperationsEmptyState, OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { ArrowLeft, CalendarDays, FileText, IndianRupee, Package, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { mrpTrackingApi, MrpWiseStockSummary } from '../services/mrpTrackingApi';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';

type ProductMrpGroup = {
  productId: number;
  productName: string;
  sku: string;
  totalQty: number;
  batchCount: number;
  mrpCount: number;
  batches: MrpWiseStockSummary[];
};

const formatMoney = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
    : '-';

const getBatchTime = (row: MrpWiseStockSummary) =>
  row.invoiceDate ? new Date(row.invoiceDate).getTime() : 0;

export default function MrpTracking() {
  const navigate = useNavigate();
  const [data, setData] = useState<MrpWiseStockSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async (searchQuery: string = '') => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query (Product Name or SKU)');
      return;
    }
    try {
      setIsLoading(true);
      const result = await mrpTrackingApi.getMrpWiseStockSummary(searchQuery);
      setData(result || []);
    } catch {
      toast.error('Failed to load Product MRP batches');
    } finally {
      setIsLoading(false);
    }
  };

  // Removed useEffect on mount - wait for user to search

  const groupedProducts = useMemo<ProductMrpGroup[]>(() => {
    if (!data) return [];
    const map = new Map<number, ProductMrpGroup>();

    data.forEach((row) => {
      const group = map.get(row.productId) ?? {
        productId: row.productId,
        productName: row.productName || 'Unknown Product',
        sku: row.sku || '-',
        totalQty: 0,
        batchCount: 0,
        mrpCount: 0,
        batches: [],
      };

      group.totalQty += row.quantity;
      group.batches.push(row);
      map.set(row.productId, group);
    });

    return Array.from(map.values())
      .map((group) => {
        const mrps = new Set(group.batches.map((batch) => batch.mrp ?? 'NO_MRP'));
        return {
          ...group,
          batchCount: group.batches.length,
          mrpCount: mrps.size,
          batches: group.batches.sort(
            (left, right) =>
              getBatchTime(left) - getBatchTime(right) ||
              (left.invoiceNumber || '').localeCompare(right.invoiceNumber || '') ||
              Number(left.mrp || 0) - Number(right.mrp || 0),
          ),
        };
      })
      .sort((left, right) => left.productName.localeCompare(right.productName));
  }, [data]);

  const totalQuantity = useMemo(
    () => groupedProducts.reduce((sum, row) => sum + row.totalQty, 0),
    [groupedProducts],
  );

  const totalBatches = useMemo(
    () => groupedProducts.reduce((sum, row) => sum + row.batchCount, 0),
    [groupedProducts],
  );

  return (
    <OperationsPage
      title="Product MRP Wise Quantity"
      description="Current remaining stock grouped by product, then invoice-date batch and MRP price."
      icon={FileText}
      hideHeader
    >
      <Stack gap="xs">
        <Paper
          radius="lg"
          p="sm"
          withBorder
          style={{
            background:
              'linear-gradient(135deg, rgba(8,47,73,0.86) 0%, rgba(15,23,42,0.72) 55%, rgba(8,13,24,0.92) 100%)',
            borderColor: 'rgba(34,211,238,0.22)',
            boxShadow: '0 12px 34px rgba(34,211,238,0.10)',
          }}
        >
          <Group justify="space-between" gap="xs" wrap="wrap">
            <Group gap="xs" wrap="nowrap" className="min-w-0" style={{ flex: 1 }}>
              <ActionIcon variant="light" color="cyan" radius="md" onClick={() => navigate('/stock-check')}>
                <ArrowLeft size={16} />
              </ActionIcon>
              <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'cyan.4', to: 'blue.7' }}>
                <Package size={17} />
              </ThemeIcon>
              <Box className="min-w-0">
                <Text size="sm" fw={950} c="white" truncate>
                  Product MRP Wise Quantity
                </Text>
                <Text size="10px" c="cyan.1" truncate>
                  Product hierarchy → invoice date → invoice no → MRP price → quantity
                </Text>
              </Box>
            </Group>

            <Group gap={6} wrap="nowrap">
              <TextInput
                size="sm"
                radius="md"
                w={280}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadData(search);
                }}
                placeholder="Search product, SKU..."
                leftSection={<Search size={14} />}
              />
              <Button
                size="sm"
                radius="md"
                variant="light"
                color="cyan"
                onClick={() => void loadData(search)}
                loading={isLoading}
                leftSection={<Search size={14} />}
              >
                Find Batches
              </Button>
            </Group>
          </Group>

          <SimpleGrid cols={{ base: 3, sm: 3 }} spacing="xs" mt="sm">
            <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text size="9px" c="dimmed" fw={900}>PRODUCTS</Text>
              <Text size="lg" fw={950} c="white" lh={1}>{groupedProducts.length}</Text>
            </Paper>
            <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text size="9px" c="dimmed" fw={900}>BATCHES</Text>
              <Text size="lg" fw={950} c="cyan.3" lh={1}>{totalBatches}</Text>
            </Paper>
            <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text size="9px" c="dimmed" fw={900}>TOTAL QTY</Text>
              <Text size="lg" fw={950} c="green.3" lh={1}>{totalQuantity}</Text>
            </Paper>
          </SimpleGrid>
        </Paper>

        <OperationsPanel
          title="MRP Quantity"
          icon={FileText}
          hideHeader
          contentClassName="p-2"
        >
          {isLoading ? (
            <Group justify="center" py="xl">
              <Loader color="cyan" size="sm" />
              <Text size="sm" c="dimmed">Searching batches...</Text>
            </Group>
          ) : data === null ? (
            <Center py={100}>
              <Stack align="center" gap="xs">
                <ThemeIcon size={64} radius="xl" variant="light" color="cyan">
                  <Search size={32} />
                </ThemeIcon>
                <Text fw={800} size="lg" c="white">Search to view MRP Batches</Text>
                <Text size="sm" c="dimmed" maw={400} ta="center">
                  To keep performance fast, please enter a Product Name or SKU above to search for its active MRP batches.
                </Text>
              </Stack>
            </Center>
          ) : groupedProducts.length === 0 ? (
            <OperationsEmptyState
              icon={FileText}
              title="No batches found"
              description="No invoice-wise MRP quantity found for the given search criteria."
            />
          ) : (
            <ScrollArea h="calc(100vh - 245px)" type="auto" offsetScrollbars>
              <Accordion variant="separated" radius="md">
                {groupedProducts.map((product) => (
                  <Accordion.Item key={product.productId} value={product.productId.toString()} style={{ background: 'linear-gradient(135deg, rgba(15,23,42,0.86), rgba(2,6,23,0.76))', borderColor: 'rgba(148,163,184,0.14)' }}>
                    <Accordion.Control>
                      <Group justify="space-between" align="center" wrap="nowrap" pr="md">
                        <Group gap="sm" wrap="nowrap" className="min-w-0" style={{ flex: 1 }}>
                          <ThemeIcon size={38} radius="lg" variant="light" color="cyan">
                            <Package size={19} />
                          </ThemeIcon>
                          <Box className="min-w-0">
                            <Text size="sm" fw={900} c="white" truncate>{product.productName}</Text>
                            <Group gap={6} wrap="wrap" mt={4}>
                              <Badge size="xs" variant="light" color="gray" radius="sm">SKU: {product.sku}</Badge>
                              <Badge size="xs" variant="light" color="cyan" radius="sm">{product.batchCount} Batches</Badge>
                              <Badge size="xs" variant="light" color="blue" radius="sm">{product.mrpCount} MRPs</Badge>
                            </Group>
                          </Box>
                        </Group>
                        <Box ta="right">
                          <Text size="10px" c="dimmed" fw={900}>TOTAL IN STOCK</Text>
                          <Text size="xl" fw={950} c="green.3" ff="monospace" lh={1}>{product.totalQty}</Text>
                        </Box>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel pb="sm">
                      <Table striped highlightOnHover withTableBorder withColumnBorders style={{ background: 'rgba(15,23,42,0.4)', borderColor: 'rgba(34,211,238,0.1)' }}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Invoice Date</Table.Th>
                            <Table.Th>Invoice No</Table.Th>
                            <Table.Th>Supplier (Party)</Table.Th>
                            <Table.Th ta="right">Billed Qty</Table.Th>
                            <Table.Th ta="right">MRP</Table.Th>
                            <Table.Th ta="right">Remaining Stock</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {product.batches.map((batch, index) => (
                            <Table.Tr key={`${batch.invoiceNumber}-${batch.mrp}-${index}`}>
                              <Table.Td>
                                {batch.invoiceDate ? format(new Date(batch.invoiceDate), 'dd MMM yyyy') : '-'}
                              </Table.Td>
                              <Table.Td>
                                <Text fw={800} ff="monospace" c="cyan.3">{batch.invoiceNumber || '-'}</Text>
                              </Table.Td>
                              <Table.Td>{batch.partyName || 'Unknown'}</Table.Td>
                              <Table.Td ta="right">{batch.billedQty || 0}</Table.Td>
                              <Table.Td ta="right">
                                <Text fw={900} c="yellow.3" ff="monospace">{formatMoney(batch.mrp)}</Text>
                              </Table.Td>
                              <Table.Td ta="right">
                                <Text fw={950} c="green.3" ff="monospace">{batch.quantity}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </ScrollArea>
          )}
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
}
