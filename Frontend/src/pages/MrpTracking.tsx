import React, { useEffect, useMemo, useState } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
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
  const [data, setData] = useState<MrpWiseStockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async (searchQuery: string = '') => {
    try {
      setIsLoading(true);
      const result = await mrpTrackingApi.getMrpWiseStockSummary(searchQuery);
      setData(result || []);
    } catch {
      toast.error('Failed to load Product MRP Wise Quantity');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const groupedProducts = useMemo<ProductMrpGroup[]>(() => {
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
                size="xs"
                radius="md"
                w={220}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadData(search);
                }}
                placeholder="Search product, SKU, invoice..."
                leftSection={<Search size={13} />}
              />
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="cyan"
                onClick={() => void loadData(search)}
                loading={isLoading}
              >
                <RefreshCw size={13} />
              </ActionIcon>
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
              <Text size="sm" c="dimmed">Loading MRP wise quantity...</Text>
            </Group>
          ) : groupedProducts.length === 0 ? (
            <OperationsEmptyState
              icon={FileText}
              title="No MRP wise quantity"
              description="No invoice-wise MRP quantity found for the given criteria."
            />
          ) : (
            <ScrollArea h="calc(100vh - 245px)" type="auto" offsetScrollbars>
              <Stack gap="sm" pr={4}>
                {groupedProducts.map((product) => (
                  <Paper
                    key={product.productId}
                    radius="lg"
                    withBorder
                    p="sm"
                    style={{
                      background: 'linear-gradient(135deg, rgba(15,23,42,0.86), rgba(2,6,23,0.76))',
                      borderColor: 'rgba(148,163,184,0.14)',
                    }}
                  >
                    <Group justify="space-between" align="flex-start" gap="xs" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" className="min-w-0" style={{ flex: 1 }}>
                        <ThemeIcon size={38} radius="lg" variant="light" color="cyan">
                          <Package size={19} />
                        </ThemeIcon>
                        <Box className="min-w-0">
                          <Text size="sm" fw={950} c="white" truncate>{product.productName}</Text>
                          <Group gap={6} wrap="wrap" mt={3}>
                            <Badge size="xs" variant="light" color="gray" radius="sm">SKU {product.sku}</Badge>
                            <Badge size="xs" variant="light" color="cyan" radius="sm">{product.batchCount} batches</Badge>
                            <Badge size="xs" variant="light" color="blue" radius="sm">{product.mrpCount} MRP</Badge>
                          </Group>
                        </Box>
                      </Group>
                      <Box ta="right">
                        <Text size="9px" c="dimmed" fw={900}>TOTAL QTY</Text>
                        <Text size="xl" fw={950} c="green.3" ff="monospace" lh={1}>{product.totalQty}</Text>
                      </Box>
                    </Group>

                    <Divider my="xs" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />

                    <Stack gap={6}>
                      {product.batches.map((batch, index) => (
                        <Paper
                          key={`${product.productId}-${batch.invoiceNumber ?? 'no-invoice'}-${batch.invoiceDate ?? 'no-date'}-${batch.mrp ?? 'no-mrp'}-${index}`}
                          radius="md"
                          p="xs"
                          withBorder
                          style={{
                            background: index % 2 === 0 ? 'rgba(8,47,73,0.22)' : 'rgba(15,23,42,0.42)',
                            borderColor: 'rgba(34,211,238,0.10)',
                          }}
                        >
                          <Group justify="space-between" gap="xs" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap" className="min-w-0" style={{ flex: 1 }}>
                              <ThemeIcon size={28} radius="md" variant="light" color="blue">
                                <CalendarDays size={14} />
                              </ThemeIcon>
                              <Box className="min-w-0">
                                <Text size="12px" fw={850} c="white" truncate>
                                  {batch.invoiceDate ? format(new Date(batch.invoiceDate), 'dd MMM yyyy') : 'No date'}
                                  {' · '}
                                  <Text span ff="monospace" c="cyan.3">{batch.invoiceNumber || '-'}</Text>
                                </Text>
                                <Text size="10px" c="dimmed" truncate>Invoice batch, ordered by invoice date</Text>
                              </Box>
                            </Group>

                            <Group gap="xs" wrap="nowrap">
                              <Paper radius="md" px="xs" py={5} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(255,255,255,0.08)', minWidth: 92 }}>
                                <Group gap={4} justify="flex-end" wrap="nowrap">
                                  <IndianRupee size={12} color="var(--mantine-color-yellow-4)" />
                                  <Text size="12px" fw={950} c="yellow.3" ff="monospace">{formatMoney(batch.mrp)}</Text>
                                </Group>
                              </Paper>
                              <Paper radius="md" px="xs" py={5} withBorder style={{ background: 'rgba(20,83,45,0.20)', borderColor: 'rgba(34,197,94,0.16)', minWidth: 64 }}>
                                <Text size="9px" c="dimmed" fw={900} ta="right">QTY</Text>
                                <Text size="14px" fw={950} c="green.3" ff="monospace" ta="right" lh={1}>{batch.quantity}</Text>
                              </Paper>
                            </Group>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          )}
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
}
