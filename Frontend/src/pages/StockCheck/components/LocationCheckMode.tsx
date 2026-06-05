import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  MapPin,
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
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productQuantitiesApi,
  Product,
  ProductQuantityRecord,
  productsApi,
} from "../../../services/masterApi";

import type { ScannedItem } from "../types";
import { normalizeSku, getLocationJson } from "../types";
import { ModeHeader } from "./ModeHeader";
import { ScanInput } from "./ScanInput";
import { VarianceTable } from "./VarianceTable";

export function LocationCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [locationCode, setLocationCode] = useState("");
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, a, q] = await Promise.all([
        productsApi.getAll(),
        productAllottedLocationsApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);
      setProducts(p);
      setAllottedLocations(a);
      setQuantityRows(q);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const systemItemsAtLocation = useMemo(() => {
    if (!isLocationLocked || !locationCode) return [];
    const upperLoc = normalizeSku(locationCode);
    const items: ScannedItem[] = [];

    allottedLocations.forEach((row) => {
      const locJson = getLocationJson(row);
      const qty = Number(locJson[upperLoc] || locJson[locationCode.trim()] || 0);
      if (qty > 0) {
        const product = products.find((p) => p.id === row.productId);
        items.push({
          sku: normalizeSku(product?.sku || row.skuCode),
          productName: product?.name || row.productName,
          productId: row.productId,
          scannedQty: 0,
          systemQty: qty,
          isUnexpected: false,
          alias: normalizeSku(product?.alias || row.alias),
        });
      }
    });

    return items.sort((a, b) => a.sku.localeCompare(b.sku));
  }, [isLocationLocked, locationCode, allottedLocations, products]);

  useEffect(() => {
    if (isLocationLocked && systemItemsAtLocation.length > 0 && scannedItems.length === 0) {
      setScannedItems(systemItemsAtLocation.map((item) => ({ ...item, scannedQty: 0 })));
    }
  }, [isLocationLocked, systemItemsAtLocation]);

  const handleLocationScan = (val: string) => {
    const upper = normalizeSku(val);
    setLocationCode(upper);
    setIsLocationLocked(true);
    setScannedItems([]);
    toast.success(`Location ${upper} loaded`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

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
        toast.warning(`${product.name} — unexpected at this location`);
        return [
          ...prev,
          {
            sku: normalizeSku(product.sku),
            productName: product.name,
            productId: product.id,
            scannedQty: 1,
            systemQty: 0,
            isUnexpected: true,
            alias: normalizeSku(product.alias),
          },
        ];
      }

      toast.error(`SKU ${sku} not found in product master`);
      return prev;
    });

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleRemoveItem = (sku: string) => {
    setScannedItems((prev) => prev.filter((item) => item.sku !== sku));
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      const upperLoc = normalizeSku(locationCode);

      for (const item of scannedItems) {
        if (item.productId === null) continue;
        const variance = item.scannedQty - item.systemQty;
        if (variance === 0) continue;

        const allottedRow = allottedLocations.find((r) => r.productId === item.productId);

        if (allottedRow) {
          const locJson = { ...getLocationJson(allottedRow) };
          locJson[upperLoc] = item.scannedQty;
          if (item.scannedQty === 0) {
            delete locJson[upperLoc];
          }
          await productAllottedLocationsApi.update(allottedRow.id, {
            productId: allottedRow.productId,
            locationJson: locJson,
          });
        } else if (item.scannedQty > 0) {
          await productAllottedLocationsApi.create({
            productId: item.productId,
            locationJson: { [upperLoc]: item.scannedQty },
          });
        }

        await productQuantitiesApi.adjust({
          productId: item.productId,
          locationCode: upperLoc,
          quantityChange: variance,
          reason: "Stock Check - Location Audit",
          notes: `Stock check at ${upperLoc}. System: ${item.systemQty}, Scanned: ${item.scannedQty}`,
        });
      }

      toast.success("Stock check saved successfully");
      setIsLocationLocked(false);
      setLocationCode("");
      setScannedItems([]);
      setScanInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save stock check");
    } finally {
      setIsSaving(false);
    }
  };

  const hasVariance = scannedItems.some((i) => i.scannedQty !== i.systemQty);

  return (
    <OperationsPage title="Stock Check by Location" description="Scan location, then scan all products." icon={MapPin} hideHeader>
      <ModeHeader
        title="Stock Check by Location"
        icon={MapPin}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          isLocationLocked ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="cyan">
                {locationCode}
              </MBadge>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { setIsLocationLocked(false); setScannedItems([]); setScanInput(""); }}
              >
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
          {!isLocationLocked ? (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.15)" }}>
                <Text size="xs" c="dimmed">Step 1: Scan or enter a location barcode to begin stock check at that location.</Text>
              </Paper>
              <ScanInput
                label="Location Code"
                placeholder="Scan location barcode..."
                value={locationCode}
                onChange={setLocationCode}
                onScan={handleLocationScan}
                icon={<MapPin size={15} />}
                autoFocus
                isMobile={isMobile}
              />
            </Stack>
          ) : (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Group gap="xs" wrap="nowrap">
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                  <Text size="xs" c="dimmed">Location locked. Scan products (SKU/Alias) one by one.</Text>
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
                id="location-product-scan"
                isMobile={isMobile}
              />

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">EXPECTED ITEMS</Text>
                    <Text size="sm" fw={700} c="cyan.3">{systemItemsAtLocation.length}</Text>
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
                  setScannedItems(systemItemsAtLocation.map((item) => ({ ...item, scannedQty: 0 })));
                  setScanInput("");
                  toast.info("Scan data cleared");
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
          {!isLocationLocked ? (
            <OperationsEmptyState icon={MapPin} title="Scan Location First" description="Scan a location barcode to load expected products and start scanning." />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={handleRemoveItem} />
          )}
        </OperationsPanel>
      </div>

      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Stock Check Save" centered size="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will update actual stock quantities at <strong>{locationCode}</strong>. Items with variance will have their stock adjusted.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS WITH VARIANCE</Text>
              <Text fw={700} c="orange.3">{scannedItems.filter(i => i.scannedQty !== i.systemQty).length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">TOTAL VARIANCE</Text>
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
