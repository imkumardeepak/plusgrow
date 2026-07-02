import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Boxes,
  ClipboardCheck,
  Eye,
  FileText,
  History,
  IndianRupee,
  MapPin,
  Package,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Divider,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
} from "@mantine/core";

import { Button } from "../../../components/atoms/Button";
import { Badge } from "../../../components/atoms/Badge";
import { toast } from "../../../lib/toast";
import {
  OperationsPage,
  OperationsEmptyState,
} from "../../../components/organisms/Operations/OperationsShell";
import {
  poInvoicesApi,
  PoInvoice,
  productQuantitiesApi,
  productAllottedLocationsApi,
  Product,
  ProductAllottedLocationRecord,
  ProductQuantityRecord,
  productsApi,
  outwardOrdersApi,
} from "../../../services/masterApi";
import { ProductUpdateModal } from "../../../components/organisms/ProductUpdateModal";
import { StickerPrintModal } from "../../../components/organisms/StickerPrintModal";

import type { ProductLookupResult } from "../types";
import { normalizeSku, masterHref, formatMoney, getLocationJson } from "../types";
import { ModeHeader } from "./ModeHeader";
import { Info, MetricLabel, MasterLink, EmptyInline } from "./SharedComponents";

const TABLE_ROW_LIMIT = 10;

