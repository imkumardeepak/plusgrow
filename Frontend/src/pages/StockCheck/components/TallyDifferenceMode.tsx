import React, { useState, useEffect } from "react";
import { Table, Group, Text, Badge, Card, Center, Loader, TextInput, ActionIcon } from "@mantine/core";
import { Search, RefreshCw, AlertTriangle } from "lucide-react";
import { productsApi, tallySyncApi, Product } from "../../../services/masterApi";
import { OperationsPage } from "../../../components/organisms/Operations/OperationsShell";

interface TallyDifferenceModeProps {
  onBack?: () => void;
  isMobile?: boolean;
}

import { ModeHeader } from "./ModeHeader";

export const TallyDifferenceMode: React.FC<TallyDifferenceModeProps> = ({ onBack, isMobile }) => {
  const [wmsProducts, setWmsProducts] = useState<Product[]>([]);
  const [tallyItems, setTallyItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all local products (assume pageSize 10000 or similar to get all, or just let backend handle if it returns all when no pagination specified)
      // We'll use a large pageSize to get everything for accurate diffing
      const [wmsRes, tallyData] = await Promise.all([
        productsApi.getAll(), 
        tallySyncApi.getStockItems()
      ]);
      setWmsProducts(wmsRes);
      setTallyItems(tallyData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute missing products
  // WMS SKU <-> Tally partNo
  const missingInWms = React.useMemo(() => {
    if (!wmsProducts.length || !tallyItems.length) return [];
    
    // Create a set of local SKUs (lowercased/trimmed for safe comparison)
    const localSkus = new Set(
      wmsProducts.map(p => (p.sku || "").trim().toLowerCase()).filter(s => s !== "")
    );

    // Filter Tally items whose partNo is NOT in the local SKUs set
    const missing = tallyItems.filter(t => {
      const pNo = (t.partNo || "").trim().toLowerCase();
      if (pNo === "" || pNo === "na") return false; // Ignore if tally item has no partNo
      return !localSkus.has(pNo);
    });

    return missing;
  }, [wmsProducts, tallyItems]);

  const filteredMissing = React.useMemo(() => {
    if (!search) return missingInWms;
    const lowerSearch = search.toLowerCase();
    return missingInWms.filter(item => 
      (item.name || "").toLowerCase().includes(lowerSearch) || 
      (item.partNo || "").toLowerCase().includes(lowerSearch) ||
      (item.category || "").toLowerCase().includes(lowerSearch)
    );
  }, [missingInWms, search]);

  return (
    <OperationsPage title="Tally Reconciliation" description="View products that exist in Tally but are missing in your local WMS Master." icon={AlertTriangle} hideHeader>
      <ModeHeader title="Tally Difference" icon={AlertTriangle} onBack={onBack!} isMobile={!!isMobile} />
      <Card shadow="sm" p="lg" radius="md" withBorder bg="dark.7" mt="md">
        <Group justify="space-between" mb="md">
          <Group>
            <Text size="xl" fw={700} c="white">Missing Products in WMS</Text>
            <Badge color="red" variant="light">{filteredMissing.length} Items Found</Badge>
          </Group>
          <Group>
            <TextInput
              placeholder="Search by Name or Part No..."
              leftSection={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={250}
            />
            <ActionIcon onClick={fetchData} variant="light" color="blue" size="lg">
              <RefreshCw size={20} />
            </ActionIcon>
          </Group>
        </Group>

        {loading ? (
          <Center p="xl">
            <Loader size="lg" type="dots" />
          </Center>
        ) : error ? (
          <Center p="xl">
            <Text c="red">{error}</Text>
          </Center>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth: 800 }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Tally Name</Table.Th>
                  <Table.Th>Part No (SKU)</Table.Th>
                  <Table.Th>Category</Table.Th>
                  <Table.Th>Base Unit</Table.Th>
                  <Table.Th>Opening Qty</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredMissing.length > 0 ? (
                  filteredMissing.map((item, idx) => (
                    <Table.Tr key={idx} style={{ backgroundColor: 'rgba(250, 82, 82, 0.1)' }}>
                      <Table.Td>
                        <Text fw={500} c="white">{item.name}</Text>
                        {item.alias !== "NA" && <Text size="xs" c="dimmed">{item.alias}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Badge color="yellow" variant="outline">{item.partNo}</Badge>
                      </Table.Td>
                      <Table.Td>{item.category}</Table.Td>
                      <Table.Td>{item.unit}</Table.Td>
                      <Table.Td>{item.openingqnty}</Table.Td>
                      <Table.Td>
                        <Badge color="red">Missing in Master</Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center p="xl">
                        <Text c="dimmed">All products are synced! No missing part numbers found.</Text>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </div>
        )}
      </Card>
    </OperationsPage>
  );
};
