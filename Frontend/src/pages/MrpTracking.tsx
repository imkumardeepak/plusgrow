import React, { useEffect, useMemo, useState } from 'react';
import { Box, Group, ActionIcon, TextInput, Text } from '@mantine/core';
import { OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { MantineDataTable, DataTableColumn } from '../components/molecules/MantineDataTable';
import { FileText, Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { mrpTrackingApi, MrpWiseStockSummary } from '../services/mrpTrackingApi';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';
import { Button } from '../components/atoms/Button';

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
          <div className="font-medium">{row.productName}</div>
          <div className="text-xs text-gray-500">{row.sku}</div>
        </Box>
      ),
      width: 320,
    },
    {
      key: 'mrp',
      header: 'MRP',
      sortable: true,
      render: (row) => row.mrp !== null ? `₹${row.mrp.toFixed(2)}` : '-',
      width: 140,
    },
    {
      key: 'quantity',
      header: 'Current Qty',
      sortable: true,
      align: 'right',
      render: (row) => <Text fw={800}>{row.quantity}</Text>,
      width: 140,
    },
  ];

  return (
    <OperationsPage
      title="Product MRP Wise Quantity"
      description="Current remaining stock grouped by Product and MRP after inward, picking, and outward deduction."
      icon={FileText}
      actions={
        <Button
          variant="outline"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/stock-check')}
        >
          Back to Stock Check
        </Button>
      }
    >
      <OperationsPanel
        title="Product MRP Wise Quantity"
        icon={FileText}
        description={`Showing ${data.length} product/MRP batches with total quantity ${totalQuantity}.`}
        action={
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs"
              radius="md"
              w={260}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadData(search);
              }}
              placeholder="Search product or SKU..."
              leftSection={<Search size={14} />}
            />
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="gray"
              onClick={() => void loadData(search)}
              loading={isLoading}
            >
              <RefreshCw size={14} />
            </ActionIcon>
          </Group>
        }
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
          minWidth={700}
        />
      </OperationsPanel>
    </OperationsPage>
  );
}
