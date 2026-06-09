import React, { useEffect, useState } from 'react';
import { Box, Group, ActionIcon, TextInput } from '@mantine/core';
import { OperationsPage, OperationsPanel } from '../components/organisms/Operations/OperationsShell';
import { MantineDataTable, DataTableColumn } from '../components/molecules/MantineDataTable';
import { format } from 'date-fns';
import { FileText, Search, RefreshCw, ArrowLeft } from 'lucide-react';
import { mrpTrackingApi, MrpTrackingResult } from '../services/mrpTrackingApi';
import { useNavigate } from 'react-router-dom';
import { toast } from '../lib/toast';
import { Button } from '../components/atoms/Button';

export default function MrpTracking() {
  const navigate = useNavigate();
  const [data, setData] = useState<MrpTrackingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async (searchQuery: string = '') => {
    try {
      setIsLoading(true);
      const result = await mrpTrackingApi.getTrackingReport(searchQuery);
      setData(result || []);
    } catch {
      toast.error('Failed to load MRP tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const columns: DataTableColumn<MrpTrackingResult>[] = [
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
      width: 250,
    },
    {
      key: 'invoiceNumber',
      header: 'Invoice No.',
      sortable: true,
      render: (row) => row.invoiceNumber,
      width: 150,
    },
    {
      key: 'invoiceDate',
      header: 'Invoice Date',
      sortable: true,
      render: (row) => row.invoiceDate ? format(new Date(row.invoiceDate), 'dd MMM yyyy') : '-',
      width: 120,
    },
    {
      key: 'mrp',
      header: 'MRP',
      sortable: true,
      render: (row) => row.mrp !== null ? `₹${row.mrp.toFixed(2)}` : '-',
      width: 100,
    },
    {
      key: 'locationCode',
      header: 'Location',
      sortable: true,
      render: (row) => <div className="font-medium text-cyan-600">{row.locationCode}</div>,
      width: 120,
    },
    {
      key: 'quantity',
      header: 'Allocated Qty',
      sortable: true,
      align: 'right',
      render: (row) => row.quantity,
      width: 120,
    },
  ];

  return (
    <OperationsPage
      title="MRP / Batch Tracking"
      description="Track inwarded product quantities and their specific locations based on MRP and invoices."
      icon={FileText}
      headerAction={
        <Button
          variant="outline"
          leftIcon={<ArrowLeft size={16} />}
          onClick={() => navigate('/inward')}
        >
          Back to Inward
        </Button>
      }
    >
      <OperationsPanel
        title="Allocation Ledger"
        icon={FileText}
        description="Detailed view of product quantities placed at specific locations."
        action={
          <Group gap="xs" wrap="nowrap">
            <TextInput
              size="xs"
              radius="md"
              w={240}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadData(search);
              }}
              placeholder="Search product, SKU, invoice..."
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
          records={data}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          emptyTitle="No tracking data"
          emptyDescription="No location allocations found for the given criteria."
          itemLabel="allocations"
          enablePagination={false}
          minWidth={1000}
        />
      </OperationsPanel>
    </OperationsPage>
  );
}
