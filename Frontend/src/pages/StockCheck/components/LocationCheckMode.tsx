import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, MapPin, Package, Save, ScanLine, Trash2 } from "lucide-react";
import { Badge as MBadge, Box, Group, Modal, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import { OperationsPage, OperationsPanel, OperationsEmptyState } from "../../../components/organisms/Operations/OperationsShell";
import { productAllottedLocationsApi, ProductAllottedLocationRecord, productQuantitiesApi, Product, ProductQuantityRecord, productsApi, locationsApi, Location } from "../../../services/masterApi";
import type { CheckSessionStatus, ScannedItem, StockCheckReportStatus } from "../types";
import { clearStockCheckDraft, createStockCheckId, getLocationJson, normalizeSku, readStockCheckDraft, saveStockCheckReport, STOCK_CHECK_DRAFT_KEYS, writeStockCheckDraft } from "../types";
import { ModeHeader } from "./ModeHeader";
import { ScanInput } from "./ScanInput";
import { VarianceTable } from "./VarianceTable";

export function LocationCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [locationCode, setLocationCode] = useState("");
  const [checkId, setCheckId] = useState(() => createStockCheckId("Location"));
  const [reportId, setReportId] = useState<number | undefined>();
  const [isLocationLocked, setIsLocationLocked] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<CheckSessionStatus>("idle");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, a, q, l] = await Promise.all([
        productsApi.getAll(),
        productAllottedLocationsApi.getAll(),
        productQuantitiesApi.getAll(),
        locationsApi.getAll(),
      ]);
      setProducts(p);
      setAllottedLocations(a);
      setQuantityRows(q);
      setLocations(l);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const draft = readStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location);
    if (!draft?.referenceCode) return;

    setLocationCode(draft.referenceCode);
    setCheckId(draft.checkId || createStockCheckId("Location"));
    setReportId(draft.reportId);
    setIsLocationLocked(!!draft.isLocked);
    setSessionStatus(draft.sessionStatus);
    setScanInput(draft.scanInput || "");
    setScannedItems(draft.scannedItems || []);
  }, []);

  useEffect(() => {
    if (!isLocationLocked || !locationCode) {
      clearStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location);
      return;
    }

    writeStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.location, {
      checkId,
      reportId,
      referenceCode: normalizeSku(locationCode),
      isLocked: isLocationLocked,
      sessionStatus,
      scanInput,
      scannedItems,
    });
  }, [checkId, reportId, isLocationLocked, locationCode, scanInput, scannedItems, sessionStatus]);

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

  useEffect(() => {
    if (isLocationLocked && sessionStatus === "running") {
      setTimeout(() => scanInputRef.current?.focus(), 10);
    }
  }, [isLocationLocked, sessionStatus]);

  const handleLocationScan = (val: string) => {
    const upper = normalizeSku(val);

    let resolvedLocationCode = upper;
    const locationByCode = locations.find(l => l.locationCode.toUpperCase() === upper);
    if (!locationByCode) {
      const locationByBin = locations.find(l => l.bins?.some(b => b.toUpperCase() === upper));
      if (locationByBin) {
        resolvedLocationCode = locationByBin.locationCode.toUpperCase();
        toast.info(`Bin ${upper} resolved to Location ${resolvedLocationCode}`);
      }
    }

    setCheckId(createStockCheckId("Location"));
    setReportId(undefined);
    setLocationCode(resolvedLocationCode);
    setIsLocationLocked(true);
    setSessionStatus("running");
    setScannedItems([]);
    toast.success(`Location ${resolvedLocationCode} loaded`);
    setTimeout(() => scanInputRef.current?.focus(), 100);
  };

  const handleProductScan = (val: string) => {
    if (sessionStatus !== "running") {
      toast.warning("Start the stock check before scanning products");
      return;
    }

    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    setScannedItems((prev) => {
      const existing = prev.find(
        (item) => item.sku === sku || item.alias === sku,
      );

      if (existing) {
        return prev.map((item) =>
          item.sku === existing.sku ? { ...item, scannedQty: item.scannedQty + 1 } : item,
        );
      }

      const product = products.find(
        (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
      );

      if (product) {
        toast.warning(`${normalizeSku(product.sku)} — unexpected at this location`);
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

  const persistReport = async (status: StockCheckReportStatus) => {
    const upperLoc = normalizeSku(locationCode);
    return saveStockCheckReport("Location", upperLoc, scannedItems, status, {
      checkId,
      reportId,
      referenceCode: upperLoc,
    });
  };

  const handlePause = async () => {
    setIsSaving(true);
    try {
      const saved = await persistReport("PAUSED");
      setReportId(saved.id);
      setSessionStatus("paused");
      toast.success("Location stock check paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause stock check");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await persistReport("COMPLETED");
      setReportId(undefined);
      toast.success("Stock check report completed");
      setIsLocationLocked(false);
      setSessionStatus("idle");
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
              <MBadge size="xs" radius="sm" variant="light" color="gray">
                {checkId}
              </MBadge>
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="cyan">
                {locationCode}
              </MBadge>
              {locations.find(l => l.locationCode.toUpperCase() === locationCode)?.bins?.map(bin => (
                <MBadge key={bin} size="xs" radius="sm" variant="outline" color="cyan">
                  {bin}
                </MBadge>
              ))}
              <Button
                variant="subtle"
                size="xs"
                onClick={() => {
                  setCheckId(createStockCheckId("Location"));
                  setReportId(undefined);
                  setIsLocationLocked(false);
                  setSessionStatus("idle");
                  setScannedItems([]);
                  setScanInput("");
                }}
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
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(14,165,233,0.08)",
                  border: "1px solid rgba(14,165,233,0.15)",
                }}
              >
                <Text size="xs" c="dimmed">
                  Step 1: Scan or enter a location barcode to begin stock check at that location.
                </Text>
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
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.15)",
                }}
              >
                <Group gap="xs" wrap="nowrap">
                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                  <Text size="xs" c="dimmed">
                    Location locked. Scan products (SKU/Alias) one by one.
                  </Text>
                </Group>
              </Paper>

              <ScanInput
                label="Scan Product"
                placeholder="Scan SKU or Alias..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                disabled={sessionStatus !== "running"}
                autoFocus
                id="location-product-scan"
                isMobile={isMobile}
                inputRef={scanInputRef}
              />

              <Group gap="xs">
                {sessionStatus === "running" ? (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    variant="outline"
                    fullWidth
                    loading={isSaving}
                    onClick={handlePause}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    size={isMobile ? "md" : "sm"}
                    fullWidth
                    onClick={() => {
                      setSessionStatus("running");
                      setTimeout(() => scanInputRef.current?.focus(), 10);
                    }}
                  >
                    {sessionStatus === "paused" ? "Resume" : "Start"}
                  </Button>
                )}
              </Group>

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

              <Group gap="xs">
                <Button
                  size={isMobile ? "md" : "sm"}
                  fullWidth
                  disabled={!hasVariance && scannedItems.every(i => i.scannedQty === 0)}
                  loading={isSaving}
                  onClick={() => setShowConfirm(true)}
                  leftIcon={<Save size={16} />}
                >
                  Complete Stock Check
                </Button>
              </Group>
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
            <OperationsEmptyState
              icon={MapPin}
              title="Scan Location First"
              description="Scan a location barcode to load expected products and start scanning."
            />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={handleRemoveItem} />
          )}
        </OperationsPanel>
      </div>

      <Modal
        opened={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Stock Check Save"
        centered
        size="sm"
      >
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will save a completed stock check report for <strong>{locationCode}</strong>. Inventory quantities will not be adjusted here.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS WITH VARIANCE</Text>
              <Text fw={700} c="orange.3">{scannedItems.filter(i => i.scannedQty !== i.systemQty).length}</Text>
            </Paper>
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">TOTAL VARIANCE</Text>
              <Text fw={700} c="yellow.4">
                {scannedItems.reduce((s, i) => s + (i.scannedQty - i.systemQty), 0)}
              </Text>
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
