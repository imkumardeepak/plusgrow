import React, { memo, useState, useRef, useEffect } from "react";
import {
  Boxes,
  IndianRupee,
  MapPin,
  ScanLine,
  Search,
} from "lucide-react";
import { Group, Paper, SimpleGrid, Stack, Text, TextInput, Loader, Box, Badge } from "@mantine/core";
import { Button } from "../components/atoms/Button";
import { ProductNotFound } from "../components/molecules/ProductNotFound";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  productsApi,
  type ProductLookupResult,
} from "../services/masterApi";

export const ProductQuery = memo(function ProductQuery() {
  const [scanInput, setScanInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setQueryResult] = useState<ProductLookupResult | null>(null);
  const [notFoundSku, setNotFoundSku] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusScanner = () => {
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawInput = scanInput.trim();
    if (!rawInput) return;

    const sku = rawInput.split("#")[0].trim().toUpperCase();
    setScanInput(sku);

    setIsSearching(true);
    try {
      const result = await productsApi.lookup(sku);
      setQueryResult(result);
      setNotFoundSku(null);
    } catch {
      // Show an in-page "Product Not Found" state instead of an error toast.
      setQueryResult(null);
      setNotFoundSku(sku);
    } finally {
      setIsSearching(false);
      focusScanner();
    }
  };

  return (
    <OperationsPage
      title="Product Query"
      description="Scan a barcode or enter a SKU code to lookup product specifications, stock levels, and exact location-wise storage allocations."
      icon={ScanLine}
      hideHeader
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Item Lookup"
          icon={ScanLine}
          description="Scan or enter a SKU to search the warehouse catalog."
          className="lg:col-span-4 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                SKU CODE
              </Text>
              <TextInput
                ref={inputRef}
                size="sm"
                radius="md"
                placeholder="Scan or enter SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.currentTarget.value)}
                required
                styles={{
                  input: {
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                  },
                }}
                leftSection={isSearching ? <Loader size={14} /> : <Search size={14} />}
              />
            </div>

            <Group gap="xs" wrap="nowrap">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isSearching}
                loading={isSearching}
              >
                Search
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => {
                  setScanInput("");
                  setQueryResult(null);
                  setNotFoundSku(null);
                  focusScanner();
                }}
              >
                Clear
              </Button>
            </Group>
          </form>
        </OperationsPanel>

        <OperationsPanel
          title="Query Details"
          icon={Boxes}
          description="View product specifications, total stock quantity, and locations."
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {notFoundSku && !lookupResult ? (
            <ProductNotFound sku={notFoundSku} />
          ) : !lookupResult ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Boxes size={48} style={{ opacity: 0.2 }} className="text-slate-500 mb-3" />
              <Text size="sm" c="dimmed">
                Enter a SKU code to search.
              </Text>
            </div>
          ) : (
            <Stack gap="sm">
              <Paper
                radius="lg"
                p="md"
                withBorder
                style={{
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(15, 23, 42, 0.72))",
                  borderColor: "rgba(34, 211, 238, 0.16)",
                }}
              >
                <Group justify="space-between" align="center">
                  <div>
                    <Group gap="xs" wrap="nowrap">
                      <Badge size="sm" radius="md" variant="default" color="gray">
                        {lookupResult.sku}
                      </Badge>
                      <Badge size="sm" radius="md" variant={lookupResult.currentStock ? "success" : "warning"}>
                        {lookupResult.currentStock ? "Stock Available" : "No Stock"}
                      </Badge>
                    </Group>
                    <Text size="lg" fw={900} mt="xs" style={{ color: "var(--mantine-color-cyan-3)" }}>
                      {lookupResult.product?.name || "Unknown Product"}
                    </Text>
                  </div>
                </Group>
              </Paper>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Group gap={6}>
                    <Boxes size={14} style={{ color: "var(--mantine-color-cyan-4)" }} />
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">Current Stock</Text>
                  </Group>
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.currentStock}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Group gap={6}>
                    <MapPin size={14} style={{ color: "var(--mantine-color-cyan-4)" }} />
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">Allotted Locations</Text>
                  </Group>
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.locations.length}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Group gap={6}>
                    <IndianRupee size={14} style={{ color: "var(--mantine-color-cyan-4)" }} />
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">MRP</Text>
                  </Group>
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.product?.mrp ? `Rs ${lookupResult.product.mrp.toFixed(2)}` : "N/A"}
                  </Text>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Group gap={6} mb="xs">
                    <Boxes size={14} style={{ color: "var(--mantine-color-cyan-4)" }} />
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">Product Specifications</Text>
                  </Group>
                  <SimpleGrid cols={2} spacing={6}>
                    <Info label="Name" value={lookupResult.product?.name || "N/A"} />
                    <Info label="SKU" value={lookupResult.sku} />
                    <Info label="MRP" value={lookupResult.product?.mrp ? `Rs ${lookupResult.product.mrp.toFixed(2)}` : "N/A"} />
                    <Info label="USSP" value={lookupResult.product?.ussp ? `Rs ${lookupResult.product.ussp.toFixed(2)}` : "N/A"} />
                    <Info label="Net Qty." value={lookupResult.product?.netQuantity || "-"} />
                    <Info label="Unit" value={lookupResult.product?.unitType || "-"} />
                    <Info label="Country" value={lookupResult.product?.countryOfOrigin || "-"} />
                    <Info label="Best Before" value={`${lookupResult.product?.bestBeforeMonths ?? "-"} months`} />
                  </SimpleGrid>
                </Paper>

                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Group gap={6} mb="xs">
                    <MapPin size={14} style={{ color: "var(--mantine-color-cyan-4)" }} />
                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">Locations List</Text>
                  </Group>
                  {lookupResult.locations.length === 0 ? (
                    <div className="py-6 text-center border border-slate-700/60 rounded-md">
                      <Text size="xs" c="dimmed">
                        No allotted location stock found.
                      </Text>
                    </div>
                  ) : (
                    <Stack gap={6}>
                      {lookupResult.locations.map((entry) => (
                        <Group
                          key={entry.locationCode}
                          justify="space-between"
                          wrap="nowrap"
                          className="rounded-md border border-slate-700/60 px-3 py-2 bg-slate-900/10"
                        >
                          <Group gap={6} wrap="nowrap">
                            <MapPin size={13} style={{ color: "var(--mantine-color-cyan-4)" }} />
                            <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                              {entry.locationCode}
                            </Text>
                          </Group>
                          <Badge size="sm" color="cyan" variant="filled">
                            {entry.quantity} units
                          </Badge>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </SimpleGrid>
            </Stack>
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <Text size="9px" fw={800} c="dimmed">
        {label.toUpperCase()}
      </Text>
      <Text size="12px" fw={700} mt={2} truncate>
        {value}
      </Text>
    </div>
  );
}

export default ProductQuery;
