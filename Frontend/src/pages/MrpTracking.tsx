import React, { useEffect, useMemo, useState } from 'react';
import { Box, Group, ActionIcon, TextInput, Text, Paper, Stack, Badge } from '@mantine/core';
import { OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { MantineDataTable, DataTableColumn } from '../components/molecules/MantineDataTable';
import { FileText, Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { mrpTrackingApi, MrpWiseStockSummary } from '../services/mrpTrackingApi';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';

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

  const totalQuantity = useMemo(
    () => data.reduce((sum, row) => sum + row.quantity, 0),
    [data],
  );

  const columns: DataTableColumn<MrpWiseStockSummary>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (row) => (
        <Box>
          <Text size="12px" fw={800} truncate>{row.productName}</Text>
          <Text size="10px" c="dimmed" ff="monospace" truncate>{row.sku}</Text>
        </Box>
      ),
      width: 260,
    },
    {
      key: 'mrp',
      header: 'MRP',
      sortable: true,
      render: (row) => <Text size="12px" fw={800} ff="monospace">{row.mrp !== null ? `₹${row.mrp.toFixed(2)}` : '-'}</Text>,
      width: 105,
    },
    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      align: 'right',
      render: (row) => <Text size="12px" fw={900} ff="monospace">{row.quantity}</Text>,
      width: 80,
    },
  ];

  return (
    <OperationsPage
      title="Product MRP Wise Quantity"
      description="Current remaining stock grouped by Product and MRP after inward, picking, and outward deduction."
      icon={FileText}
      hideHeader
    >
      <Stack gap="xs">
        <Paper radius="md" p="xs" withBorder style={{ background: 'rgba(15,23,42,0.66)', borderColor: 'rgba(34,211,238,0.16)' }}>
          <Group justify="space-between" gap="xs" wrap="wrap">
            <Group gap="xs" wrap="nowrap" className="min-w-0" style={{ flex: 1 }}>
              <ActionIcon variant="subtle" color="gray" onClick={() => navigate('/stock-check')}>
                <ArrowLeft size={16} />
              </ActionIcon>
              <Box className="min-w-0">
                <Text size="sm" fw={900} c="white" truncate>Product MRP Wise Quantity</Text>
                <Text size="10px" c="dimmed" truncate>Current stock by product and MRP</Text>
              </Box>
            </Group>
            <Group gap={6} wrap="nowrap">
              <TextInput
                size="xs"
                radius="md"
                w={200}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadData(search);
                }}
                placeholder="Search..."
                leftSection={<Search size={13} />}
              />
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() => void loadData(search)}
                loading={isLoading}
              >
                <RefreshCw size={13} />
              </ActionIcon>
              <Badge size="sm" variant="light" color="cyan" radius="md">
                {data.length} · {totalQuantity}
              </Badge>
            </Group>
          </Group>
        </Paper>

        <OperationsPanel
          title="MRP Quantity"
          icon={FileText}
          hideHeader
          contentClassName="p-2"
        >
        <MantineDataTable
          data={data}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => `${row.productId}-${row.mrp ?? 'no-mrp'}`}
          emptyIcon={FileText}
          emptyTitle="No MRP wise quantity"
          emptyDescription="No remaining stock found for the given criteria."
          itemLabel="MRP batches"
          enablePagination={false}
          minWidth={480}
        />
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
}
