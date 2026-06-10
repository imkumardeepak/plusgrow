import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ClipboardCheck, MapPin, Package, Save, ScanLine, Trash2 } from "lucide-react";
import { Badge as MBadge, Box, Group, Modal, Paper, Select, SimpleGrid, Stack, Text } from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { toast } from "../../../lib/toast";
import { OperationsPage, OperationsPanel, OperationsEmptyState } from "../../../components/organisms/Operations/OperationsShell";
import { productAllottedLocationsApi, ProductAllottedLocationRecord, productQuantitiesApi, Product, ProductQuantityRecord, productsApi } from "../../../services/masterApi";
import type { CheckSessionStatus, ScannedItem, StockCheckReportStatus } from "../types";
import { clearStockCheckDraft, getLocationJson, normalizeSku, readStockCheckDraft, saveStockCheckReport, STOCK_CHECK_DRAFT_KEYS, writeStockCheckDraft } from "../types";
import { ModeHeader } from "./ModeHeader";
import { ScanInput } from "./ScanInput";
import { VarianceTable } from "./VarianceTable";

export function ProductCheckMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<CheckSessionStatus>("idle");
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showUnexpectedConfirm, setShowUnexpectedConfirm] = useState<{
    product: Product;
    sku: string;
  } | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleProductChange = (value: string | null) => {
    setSelectedProductId(value);
    setSessionStatus(value ? "running" : "idle");
    setScanInput("");
    setScannedItems([]);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, q, a] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(p);
      setQuantityRows(q);
      setAllottedLocations(a);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const draft = readStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product);
    if (!draft?.referenceId) return;

    setSelectedProductId(draft.referenceId);
    setSessionStatus(draft.sessionStatus);
    setScanInput(draft.scanInput || "");
    setScannedItems(draft.scannedItems || []);
  }, []);

  useEffect(() => {
    if (!selectedProductId) {
      clearStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product);
      return;
    }

    writeStockCheckDraft(STOCK_CHECK_DRAFT_KEYS.product, {
      referenceId: selectedProductId,
      sessionStatus,
      scanInput,
      scannedItems,
    });
  }, [scanInput, scannedItems, selectedProductId, sessionStatus]);

  const selectedProduct = products.find((p) => p.id === Number(selectedProductId));

  useEffect(() => {
    if (selectedProduct && scannedItems.length === 0) {
      const qRow = quantityRows.find((q) => q.productId === selectedProduct.id);
      setScannedItems([
        {
          sku: normalizeSku(selectedProduct.sku),
          productName: selectedProduct.name,
          productId: selectedProduct.id,
          scannedQty: 0,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: false,
          alias: normalizeSku(selectedProduct.alias),
        },
      ]);
      setSessionStatus("running");
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [selectedProduct, quantityRows, scannedItems.length]);

  useEffect(() => {
    if (selectedProductId && sessionStatus === "running") {
      setTimeout(() => scanInputRef.current?.focus(), 10);
    }
  }, [selectedProductId, sessionStatus]);

  const productLocations = useMemo(() => {
    if (!selectedProduct) return [];
    const allottedRow = allottedLocations.find((r) => r.productId === selectedProduct.id);
    if (!allottedRow) return [];
    return Object.entries(getLocationJson(allottedRow))
      .map(([code, qty]) => ({ locationCode: code, quantity: Number(qty) || 0 }))
      .filter((e) => e.quantity > 0)
      .sort((a, b) => a.locationCode.localeCompare(b.locationCode));
  }, [selectedProduct, allottedLocations]);

  const handleProductScan = (val: string) => {
    if (sessionStatus !== "running") {
      toast.warning("Start the stock check before scanning products");
      return;
    }

    const sku = normalizeSku(val.split("#")[0]);
    setScanInput("");

    const scannedProduct = products.find(
      (p) => normalizeSku(p.sku) === sku || normalizeSku(p.alias) === sku,
    );

    if (!scannedProduct) {
      toast.error(`SKU ${sku} not found`);
      setTimeout(() => scanInputRef.current?.focus(), 10);
      return;
    }

    if (scannedProduct.id !== Number(selectedProductId)) {
      setShowUnexpectedConfirm({ product: scannedProduct, sku });
      return;
    }

    setScannedItems((prev) =>
      prev.map((item) =>
        item.productId === scannedProduct.id ? { ...item, scannedQty: item.scannedQty + 1 } : item,
      ),
    );

    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const handleAddUnexpected = () => {
    if (!showUnexpectedConfirm) return;
    const { product } = showUnexpectedConfirm;
    const qRow = quantityRows.find((q) => q.productId === product.id);

    setScannedItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, scannedQty: i.scannedQty + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          sku: normalizeSku(product.sku),
          productName: product.name,
          productId: product.id,
          scannedQty: 1,
          systemQty: qRow?.currentQuantity ?? 0,
          isUnexpected: true,
          alias: normalizeSku(product.alias),
        },
      ];
    });

    setShowUnexpectedConfirm(null);
    setTimeout(() => scanInputRef.current?.focus(), 10);
  };

  const persistReport = async (status: StockCheckReportStatus) => {
    await saveStockCheckReport("Product", normalizeSku(selectedProduct?.sku) || "Unknown", scannedItems, status);
  };

  const handlePause = async () => {
    setIsSaving(true);
    try {
      await persistReport("PAUSED");
      setSessionStatus("paused");
      toast.success("Product stock check paused");
    } catch (error: any) {
      toast.error(error.message || "Failed to pause");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await persistReport("COMPLETED");
      toast.success("Product stock check completed");
      setSelectedProductId(null);
      setSessionStatus("idle");
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
    <OperationsPage title="Stock Check by Product" description="Select product, scan items." icon={Package} hideHeader>
      <ModeHeader
        title="Stock Check by Product"
        icon={Package}
        onBack={onBack}
        isMobile={isMobile}
        actions={
          selectedProduct ? (
            <Group gap="xs">
              <MBadge size={isMobile ? "sm" : "md"} radius="md" variant="light" color="green">
                {normalizeSku(selectedProduct.sku)}
              </MBadge>
              <Button
                variant="subtle"
                size="xs"
                onClick={() => { setSelectedProductId(null); setSessionStatus("idle"); setScannedItems([]); setScanInput(""); }}
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
          {!selectedProductId ? (
            <Stack gap="md">
              <Paper radius="lg" p="sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <Text size="xs" c="dimmed">Step 1: Select a product to begin counting.</Text>
              </Paper>
              <Box>
                <Text size="10px" fw={800} c="dimmed" mb={4}>SELECT PRODUCT</Text>
                <Select
                  size={isMobile ? "md" : "sm"}
                  placeholder="Search product SKU or name..."
                  searchable
                  clearable
                  data={products.map((p) => ({
                    value: String(p.id),
                    label: p.alias ? `${normalizeSku(p.sku)} — ${p.name} (${p.alias})` : `${normalizeSku(p.sku)} — ${p.name}`,
                  }))}
                  value={selectedProductId}
                  onChange={handleProductChange}
                  disabled={isLoading}
                  nothingFoundMessage="No products found"
                  maxDropdownHeight={300}
                />
              </Box>
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
                <Stack gap={4}>
                  <Text size="xs" fw={800} c="green.3" ff="monospace">
                    {normalizeSku(selectedProduct?.sku)}
                  </Text>
                </Stack>
              </Paper>

              <ScanInput
                label="Scan Product"
                placeholder="Scan same SKU to count..."
                value={scanInput}
                onChange={setScanInput}
                onScan={handleProductScan}
                icon={<Package size={15} />}
                disabled={sessionStatus !== "running"}
                autoFocus
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

              {productLocations.length > 0 && (
                <Paper radius="lg" p="xs" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed" mb={4}>KNOWN LOCATIONS</Text>
                  <Stack gap={4}>
                    {productLocations.map((loc) => (
                      <Group key={loc.locationCode} justify="space-between" wrap="nowrap">
                        <Group gap={4} wrap="nowrap">
                          <MapPin size={12} color="var(--mantine-color-cyan-4)" />
                          <Text size="11px" ff="monospace" fw={700}>{loc.locationCode}</Text>
                        </Group>
                        <Text size="11px" fw={700} ff="monospace">{loc.quantity}</Text>
                      </Group>
                    ))}
                  </Stack>
                </Paper>
              )}

              <Paper radius="lg" p="xs" withBorder bg="transparent">
                <Text size="10px" fw={800} c="dimmed" mb={4}>SCAN SUMMARY</Text>
                <SimpleGrid cols={2} spacing="xs">
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">SYSTEM QTY</Text>
                    <Text size="sm" fw={700} c="green.3">{scannedItems[0]?.systemQty ?? 0}</Text>
                  </Box>
                  <Box>
                    <Text size="9px" fw={800} c="dimmed">SCANNED QTY</Text>
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
                Complete Stock Check
              </Button>
              <Button
                variant="subtle"
                size="xs"
                color="red"
                fullWidth
                onClick={() => {
                  if (selectedProduct) {
                    const qRow = quantityRows.find((q) => q.productId === selectedProduct.id);
                    setScannedItems([
                      {
                        sku: normalizeSku(selectedProduct.sku),
                        productName: selectedProduct.name,
                        productId: selectedProduct.id,
                        scannedQty: 0,
                        systemQty: qRow?.currentQuantity ?? 0,
                        isUnexpected: false,
                        alias: normalizeSku(selectedProduct.alias),
                      },
                    ]);
                  }
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
          {!selectedProductId ? (
            <OperationsEmptyState
              icon={Package}
              title="Select Product"
              description="Choose a product to start counting and scanning."
            />
          ) : (
            <VarianceTable items={scannedItems} isMobile={isMobile} onRemove={(sku) => {
              setScannedItems((prev) => prev.filter((i) => i.sku !== sku || !i.isUnexpected));
            }} />
          )}
        </OperationsPanel>
      </div>

      {/* Unexpected product confirmation modal */}
      <Modal
        opened={!!showUnexpectedConfirm}
        onClose={() => { setShowUnexpectedConfirm(null); setTimeout(() => scanInputRef.current?.focus(), 10); }}
        title="Different Product Scanned"
        centered
        size="sm"
      >
        {showUnexpectedConfirm && (
          <Stack gap="sm">
            <Paper
              radius="md"
              p="sm"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <Group gap="xs" mb={4}>
                <AlertTriangle size={16} color="var(--mantine-color-yellow-4)" />
                <Text size="xs" fw={700} c="yellow.3">Unexpected Product</Text>
              </Group>
              <Text size="sm" fw={800} ff="monospace">{showUnexpectedConfirm.sku}</Text>
            </Paper>
            <Text size="sm" c="dimmed">
              This product doesn't match the selected one. Would you like to add it to the stock check?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button
                variant="subtle"
                size="sm"
                onClick={() => { setShowUnexpectedConfirm(null); setTimeout(() => scanInputRef.current?.focus(), 10); }}
              >
                Skip
              </Button>
              <Button size="sm" color="yellow" onClick={handleAddUnexpected}>
                Add to Check
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Save confirmation modal */}
      <Modal opened={showConfirm} onClose={() => setShowConfirm(false)} title="Confirm Stock Check Save" centered size="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            This will save a completed stock check report for <strong>{normalizeSku(selectedProduct?.sku)}</strong> and any unexpected products. Inventory quantities will not be adjusted here.
          </Text>
          <SimpleGrid cols={2} spacing="xs">
            <Paper radius="md" p="xs" withBorder>
              <Text size="9px" fw={800} c="dimmed">ITEMS</Text>
              <Text fw={700} c="white">{scannedItems.length}</Text>
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
