import React, { useMemo, useState } from 'react';
import {
  Accordion,
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core';
import { OperationsEmptyState, OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  FileText,
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { mrpTrackingApi, MrpChange, MrpWiseStockSummary } from '../services/mrpTrackingApi';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';

type TabView = 'changes' | 'quantity';

// ---------- helpers ----------

const formatMoney = (value?: number | null) =>
  typeof value === 'number'
    ? new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
    : '—';

const getBatchTime = (row: MrpWiseStockSummary) =>
  row.invoiceDate ? new Date(row.invoiceDate).getTime() : 0;

type ProductMrpGroup = {
  productId: number;
  productName: string;
  sku: string;
  totalQty: number;
  batchCount: number;
  mrpCount: number;
  batches: MrpWiseStockSummary[];
};

// ---------- component ----------

export default function MrpTracking() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabView>('changes');
  const [search, setSearch] = useState('');

  // changes tab state
  const [changesData, setChangesData] = useState<MrpChange[] | null>(null);
  const [changesLoading, setChangesLoading] = useState(false);

  // quantity tab state
  const [qtyData, setQtyData] = useState<MrpWiseStockSummary[] | null>(null);
  const [qtyLoading, setQtyLoading] = useState(false);

  // ---- loaders ----

  const loadChanges = async (q: string) => {
    try {
      setChangesLoading(true);
      const result = await mrpTrackingApi.getMrpChanges(q || undefined);
      setChangesData(result || []);
    } catch {
      toast.error('Failed to load MRP changes');
    } finally {
      setChangesLoading(false);
    }
  };

  const loadQuantity = async (q: string) => {
    if (!q.trim()) {
      toast.error('Please enter a search query (Product Name or SKU)');
      return;
    }
    try {
      setQtyLoading(true);
      const result = await mrpTrackingApi.getMrpWiseStockSummary(q);
      setQtyData(result || []);
    } catch {
      toast.error('Failed to load MRP batches');
    } finally {
      setQtyLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'changes') void loadChanges(search);
    else void loadQuantity(search);
  };

  // ---- derived data for changes tab ----

  const changeStats = useMemo(() => {
    if (!changesData) return { total: 0, increases: 0, decreases: 0, noBase: 0 };
    let increases = 0;
    let decreases = 0;
    let noBase = 0;
    changesData.forEach((row) => {
      if (row.baseMrp === null) noBase++;
      else if (row.difference !== null && row.difference > 0) increases++;
      else if (row.difference !== null && row.difference < 0) decreases++;
    });
    return { total: changesData.length, increases, decreases, noBase };
  }, [changesData]);

  // ---- derived data for quantity tab ----

  const groupedProducts = useMemo<ProductMrpGroup[]>(() => {
    if (!qtyData) return [];
    const map = new Map<number, ProductMrpGroup>();

    qtyData.forEach((row) => {
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
  }, [qtyData]);

  const totalQuantity = useMemo(
    () => groupedProducts.reduce((sum, row) => sum + row.totalQty, 0),
    [groupedProducts],
  );

  const totalBatches = useMemo(
    () => groupedProducts.reduce((sum, row) => sum + row.batchCount, 0),
    [groupedProducts],
  );

  const isLoading = activeTab === 'changes' ? changesLoading : qtyLoading;

  return (
    <OperationsPage
      title="MRP Tracking"
      description="Track MRP price changes between product upload and inward invoices."
      icon={FileText}
      hideHeader
    >
      <Stack gap="xs">
        {/* ── header ── */}
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
              <ActionIcon variant="light" color="cyan" radius="md" onClick={() => navigate('/')}>
                <ArrowLeft size={16} />
              </ActionIcon>
              <ThemeIcon size={34} radius="md" variant="gradient" gradient={{ from: 'cyan.4', to: 'blue.7' }}>
                <Package size={17} />
              </ThemeIcon>
              <Box className="min-w-0">
                <Text size="sm" fw={950} c="white" truncate>
                  MRP Tracking
                </Text>
                <Text size="10px" c="cyan.1" truncate>
                  Detect MRP changes between product upload and inward invoices
                </Text>
              </Box>
            </Group>

            <Group gap={6} wrap="nowrap">
              <SegmentedControl
                size="xs"
                radius="md"
                value={activeTab}
                onChange={(v) => setActiveTab(v as TabView)}
                data={[
                  { label: 'MRP Changes', value: 'changes' },
                  { label: 'MRP Qty', value: 'quantity' },
                ]}
                styles={{
                  root: {
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(148,163,184,0.12)',
                  },
                }}
              />
              <TextInput
                size="sm"
                radius="md"
                w={240}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch();
                }}
                placeholder="Product, SKU, Invoice..."
                leftSection={<Search size={14} />}
              />
              <Button
                size="sm"
                radius="md"
                variant="light"
                color="cyan"
                onClick={handleSearch}
                loading={isLoading}
                leftSection={<Search size={14} />}
              >
                Search
              </Button>
            </Group>
          </Group>

          {/* ── summary cards ── */}
          {activeTab === 'changes' && changesData !== null && (
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs" mt="sm">
              <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <Text size="9px" c="dimmed" fw={900}>TOTAL CHANGES</Text>
                <Text size="lg" fw={950} c="white" lh={1}>{changeStats.total}</Text>
              </Paper>
              <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(239,68,68,0.15)' }}>
                <Text size="9px" c="dimmed" fw={900}>PRICE INCREASED</Text>
                <Text size="lg" fw={950} c="red.4" lh={1}>{changeStats.increases}</Text>
              </Paper>
              <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(34,197,94,0.15)' }}>
                <Text size="9px" c="dimmed" fw={900}>PRICE DECREASED</Text>
                <Text size="lg" fw={950} c="green.4" lh={1}>{changeStats.decreases}</Text>
              </Paper>
              <Paper radius="md" px="sm" py={7} withBorder style={{ background: 'rgba(15,23,42,0.58)', borderColor: 'rgba(251,191,36,0.15)' }}>
                <Text size="9px" c="dimmed" fw={900}>NO BASE MRP</Text>
                <Text size="lg" fw={950} c="yellow.4" lh={1}>{changeStats.noBase}</Text>
              </Paper>
            </SimpleGrid>
          )}

          {activeTab === 'quantity' && qtyData !== null && (
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
          )}
        </Paper>

        {/* ── content area ── */}
        <OperationsPanel title="MRP Data" icon={FileText} hideHeader contentClassName="p-2">
          {activeTab === 'changes' ? (
            <ChangesTab data={changesData} loading={changesLoading} />
          ) : (
            <QuantityTab
              data={qtyData}
              loading={qtyLoading}
              groupedProducts={groupedProducts}
            />
          )}
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
}

// =========================================================================
//  MRP Changes Tab
// =========================================================================

function ChangesTab({ data, loading }: { data: MrpChange[] | null; loading: boolean }) {
  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader color="cyan" size="sm" />
        <Text size="sm" c="dimmed">Searching MRP changes...</Text>
      </Group>
    );
  }

  if (data === null) {
    return (
      <Center py={100}>
        <Stack align="center" gap="xs">
          <ThemeIcon size={64} radius="xl" variant="light" color="cyan">
            <TrendingUp size={32} />
          </ThemeIcon>
          <Text fw={800} size="lg" c="white">Search to detect MRP Changes</Text>
          <Text size="sm" c="dimmed" maw={420} ta="center">
            Enter a Product Name, SKU, or Invoice number to find products whose MRP changed between upload and inward. Leave empty and search to see all changes.
          </Text>
        </Stack>
      </Center>
    );
  }

  if (data.length === 0) {
    return (
      <OperationsEmptyState
        icon={FileText}
        title="No MRP changes found"
        description="All inward MRPs match the product base MRP for the given search criteria."
      />
    );
  }

  return (
    <ScrollArea h="calc(100vh - 280px)" type="auto" offsetScrollbars>
      <Table striped highlightOnHover withTableBorder withColumnBorders style={{ background: 'rgba(15,23,42,0.4)', borderColor: 'rgba(34,211,238,0.1)' }}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Product</Table.Th>
            <Table.Th ta="right">Base MRP</Table.Th>
            <Table.Th ta="right">Inward MRP</Table.Th>
            <Table.Th ta="right">Change</Table.Th>
            <Table.Th>Invoice</Table.Th>
            <Table.Th>Party</Table.Th>
            <Table.Th ta="right">Qty</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.map((row, index) => {
            const isIncrease = row.difference !== null && row.difference > 0;
            const isDecrease = row.difference !== null && row.difference < 0;
            const noBase = row.baseMrp === null;

            return (
              <Table.Tr key={`${row.productId}-${row.invoiceNumber}-${index}`}>
                <Table.Td>
                  <Box>
                    <Text size="sm" fw={700} c="white" lineClamp={1}>{row.productName || 'Unknown'}</Text>
                    <Text size="10px" c="dimmed" ff="monospace">{row.sku || '-'}</Text>
                  </Box>
                </Table.Td>
                <Table.Td ta="right">
                  {noBase ? (
                    <Badge size="xs" variant="light" color="yellow" leftSection={<AlertTriangle size={10} />}>
                      Not set
                    </Badge>
                  ) : (
                    <Text fw={700} ff="monospace" c="dimmed">{formatMoney(row.baseMrp)}</Text>
                  )}
                </Table.Td>
                <Table.Td ta="right">
                  <Text fw={900} ff="monospace" c="white">{formatMoney(row.inwardMrp)}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  {noBase ? (
                    <Text size="xs" c="dimmed">—</Text>
                  ) : (
                    <Group gap={4} justify="flex-end" wrap="nowrap">
                      {isIncrease && <ArrowUp size={14} color="var(--mantine-color-red-4)" />}
                      {isDecrease && <ArrowDown size={14} color="var(--mantine-color-green-4)" />}
                      <Box>
                        <Text
                          fw={900}
                          ff="monospace"
                          size="sm"
                          c={isIncrease ? 'red.4' : isDecrease ? 'green.4' : 'dimmed'}
                        >
                          {isIncrease ? '+' : ''}{formatMoney(row.difference)}
                        </Text>
                        {row.changePercent !== null && (
                          <Text
                            size="10px"
                            ff="monospace"
                            fw={700}
                            c={isIncrease ? 'red.3' : isDecrease ? 'green.3' : 'dimmed'}
                            ta="right"
                          >
                            {isIncrease ? '+' : ''}{row.changePercent}%
                          </Text>
                        )}
                      </Box>
                    </Group>
                  )}
                </Table.Td>
                <Table.Td>
                  <Box>
                    <Text fw={800} ff="monospace" c="cyan.3" size="sm">{row.invoiceNumber || '-'}</Text>
                    <Text size="10px" c="dimmed">
                      {row.invoiceDate ? format(new Date(row.invoiceDate), 'dd MMM yyyy') : '-'}
                    </Text>
                  </Box>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed" lineClamp={1}>{row.partyName || 'Unknown'}</Text>
                </Table.Td>
                <Table.Td ta="right">
                  <Text fw={900} ff="monospace" c="white">{row.billedQty}</Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}

// =========================================================================
//  MRP Quantity Tab (existing view)
// =========================================================================

function QuantityTab({
  data,
  loading,
  groupedProducts,
}: {
  data: MrpWiseStockSummary[] | null;
  loading: boolean;
  groupedProducts: ProductMrpGroup[];
}) {
  if (loading) {
    return (
      <Group justify="center" py="xl">
        <Loader color="cyan" size="sm" />
        <Text size="sm" c="dimmed">Searching batches...</Text>
      </Group>
    );
  }

  if (data === null) {
    return (
      <Center py={100}>
        <Stack align="center" gap="xs">
          <ThemeIcon size={64} radius="xl" variant="light" color="cyan">
            <Search size={32} />
          </ThemeIcon>
          <Text fw={800} size="lg" c="white">Search to view MRP Batches</Text>
          <Text size="sm" c="dimmed" maw={400} ta="center">
            Enter a Product Name or SKU above to search for its active MRP batches.
          </Text>
        </Stack>
      </Center>
    );
  }

  if (groupedProducts.length === 0) {
    return (
      <OperationsEmptyState
        icon={FileText}
        title="No batches found"
        description="No invoice-wise MRP quantity found for the given search criteria."
      />
    );
  }

  return (
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
  );
}