export function StockVerifyMode({ onBack, isMobile }: { onBack: () => void; isMobile: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantityRows, setQuantityRows] = useState<ProductQuantityRecord[]>([]);
  const [allottedLocations, setAllottedLocations] = useState<ProductAllottedLocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [lookupResult, setLookupResult] = useState<ProductLookupResult | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedPrintProduct, setSelectedPrintProduct] = useState<Product | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearchRef = useRef(searchParams.get("search") || "");

  const openProductFromSku = useCallback((sku?: string | null, productName?: string | null) => {
    const normalizedSku = normalizeSku(sku);
    const normalizedName = (productName || "").trim().toLowerCase();
    const product =
      products.find(
        (item) =>
          (normalizedSku &&
            (normalizeSku(item.sku) === normalizedSku || normalizeSku(item.alias) === normalizedSku)) ||
          (normalizedName && item.name.trim().toLowerCase() === normalizedName),
      ) ?? lookupResult?.product ?? null;

    if (product) {
      setLookupResult((prev) => (prev ? { ...prev, product } : prev));
      setIsEditModalOpen(true);
      return;
    }

    navigate(masterHref("/mpd", normalizedSku || productName || ""));
  }, [lookupResult?.product, navigate, products]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, quantityData, allottedLocationData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);
      setProducts(productsData);
      setQuantityRows(quantityData);
      setAllottedLocations(allottedLocationData);
    } catch {
      toast.error("Failed to load product detail data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-search if navigated with ?search=SKU param
  useEffect(() => {
    const term = initialSearchRef.current;
    if (term && !isLoading && products.length > 0 && !lookupResult) {
      setScanInput(term);
      setSearchParams({}, { replace: true });
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleLookupRef.current?.(fakeEvent);
      }, 100);
    }
  }, [isLoading, products, lookupResult, setSearchParams]);

  const focusScanner = () => {
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handlePrint = (product: Product) => {
    setSelectedPrintProduct(product);
    setIsPrintModalOpen(true);
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawInput = scanInput.trim();
    if (!rawInput) return;

    const sku = normalizeSku(rawInput.split("#")[0]);
    setScanInput(sku);

    try {
      setIsSearching(true);

      let fetchedProduct = null;
      let fetchedCurrentStock = 0;
      let fetchedLocations: { locationCode: string; quantity: number }[] | null = null;

      try {
        const lookupRes = await productsApi.lookup(sku);
        fetchedProduct = lookupRes.product;
        fetchedCurrentStock = lookupRes.currentStock;
        fetchedLocations = lookupRes.locations;
      } catch (err) {
        // Fallback to local state if lookup fails
      }

      const product =
        fetchedProduct ?? products.find((item) => normalizeSku(item.sku) === sku || normalizeSku(item.alias) === sku) ?? null;
      
      const localQuantityRow =
        quantityRows.find((row) => normalizeSku(row.skuCode) === sku || normalizeSku(row.alias) === sku) ?? null;

      const quantityRow = fetchedProduct
        ? ({
            id: localQuantityRow?.id ?? 0,
            productId: fetchedProduct.id,
            skuCode: fetchedProduct.sku || sku,
            alias: fetchedProduct.alias,
            productName: fetchedProduct.name,
            currentQuantity: fetchedCurrentStock,
            pendingOutwardQuantity: localQuantityRow?.pendingOutwardQuantity ?? 0,
            pendingInwardQuantity: localQuantityRow?.pendingInwardQuantity ?? 0,
            createdAt: localQuantityRow?.createdAt ?? "",
            updatedAt: localQuantityRow?.updatedAt ?? "",
          } as ProductQuantityRecord)
        : localQuantityRow;

      const resolvedProductId = product?.id ?? quantityRow?.productId ?? null;

      const resolvedSku = product?.sku
        ? normalizeSku(product.sku)
        : quantityRow?.skuCode
          ? normalizeSku(quantityRow.skuCode)
          : sku;

      const [invoiceRows, movementRows, salesOrderRows] = await Promise.all([
        poInvoicesApi.getAll({ search: resolvedSku, pageSize: 100 }),
        productQuantitiesApi.getMovements({ search: resolvedSku }),
        outwardOrdersApi.getSalesOrders({ search: resolvedSku, pageSize: 100 }),
      ]);
      const invoices = invoiceRows
        .filter((row) => normalizeSku(row.skuCode) === resolvedSku)
        .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime() || b.id - a.id);
      
      const allottedLocation = allottedLocations.find((row) =>
        resolvedProductId
          ? row.productId === resolvedProductId
          : normalizeSku(row.skuCode) === resolvedSku || normalizeSku(row.alias) === sku,
      ) ?? null;
      
      const locations = fetchedLocations ?? Object.entries(getLocationJson(allottedLocation))
        .map(([locationCode, quantity]) => ({ locationCode, quantity: Number(quantity) || 0 }))
        .filter((location) => location.locationCode && location.quantity > 0)
        .sort((a, b) => a.locationCode.localeCompare(b.locationCode));
        
      const totalLocationStock = locations.reduce((sum, location) => sum + location.quantity, 0);
      const movements = movementRows
        .filter((row) =>
          resolvedProductId ? row.productId === resolvedProductId : normalizeSku(row.skuCode) === resolvedSku,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() || b.id - a.id);
      const salesOrders = salesOrderRows
        .map((order) => ({
          ...order,
          items: order.items.filter((item) =>
            resolvedProductId ? item.productId === resolvedProductId : normalizeSku(item.skuCode) === resolvedSku,
          ),
        }))
        .filter((order) => order.items.length > 0)
        .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime() || b.id - a.id);

      setLookupResult({
        sku,
        product,
        quantityRow,
        allottedLocation,
        invoices,
        salesOrders,
        movements,
        locations,
        totalPoQuantity: 0,
        totalLocationStock,
      });

      if (!product && !quantityRow && movements.length === 0) {
        toast.error("No product details found for this SKU");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load SKU details");
    } finally {
      setIsSearching(false);
      focusScanner();
    }
  };

  const handleLookupRef = useRef(handleLookup);
  handleLookupRef.current = handleLookup;

  const productTitle =
    lookupResult?.product?.name ||
    lookupResult?.quantityRow?.productName ||
    "Product Details";
  const displayedCurrentStock = lookupResult
    ? lookupResult.quantityRow?.currentQuantity ?? 0
    : 0;
  const visibleLocations = lookupResult?.locations.slice(0, TABLE_ROW_LIMIT) ?? [];
  const visibleMovements = lookupResult?.movements.slice(0, TABLE_ROW_LIMIT) ?? [];
  const visibleInvoices = lookupResult?.invoices.slice(0, TABLE_ROW_LIMIT) ?? [];
  const visibleSalesOrders = lookupResult?.salesOrders.slice(0, TABLE_ROW_LIMIT) ?? [];

  return (
    <OperationsPage
      title="Stock Verify"
      description="Quick single-SKU lookup to view current stock and product master data."
      icon={Eye}
      hideHeader
      actions={
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[10px] px-3 font-bold uppercase tracking-wider"
          onClick={() => void loadData()}
          loading={isLoading}
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      }
    >
      <ModeHeader title="Stock Verify" icon={Eye} onBack={onBack} isMobile={isMobile} />

      {/* ── Search Bar ── */}
      <Paper
        radius="md"
        px="xs"
        py={6}
        withBorder
        mb={6}
        style={{
          background: "rgba(15, 23, 42, 0.65)",
          borderColor: "rgba(34, 211, 238, 0.15)",
          backdropFilter: "blur(12px)",
        }}
      >
        <form onSubmit={handleLookup}>
          <Group gap={6} wrap="nowrap">
            <TextInput
              ref={inputRef}
              size="xs"
              radius="md"
              placeholder="Scan or type SKU / Alias..."
              value={scanInput}
              onChange={(e) => setScanInput(e.currentTarget.value)}
              required
              className="flex-1"
              styles={{
                input: {
                  textTransform: "uppercase",
                  fontFamily: "var(--font-mono)",
                  fontSize: isMobile ? "16px" : "12px",
                  borderColor: "rgba(34, 211, 238, 0.2)",
                  background: "rgba(2, 6, 23, 0.5)",
                  height: 30,
                },
              }}
              leftSection={<Search size={12} />}
            />
            <Button type="submit" size="xs" disabled={isLoading} loading={isSearching} style={{ height: 30 }}>
              Verify
            </Button>
            {lookupResult && (
              <Button
                type="button"
                size="xs"
                variant="subtle"
                onClick={() => { setScanInput(""); setLookupResult(null); focusScanner(); }}
                style={{ padding: "0 8px", height: 30 }}
              >
                <X size={14} />
              </Button>
            )}
          </Group>
        </form>
      </Paper>

      {/* ── Main Content Area ── */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {!lookupResult ? (
          <OperationsEmptyState
            icon={ClipboardCheck}
            title="Scan or Enter SKU to Verify"
            description="Type a SKU code, alias, or scan a barcode to view complete stock details, warehouse locations, purchase history, and sales orders."
          />
        ) : (
          <Stack gap={6}>
            {/* ── Product Hero + Inline Metrics ── */}
            <Paper
              radius="md"
              px="sm"
              py={8}
              withBorder
              style={{
                background: "linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(15, 23, 42, 0.75))",
                borderColor: "rgba(34, 211, 238, 0.16)",
              }}
            >
              <Group justify="space-between" align="center" wrap="nowrap" gap="xs">
                <div className="min-w-0 flex-1">
                  <Group gap={4} wrap="wrap" mb={2}>
                    <Badge size="sm" radius="sm" variant="default" color="gray">{lookupResult.sku}</Badge>
                    {lookupResult.product?.alias && lookupResult.product.alias !== lookupResult.sku && (
                      <Badge size="sm" radius="sm" variant="default" color="gray">Alias: {lookupResult.product.alias}</Badge>
                    )}
                    <Badge size="sm" radius="sm" variant={lookupResult.quantityRow ? "success" : "warning"}>
                      {lookupResult.quantityRow ? "In Stock" : "No Stock Row"}
                    </Badge>
                  </Group>
                  <MasterLink
                    onClick={() => openProductFromSku(lookupResult.sku, productTitle)}
                    size="sm"
                    weight={900}
                  >
                    {productTitle}
                  </MasterLink>
                  <Text size="10px" c="dimmed" mt={1}>
                    {lookupResult.quantityRow
                      ? `Updated ${format(new Date(lookupResult.quantityRow.updatedAt), "dd MMM yyyy HH:mm")}`
                      : "No stock row"}
                  </Text>
                </div>
                {/* ── Inline Metric Strip ── */}
                <Group gap="md" wrap="nowrap" className="shrink-0">
                  <div className="text-center">
                    <Text size="9px" fw={800} c="dimmed" lh={1}>STOCK</Text>
                    <Text size="18px" fw={900} ff="monospace" c={displayedCurrentStock > 0 ? "cyan.3" : "orange.3"} lh={1.2}>
                      {displayedCurrentStock}
                    </Text>
                  </div>
                  <div className="text-center">
                    <Text size="9px" fw={800} c="dimmed" lh={1}>LOCATIONS</Text>
                    <Text size="18px" fw={900} ff="monospace" lh={1.2}>{lookupResult.locations.length}</Text>
                  </div>
                  <div className="text-center">
                    <Text size="9px" fw={800} c="dimmed" lh={1}>MRP</Text>
                    <Text size="18px" fw={900} ff="monospace" lh={1.2}>{formatMoney(lookupResult.invoices[0]?.mrp)}</Text>
                  </div>
                  <div className="text-center">
                    <Text size="9px" fw={800} c="dimmed" lh={1}>MOVES</Text>
                    <Text size="18px" fw={900} ff="monospace" lh={1.2}>{lookupResult.movements.length}</Text>
                  </div>
                  <div className="text-center">
                    <Text size="9px" fw={800} c="dimmed" lh={1}>SALES</Text>
                    <Text size="18px" fw={900} ff="monospace" lh={1.2}>{lookupResult.salesOrders.length}</Text>
                  </div>
                </Group>
              </Group>
            </Paper>

            {/* ── Product Master + Locations Side-by-Side ── */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing={6} style={{ alignItems: "start" }}>
              <Paper radius="md" px="xs" py={8} withBorder bg="transparent">
                <MetricLabel icon={Package} label="Product Master" />
                <SimpleGrid cols={2} spacing={4} mt={4}>
                  <Info label="Name" value={
                    <MasterLink onClick={() => openProductFromSku(lookupResult.sku, productTitle)}>
                      {lookupResult.product?.name || productTitle}
                    </MasterLink>
                  } />
                  <Info label="SKU" value={
                    <MasterLink onClick={() => openProductFromSku(lookupResult.sku, productTitle)} mono>
                      {lookupResult.product?.sku || lookupResult.sku}
                    </MasterLink>
                  } />
                  <Info label="MRP" value={formatMoney(lookupResult.product?.mrp)} />
                  <Info label="USSP" value={formatMoney(lookupResult.product?.ussp)} />
                  <Info label="Net Qty." value={lookupResult.product?.netQuantity || "-"} />
                  <Info label="Unit" value={lookupResult.product?.unitType || "-"} />
                  <Info label="Country" value={lookupResult.product?.countryOfOrigin || "-"} />
                  <Info label="Best Before" value={`${lookupResult.product?.bestBeforeMonths ?? "-"} months`} />
                </SimpleGrid>
                {lookupResult.product?.note && (
                  <>
                    <Divider my={4} style={{ borderColor: "rgba(255,255,255,0.08)" }} />
                    <div className="min-w-0">
                      <Text size="9px" fw={800} c="dimmed">NOTE</Text>
                      <Text size="11px" fw={700} mt={1} lineClamp={2} style={{ whiteSpace: "pre-wrap" }}>
                        {lookupResult.product.note}
                      </Text>
                    </div>
                  </>
                )}
              </Paper>

              <Paper radius="md" px="xs" py={8} withBorder bg="transparent">
                <Group justify="space-between" mb={4}>
                  <MetricLabel icon={MapPin} label="Location Breakdown" />
                  <Badge size="sm" radius="sm" variant="default" color="gray">
                    {lookupResult.locations.length} loc
                  </Badge>
                </Group>
                {lookupResult.locations.length === 0 ? (
                  <EmptyInline message="No allotted location quantity found." />
                ) : (
                  <ScrollArea type="auto" mah={180}>
                    <Table striped highlightOnHover withTableBorder withColumnBorders miw={180}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th style={{ fontSize: 11, padding: "4px 8px" }}>Location</Table.Th>
                          <Table.Th style={{ fontSize: 11, padding: "4px 8px" }}>Bin</Table.Th>
                          <Table.Th ta="right" style={{ fontSize: 11, padding: "4px 8px" }}>Qty</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {visibleLocations.map((location) => {
                          const parts = location.locationCode.split("::");
                          const locCode = parts[0];
                          const binCode = parts.length > 1 ? parts[1] : "-";
                          
                          return (
                            <Table.Tr key={location.locationCode}>
                              <Table.Td style={{ padding: "3px 8px" }}>
                                <Text size="11px" fw={900} ff="monospace">{locCode}</Text>
                              </Table.Td>
                              <Table.Td style={{ padding: "3px 8px" }}>
                                <Text size="11px" fw={900} ff="monospace" c="dimmed">{binCode}</Text>
                              </Table.Td>
                              <Table.Td ta="right" style={{ padding: "3px 8px" }}>
                                <Text size="11px" fw={900} ff="monospace" c="cyan.3">{location.quantity}</Text>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Paper>
            </SimpleGrid>

            {/* ── Tabbed Data Sections ── */}
            <Paper radius="md" px="xs" py={6} withBorder bg="transparent">
              <Tabs defaultValue="movements" variant="default" radius="sm">
                <Tabs.List mb={10} grow>
                  <Tabs.Tab value="movements" leftSection={<History size={14} />} style={{ fontSize: 12, padding: "8px 12px", fontWeight: 600 }}>
                    Movements
                    <Badge
                      size="sm"
                      radius="sm"
                      ml={6}
                      style={{
                        backgroundColor: lookupResult.movements.length > 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.08)",
                        color: lookupResult.movements.length > 0 ? "#0f172a" : "rgba(255, 255, 255, 0.5)",
                        fontWeight: lookupResult.movements.length > 0 ? 800 : 600,
                        fontSize: "10px",
                        padding: "0 6px",
                        height: "18px",
                        lineHeight: "18px",
                        border: lookupResult.movements.length > 0 ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      {lookupResult.movements.length}
                    </Badge>
                  </Tabs.Tab>
                  <Tabs.Tab value="invoices" leftSection={<FileText size={14} />} style={{ fontSize: 12, padding: "8px 12px", fontWeight: 600 }}>
                    Invoices
                    <Badge
                      size="sm"
                      radius="sm"
                      ml={6}
                      style={{
                        backgroundColor: lookupResult.invoices.length > 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.08)",
                        color: lookupResult.invoices.length > 0 ? "#0f172a" : "rgba(255, 255, 255, 0.5)",
                        fontWeight: lookupResult.invoices.length > 0 ? 800 : 600,
                        fontSize: "10px",
                        padding: "0 6px",
                        height: "18px",
                        lineHeight: "18px",
                        border: lookupResult.invoices.length > 0 ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      {lookupResult.invoices.length}
                    </Badge>
                  </Tabs.Tab>
                  <Tabs.Tab value="sales" leftSection={<Boxes size={14} />} style={{ fontSize: 12, padding: "8px 12px", fontWeight: 600 }}>
                    Sales Orders
                    <Badge
                      size="sm"
                      radius="sm"
                      ml={6}
                      style={{
                        backgroundColor: lookupResult.salesOrders.length > 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.08)",
                        color: lookupResult.salesOrders.length > 0 ? "#0f172a" : "rgba(255, 255, 255, 0.5)",
                        fontWeight: lookupResult.salesOrders.length > 0 ? 800 : 600,
                        fontSize: "10px",
                        padding: "0 6px",
                        height: "18px",
                        lineHeight: "18px",
                        border: lookupResult.salesOrders.length > 0 ? "none" : "1px solid rgba(255, 255, 255, 0.15)",
                      }}
                    >
                      {lookupResult.salesOrders.length}
                    </Badge>
                  </Tabs.Tab>
                </Tabs.List>

                {/* ── Movements Tab ── */}
                <Tabs.Panel value="movements">
                  {lookupResult.movements.length === 0 ? (
                    <EmptyInline message="No stock adjustment or movement history found for this SKU." />
                  ) : (
                    <ScrollArea type="auto" h={280} offsetScrollbars>
                      <Table striped highlightOnHover withTableBorder withColumnBorders miw={860}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Date</Table.Th>
                            <Table.Th>Type</Table.Th>
                            <Table.Th>Change</Table.Th>
                            <Table.Th>Before</Table.Th>
                            <Table.Th>After</Table.Th>
                            <Table.Th>Reason</Table.Th>
                            <Table.Th>By</Table.Th>
                            <Table.Th>Notes</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {visibleMovements.map((movement) => (
                            <Table.Tr key={movement.id}>
                              <Table.Td>{format(new Date(movement.createdAt), "dd MMM yyyy HH:mm")}</Table.Td>
                              <Table.Td>
                                <Badge size="sm" radius="md" variant={movement.quantityChange >= 0 ? "success" : "warning"}>
                                  {movement.movementType || (movement.quantityChange >= 0 ? "increase" : "decrease")}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Text size="12px" fw={900} ff="monospace" c={movement.quantityChange >= 0 ? "green.3" : "orange.3"}>
                                  {movement.quantityChange > 0 ? "+" : ""}{movement.quantityChange}
                                </Text>
                              </Table.Td>
                              <Table.Td>{movement.quantityBefore}</Table.Td>
                              <Table.Td>{movement.quantityAfter}</Table.Td>
                              <Table.Td>{movement.reason}</Table.Td>
                              <Table.Td>{movement.performedByName || "-"}</Table.Td>
                              <Table.Td>
                                <Text size="12px" maw={280} lineClamp={2}>{movement.notes || "-"}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )}
                </Tabs.Panel>

                {/* ── Invoices Tab ── */}
                <Tabs.Panel value="invoices">
                  {lookupResult.invoices.length === 0 ? (
                    <EmptyInline message="No purchase invoices found for this SKU." />
                  ) : (
                    <ScrollArea type="auto" h={280} offsetScrollbars>
                      <Table striped highlightOnHover withTableBorder withColumnBorders miw={600}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Invoice Date</Table.Th>
                            <Table.Th>Invoice No.</Table.Th>
                            <Table.Th>Party</Table.Th>
                            <Table.Th>MRP</Table.Th>
                            <Table.Th ta="right">Billed Qty</Table.Th>
                            <Table.Th>Notes</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {visibleInvoices.map((inv) => (
                            <Table.Tr key={inv.id}>
                              <Table.Td>{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</Table.Td>
                              <Table.Td>
                                <Text size="12px" fw={900} ff="monospace">{inv.invoiceNumber}</Text>
                              </Table.Td>
                              <Table.Td>{inv.partyName}</Table.Td>
                              <Table.Td>{formatMoney(inv.mrp)}</Table.Td>
                              <Table.Td ta="right">
                                <Text size="12px" fw={900} ff="monospace" c="cyan.3">{inv.billedQty}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="12px" maw={200} lineClamp={2}>
                                  {inv.cancelRemark || "-"}
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )}
                </Tabs.Panel>

                {/* ── Sales Orders Tab ── */}
                <Tabs.Panel value="sales">
                  {lookupResult.salesOrders.length === 0 ? (
                    <EmptyInline message="No sales orders found for this SKU." />
                  ) : (
                    <ScrollArea type="auto" h={280} offsetScrollbars>
                      <Table striped highlightOnHover withTableBorder withColumnBorders miw={920}>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Order Date</Table.Th>
                            <Table.Th>Order No.</Table.Th>
                            <Table.Th>Customer</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Tracking / AWB</Table.Th>
                            <Table.Th ta="right">Qty</Table.Th>
                            <Table.Th ta="right">Picked</Table.Th>
                            <Table.Th ta="right">Pending</Table.Th>
                            <Table.Th>Notes</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {visibleSalesOrders.map((order) => {
                            const skuItems = order.items;
                            const quantity = skuItems.reduce((sum, item) => sum + item.quantity, 0);
                            const pickedQuantity = skuItems.reduce((sum, item) => sum + item.pickedQuantity, 0);
                            const pendingQuantity = skuItems.reduce((sum, item) => sum + item.pendingQuantity, 0);

                            return (
                              <Table.Tr key={order.id}>
                                <Table.Td>{format(new Date(order.orderDate), "dd MMM yyyy")}</Table.Td>
                                <Table.Td>
                                  <Text size="12px" fw={900} ff="monospace">{order.orderNumber}</Text>
                                </Table.Td>
                                <Table.Td>{order.customerName}</Table.Td>
                                <Table.Td>
                                  <Badge size="sm" radius="md" variant={order.status === "Dispatched" ? "success" : order.status === "Canceled" ? "warning" : "default"}>
                                    {order.status}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  {order.trackingNumber ? (
                                    <Text size="11px" fw={800} ff="monospace" c="yellow.3" truncate maw={140} title={order.trackingNumber}>
                                      {order.trackingNumber}
                                    </Text>
                                  ) : (
                                    <Text size="11px" c="dimmed">—</Text>
                                  )}
                                </Table.Td>
                                <Table.Td ta="right">
                                  <Text size="12px" fw={900} ff="monospace" c="cyan.3">{quantity}</Text>
                                </Table.Td>
                                <Table.Td ta="right">{pickedQuantity}</Table.Td>
                                <Table.Td ta="right">{pendingQuantity}</Table.Td>
                                <Table.Td>
                                  <Text size="12px" maw={200} lineClamp={2}>
                                    {order.cancelRemark || order.notes || "-"}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )}
                </Tabs.Panel>
              </Tabs>
            </Paper>
          </Stack>
        )}
      </div>

      <ProductUpdateModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={lookupResult?.product || null}
        onProductSaved={(product) => {
          setLookupResult((prev) => (prev ? { ...prev, product } : prev));
          void loadData();
        }}
        onPrint={handlePrint}
      />
      <StickerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        product={selectedPrintProduct}
      />
    </OperationsPage>
  );
}
