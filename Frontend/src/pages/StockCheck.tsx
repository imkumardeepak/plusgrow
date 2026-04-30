import React, { memo, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardCheck,
  Navigation,
  RefreshCw,
  ScanLine,
  Search,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Group, Paper, SimpleGrid, Text, TextInput } from "@mantine/core";

import { Button } from "../components/atoms/Button";
import { Badge } from "../components/atoms/Badge";
import { cn } from "../lib/utils";
import { toast } from "../lib/toast";
import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";
import {
  productQuantitiesApi,
  productsApi,
  Product,
  ProductQuantityRecord,
} from "../services/masterApi";

type StockCheckResult = {
  quantityRow: ProductQuantityRecord | null;
  product: Product | null;
  sku: string;
  title: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
};

export const StockCheck = memo(function StockCheck() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [physicalQty, setPhysicalQty] = useState<number | "">("");
  const [checkResult, setCheckResult] = useState<StockCheckResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const hasVariance = checkResult ? checkResult.difference !== 0 : false;
  const varianceTone = hasVariance ? "danger" : "success";
  const resolvedChecks = checkResult && !hasVariance ? 1 : 0;

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, quantityData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
      ]);

      setProducts(productsData);
      setQuantityRows(quantityData);
    } catch {
      toast.error("Failed to load stock check data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const focusScanner = () => {
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleCheck = (event: React.FormEvent) => {
    event.preventDefault();
    if (!scanInput.trim() || physicalQty === "") {
      return;
    }

    const normalizedScan = scanInput.trim().toUpperCase();
    const quantityRow =
      quantityRows.find((row) => row.skuCode.toUpperCase() === normalizedScan) ??
      null;
    const product =
      products.find((item) => item.sku?.toUpperCase() === normalizedScan) ?? null;

    const systemQty = quantityRow?.currentQuantity ?? 0;
    const title =
      quantityRow?.productName || product?.name || "Unknown Product";
    const physicalValue = Number(physicalQty);
    const difference = physicalValue - systemQty;

    setCheckResult({
      quantityRow,
      product,
      sku: normalizedScan,
      title,
      systemQty,
      physicalQty: physicalValue,
      difference,
    });

    if (difference === 0) {
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#4E8EA2", "#0A4174"],
      });
    }

    setScanInput("");
    setPhysicalQty("");
    focusScanner();
  };

  const handleReconcile = async () => {
    if (!checkResult) {
      return;
    }

    const productId = checkResult.quantityRow?.productId ?? checkResult.product?.id;
    if (!productId) {
      toast.error("This SKU is not mapped to a product in the database");
      return;
    }

    try {
      setIsReconciling(true);

      if (checkResult.quantityRow) {
        const updated = await productQuantitiesApi.update(checkResult.quantityRow.id, {
          id: checkResult.quantityRow.id,
          productId,
          currentQuantity: checkResult.physicalQty,
        });

        setCheckResult((current) =>
          current
            ? {
                ...current,
                quantityRow: updated,
                systemQty: updated.currentQuantity,
                difference: current.physicalQty - updated.currentQuantity,
              }
            : current,
        );
      } else {
        const created = await productQuantitiesApi.create({
          productId,
          currentQuantity: checkResult.physicalQty,
        });

        setCheckResult((current) =>
          current
            ? {
                ...current,
                quantityRow: created,
                systemQty: created.currentQuantity,
                difference: current.physicalQty - created.currentQuantity,
              }
            : current,
        );
      }

      await loadData();
      toast.success("Stock quantity updated in database");
      focusScanner();
    } catch (error: any) {
      toast.error(error.message || "Failed to reconcile stock");
    } finally {
      setIsReconciling(false);
    }
  };

  return (
    <OperationsPage
      title="Stock Reconciliation"
      description="Scan a live SKU, compare shelf count against the database, and post stock corrections from one focused audit workspace."
      icon={ClipboardCheck}
      hideHeader
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider"
            onClick={() => void loadData()}
            loading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider"
            onClick={() => navigate("/stock-movement")}
          >
            <Navigation className="w-3.5 h-3.5 mr-1.5" /> Movement
          </Button>
        </div>
      }
      metrics={[
        { label: "Live Quantity Rows", value: quantityRows.length, tone: "brand" },
        { label: "Last Check", value: checkResult ? checkResult.sku : "-", tone: "default" },
        { label: "Resolved Checks", value: resolvedChecks, tone: "success" },
      ]}
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Stock Check Input"
          icon={ScanLine}
          description="Scan a SKU and compare the physical count against the live quantity ledger."
          className="lg:col-span-4 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin space-y-4"
        >
          <form onSubmit={handleCheck} className="space-y-4">
            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                SKU IDENTIFICATION
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
                    fontFamily: "var(--font-mono)",
                  },
                }}
                leftSection={<Search size={14} />}
              />
            </div>

            <div className="space-y-1.5">
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                PHYSICAL COUNT
              </Text>
              <TextInput
                size="sm"
                radius="md"
                type="number"
                min={0}
                placeholder="0"
                value={physicalQty}
                onChange={(e) =>
                  setPhysicalQty(
                    e.currentTarget.value
                      ? Number(e.currentTarget.value)
                      : "",
                  )
                }
                required
                styles={{
                  input: {
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                  },
                }}
              />
            </div>

            <Group gap="xs" wrap="nowrap">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isLoading}
              >
                Verify Count
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => {
                  setScanInput("");
                  setPhysicalQty("");
                  focusScanner();
                }}
              >
                Clear
              </Button>
            </Group>
          </form>

          <SimpleGrid cols={{ base: 2, lg: 2 }} spacing="sm">
            <Paper radius="lg" p="sm" withBorder bg="transparent">
              <Text size="10px" fw={800} c="dimmed">
                LIVE ROWS
              </Text>
              <Text mt={6} size="lg" fw={800} c="white">
                {quantityRows.length}
              </Text>
            </Paper>
            <Paper radius="lg" p="sm" withBorder bg="transparent">
              <Text size="10px" fw={800} c="dimmed">
                STATUS
              </Text>
              <Text mt={6} size="sm" fw={700} c="white">
                {checkResult
                  ? hasVariance
                    ? "Variance"
                    : "Matched"
                  : "Waiting"}
              </Text>
            </Paper>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="Audit Result"
          icon={Box}
          description="Compact comparison view for the checked SKU and the live database quantity."
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!checkResult ? (
            <OperationsEmptyState
              icon={ClipboardCheck}
              title="Ready For Verification"
              description="Run a stock check to compare the physical count with the live quantity row."
            />
          ) : (
            <div className="space-y-4">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" radius="md" variant="default" color="gray">
                      {checkResult.sku}
                    </Badge>
                    <Badge
                      size="sm"
                      radius="md"
                      variant={hasVariance ? "danger" : "success"}
                    >
                      {hasVariance ? "Variance" : "Matched"}
                    </Badge>
                  </Group>
                  <Text mt={8} size="sm" fw={700} lineClamp={1}>
                    {checkResult.title}
                  </Text>
                  <Text size="11px" c="dimmed">
                    {checkResult.quantityRow
                      ? `Last updated ${format(
                          new Date(checkResult.quantityRow.updatedAt),
                          "dd MMM yyyy HH:mm",
                        )}`
                      : "No quantity row exists yet"}
                  </Text>
                </Box>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    SYSTEM QTY.
                  </Text>
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {checkResult.systemQty}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    PHYSICAL QTY.
                  </Text>
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {checkResult.physicalQty}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    VARIANCE
                  </Text>
                  <Text
                    mt={6}
                    size="xl"
                    fw={800}
                    ff="monospace"
                    c={varianceTone === "success" ? "green.3" : "red.3"}
                  >
                    {checkResult.difference > 0 ? "+" : ""}
                    {checkResult.difference}
                  </Text>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    DB ROW
                  </Text>
                  <Text mt={6} size="sm" fw={700}>
                    {checkResult.quantityRow ? "Exists" : "Not Created"}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    OUTCOME
                  </Text>
                  <Text
                    mt={6}
                    size="sm"
                    fw={700}
                    c={varianceTone === "success" ? "green.3" : "red.3"}
                  >
                    {hasVariance ? "Needs review" : "Count aligned"}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <Text size="10px" fw={800} c="dimmed">
                    NEXT ACTION
                  </Text>
                  <Text mt={6} size="sm" fw={700}>
                    {hasVariance ? "Reconcile DB" : "No action"}
                  </Text>
                </Paper>
              </SimpleGrid>

              {hasVariance ? (
                <Paper
                  radius="lg"
                  p="sm"
                  withBorder
                  bg="rgba(239, 68, 68, 0.06)"
                  style={{ borderColor: "rgba(239, 68, 68, 0.18)" }}
                >
                  <Group justify="space-between" align="center" gap="sm">
                    <Box style={{ minWidth: 0 }}>
                      <Text size="11px" fw={800} c="red.3">
                        Reconcile Required
                      </Text>
                      <Text size="xs" c="dimmed">
                        Update the live quantity row to {checkResult.physicalQty} units.
                      </Text>
                    </Box>
                    <Button
                      onClick={() => void handleReconcile()}
                      size="sm"
                      loading={isReconciling}
                    >
                      Reconcile
                    </Button>
                  </Group>
                </Paper>
              ) : (
                <Paper
                  radius="lg"
                  p="sm"
                  withBorder
                  bg="rgba(16, 185, 129, 0.06)"
                  style={{ borderColor: "rgba(16, 185, 129, 0.18)" }}
                >
                  <Group gap="sm" wrap="nowrap">
                    <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                    <Text size="xs" c="dimmed">
                      Physical count matches the live database quantity. No update is required.
                    </Text>
                  </Group>
                </Paper>
              )}
            </div>
          )}
        </OperationsPanel>
      </div>
    </OperationsPage>
  );
});

export default StockCheck;
