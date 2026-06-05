import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  Factory,
  Package,
  Save,
  ScanLine,
  Trash2,
} from "lucide-react";
import {
  Badge as MBadge,
  Box,
  Group,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
} from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../../../components/organisms/Operations/OperationsShell";
import {
  Manufacturer,
  manufacturersApi,
  productQuantitiesApi,
  Product,
  ProductQuantityRecord,
  productsApi,
} from "../../../services/masterApi";

import type { ScannedItem } from "../types";
import { normalizeSku } from "../types";
import { ModeHeader } from "./ModeHeader";
import { ScanInput } from "./ScanInput";
import { VarianceTable } from "./VarianceTable";

export function ManufacturerCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMfrId, setSelectedMfrId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, m, q] = await Promise.all([
        productsApi.getAll(),
        manufacturersApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);
      setProducts(p);
      setManufacturers(m);
      setQuantityRows(q);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const mfrProducts = useMemo(() => {
    if (!selectedMfrId) return [];
    const mfrIdNum = Number(selectedMfrId);
    return products.filter((p) => p.manufacturerId === mfrIdNum);
  }, [selectedMfrId, products]);

  useEffect(() => {
    if (selectedMfrId && mfrProducts.length > 0) {
      const items: ScannedItem[] = mfrProducts.map((p) => {
        const qRow = quantityRows.find((q) => q.productId === p.id);
        return {
          sku: normalizeSku(p.sku),
          productName: p.name,
          productId: p.id,
          scannedQty: 0,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: false,
          alias: normalizeSku(p.alias),
        };
      });
      setScannedItems(items.sort((a, b) => a.sku.localeCompare(b.sku)));
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [selectedMfrId, mfrProducts, quantityRows]);

  const selectedMfr = manufacturers.find((m) => m.id === Number(selectedMfrId));

  const handleProductScan = (val: string) => {
    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    setScannedItems((prev) => {
      const existing = prev.find((item) => item.sku === sku || item.alias === sku);

      if (existing) {
        return prev.map((item) =>
          item.sku === existing.sku ? { ...item, scannedQty: item.scannedQty + 1 } : item,
        );
      }

      const product = products.find(
        (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
      );

      if (product) {
        const isDiffMfr = product.manufacturerId !== Number(selectedMfrId);
        if (isDiffMfr) {
          const otherMfr = manufacturers.find((m) => m.id === product.manufacturerId);
          toast.warning(`${product.name} belongs to ${otherMfr?.name || "different manufacturer"}`);
        }
        const qRow = quantityRows.find((q) => q.productId === product.id);
        return [
          ...prev,
          {
            sku: normalizeSku(product.sku),
            productName: product.name,
            productId: product.id,
            scannedQty: 1,
            systemQty: qRow?.currentQuantity ?? 0,
            isUnexpected: isDiffMfr,
            alias: normalizeSku(product.alias),
          },
        ];
      }

      toast.error(`SKU ${sku} not found`);
      return prev;
    });

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      for (const item of scannedItems) {
        if (item.productId === null) continue;
        const variance = item.scannedQty - item.systemQty;
        if (variance === 0) continue;

        await productQuantitiesApi.adjust({
          productId: item.productId,
          locationCode: "STOCK-CHECK",
          quantityChange: variance,
          reason: "Stock Check - Manufacturer Audit",
          notes: `Manufacturer: ${selectedMfr?.name}. System: ${item.systemQty}, Scanned: ${item.scannedQty}`,
        });
      }
      toast.success("Manufacturer stock check saved");
      setSelectedMfrId(null);
      setScannedItems([]);
      setScanInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariance = scannedItems.some((i) => i.scannedQty !== i.systemQty);

  return (
    <OperationsPage title="Stock Check by Manufacturer" description="Select manufacturer, scan products." icon={Factory} hideHeader>
      <ModeHeader
        title="Stock Check by Manufacturer"
        icon={Factory}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          selectedMfr ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="yellow">
                {selectedMfr.name}
              </MBadge>
              <Button variant="subtle" size="xs" onClick={() => { setSelectedMfrId(null); setScannedItems([]); setScanInput(""); }}>
                Change
              </Button>
            </Group>
          ) : undefined
        }
      />

      <div className={`flex-1 grid grid-cols-1 ${isMobile ? "" : "lg:grid-cols-12"} gap-3 min-h-0`}>
        <OperationsPanel
          title="Scanner"
          icon={ScanLine}
          className={`${isMobile ? "" : "lg:col-span-4"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          {!selectedMfrId ? (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}>
                <Text size="xs" c="dimmed">Step 1: Select a manufacturer to load their products.</Text>
              </Paper>
              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={4}>SELECT MANUFACTURER</Text>
                <Select
                  size={isMobile ? "md" : "sm"}
                  placeholder="Search manufacturer..."
                  searchable
                  data={manufacturers.map((m) => ({ value: String(m.id), label: m.name }))}
                  value={selectedMfrId}
                  onChange={setSelectedMfrId}
                  disabled={isLoading}
                  nothingFoundMessage="No manufacturers found"
                />
              </Box>
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Group gap="xs" wrap="nowrap">
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                  <Text size="xs" c="dimmed">{mfrProducts.length} products loaded. Scan SKU/Alias to count.</Text>
                </Group>
              </Paper>

              <ScanInput
                label="Scan Product"
                placeholder="Scan SKU or Alias..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                autoFocus
                isMobile={isMobile}
              />

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">EXPECTED SKUS</Text>
                    <Text size="sm" fw={700} c="yellow.3">{mfrProducts.length}</Text>
                  </Box>
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">TOTAL SCANNED</Text>
                    <Text size="sm" fw={700} c="white">{scannedItems.reduce((s, i) => s + i.scannedQty, 0)}</Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Button
                size={isMobile ? "md" : "sm"}
                fullWidth
                disabled={!hasVariance && scannedItems.every(i => i.scannedQty === 0)}
                loading={isSaving}
                onClick={() => setShowConfirm(true)}
                leftIcon={<Save size={16} />}
              >
                Save Stock Check
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                fullWidth
                onClick={() => {
                  setScannedItems(
                    mfrProducts.map((p) => {
                      const qRow = quantityRows.find((q) => q.productId === p.id);
                      return {
                        sku: normalizeSku(p.sku),
                        productName: p.name,
                        productId: p.id,
                        scannedQty: 0,
                        systemQty: qRow?.currentQuantity ?? 0,
                        isUnexpected: false,
                        alias: normalizeSku(p.alias),
                      };
                    }),
                  );
                  setScanInput("");
                }}
                leftIcon={<Trash2 size={14} />}
              >
                Reset Scans
              </Button>
            </Stack>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Variance Report"
          icon={ClipboardCheck}
          className={`${isMobile ? "" : "lg:col-span-8"} flex flex-col overflow-hidden`}
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!selectedMfrId ? (
            <OperationsEmptyState icon={Factory} title="Select Manufacturer" description="Choose a manufacturer to load their product list and begin scanning." />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={(sku) => setScannedItems((prev) => prev.filter((i) => i.sku !== sku))} />
          )}
        </OperationsPanel>
      </div>

      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Stock Check Save" centered size="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will adjust stock quantities for <strong>{selectedMfr?.name}</strong> products based on scanned counts.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS WITH VARIANCE</Text>
              <Text fw={700} c="orange.3">{scannedItems.filter(i => i.scannedQty !== i.systemQty).length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">NET VARIANCE</Text>
              <Text fw={700} c="yellow.4">{scannedItems.reduce((s, i) => s + (i.scannedQty - i.systemQty), 0)}</Text>
            </Paper>
          </SimpleGrid>
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} loading={isSaving}>Confirm Save</Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}
