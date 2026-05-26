import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ClipboardCheck,
  ExternalLink,
  FileText,
  IndianRupee,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
  ScanLine,
  Search,
  Tag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Group, Paper, ScrollArea, SimpleGrid, Stack, Table, Text, TextInput } from "@mantine/core";

import { Button } from "../components/atoms/Button";
import { Badge } from "../components/atoms/Badge";
import { toast } from "../lib/toast";
import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  poInvoicesApi,
  PoInvoice,
  productAllottedLocationsApi,
  ProductAllottedLocationRecord,
  productQuantitiesApi,
  Product,
  ProductQuantityRecord,
  productsApi,
} from "../services/masterApi";
import { ProductFormModal } from "../components/organisms/ProductFormModal";
import { StickerPrintModal } from "../components/organisms/StickerPrintModal";

type LocationStock = {
  locationCode: string;
  quantity: number;
};

type ProductLookupResult = {
  sku: string;
  product: Product | null;
  quantityRow: ProductQuantityRecord | null;
  allottedLocation: ProductAllottedLocationRecord | null;
  invoices: PoInvoice[];
  locations: LocationStock[];
  totalPoQuantity: number;
  totalLocationStock: number;
};

const formatMoney = (value?: number | null) =>
  typeof value === "number"
    ? new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value)
    : "-";

const normalizeSku = (value?: string | null) => (value || "").trim().toUpperCase();

const masterHref = (path: string, search: string) =>
  `${path}?search=${encodeURIComponent(search)}`;

const getLocationJson = (row: ProductAllottedLocationRecord | null) => {
  if (!row) return {};
  return (
    row.locationJson ||
    (row as unknown as { LocationJson?: Record<string, number> }).LocationJson ||
    {}
  );
};

export const StockCheck = memo(function StockCheck() {
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

  const knownSkuCount = useMemo(() => {
    const skuSet = new Set<string>();
    products.forEach((product) => {
      const sku = normalizeSku(product.sku);
      if (sku) skuSet.add(sku);
    });
    quantityRows.forEach((row) => skuSet.add(normalizeSku(row.skuCode)));
    allottedLocations.forEach((row) => skuSet.add(normalizeSku(row.skuCode)));
    return skuSet.size;
  }, [allottedLocations, products, quantityRows]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [productsData, quantityData, allottedData] = await Promise.all([
        productsApi.getAll(),
        productQuantitiesApi.getAll(),
        productAllottedLocationsApi.getAll(),
      ]);

      setProducts(productsData);
      setQuantityRows(quantityData);
      setAllottedLocations(allottedData);
    } catch {
      toast.error("Failed to load product detail data");
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

  const handlePrint = (product: Product) => {
    setSelectedPrintProduct(product);
    setIsPrintModalOpen(true);
  };

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();

    const sku = normalizeSku(scanInput);
    if (!sku) return;

    const product =
      products.find((item) => normalizeSku(item.sku) === sku) ?? null;
    const quantityRow =
      quantityRows.find((row) => normalizeSku(row.skuCode) === sku) ?? null;
    const resolvedProductId =
      product?.id ?? quantityRow?.productId ?? null;
    const allottedLocation =
      allottedLocations.find((row) =>
        resolvedProductId
          ? row.productId === resolvedProductId
          : normalizeSku(row.skuCode) === sku,
      ) ??
      allottedLocations.find((row) => normalizeSku(row.skuCode) === sku) ??
      null;

    try {
      setIsSearching(true);
      const invoiceRows = await poInvoicesApi.getAll({
        search: sku,
        pageSize: 100,
      });
      const invoices = invoiceRows
        .filter((row) => normalizeSku(row.skuCode) === sku)
        .sort((first, second) => {
          const dateDiff =
            new Date(second.invoiceDate).getTime() -
            new Date(first.invoiceDate).getTime();

          return dateDiff || second.id - first.id;
        });
      const locations = Object.entries(getLocationJson(allottedLocation))
        .map(([locationCode, quantity]) => ({
          locationCode,
          quantity: Number(quantity) || 0,
        }))
        .filter((entry) => entry.quantity > 0)
        .sort((a, b) => a.locationCode.localeCompare(b.locationCode));

      setLookupResult({
        sku,
        product,
        quantityRow,
        allottedLocation,
        invoices,
        locations,
        totalPoQuantity: invoices.reduce((sum, row) => sum + Number(row.billedQty || 0), 0),
        totalLocationStock: locations.reduce((sum, row) => sum + row.quantity, 0),
      });

      if (!product && !quantityRow && !allottedLocation && invoices.length === 0) {
        toast.error("No product details found for this SKU");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load SKU details");
    } finally {
      setIsSearching(false);
      focusScanner();
    }
  };

  const productTitle =
    lookupResult?.product?.name ||
    lookupResult?.quantityRow?.productName ||
    lookupResult?.allottedLocation?.productName ||
    lookupResult?.invoices[0]?.productName ||
    "Product Details";

  return (
    <OperationsPage
      title="Inventory Item Card"
      description="Enter a SKU to view product master references, invoice pricing, total quantity, and allotted location stock."
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
        { label: "Known SKUs", value: knownSkuCount, tone: "brand" },
        { label: "Last Lookup", value: lookupResult ? lookupResult.sku : "-", tone: "default" },
        {
          label: "Current Stock",
          value: lookupResult?.quantityRow?.currentQuantity ?? "-",
          tone: "success",
        },
      ]}
    >
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0">
        <OperationsPanel
          title="Item Lookup"
          icon={ScanLine}
          description="Scan or enter a SKU to open a Zoho-style inventory reference card."
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
                    fontFamily: "var(--font-mono)",
                  },
                }}
                leftSection={<Search size={14} />}
              />
            </div>

            <Group gap="xs" wrap="nowrap">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isLoading}
                loading={isSearching}
              >
                Show Details
              </Button>
              <Button
                type="button"
                size="sm"
                variant="subtle"
                onClick={() => {
                  setScanInput("");
                  setLookupResult(null);
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
                PRODUCT ROWS
              </Text>
              <Text mt={6} size="lg" fw={800} c="white">
                {products.length}
              </Text>
            </Paper>
            <Paper radius="lg" p="sm" withBorder bg="transparent">
              <Text size="10px" fw={800} c="dimmed">
                LOCATION ROWS
              </Text>
              <Text mt={6} size="lg" fw={800} c="white">
                {allottedLocations.length}
              </Text>
            </Paper>
          </SimpleGrid>

          {lookupResult ? (
            <Paper radius="lg" p="sm" withBorder bg="rgba(14, 165, 233, 0.06)">
              <Text size="10px" fw={800} c="dimmed" mb={8}>
                LINKED REFERENCES
              </Text>
              <Stack gap={7}>
                <ReferenceLink
                  icon={Package}
                  label="Product Master"
                  value={productTitle}
                  onClick={() => lookupResult?.product && setIsEditModalOpen(true)}
                  isButton
                />
                <ReferenceLink
                  icon={FileText}
                  label="PO Invoices"
                  value={`${lookupResult.invoices.length} invoice rows`}
                  href={masterHref("/inward", lookupResult.sku)}
                />
                <ReferenceLink
                  icon={MapPin}
                  label="Location Master"
                  value={`${lookupResult.locations.length} allotted locations`}
                  href={masterHref("/warehouse-map", lookupResult.locations[0]?.locationCode || lookupResult.sku)}
                />
              </Stack>
            </Paper>
          ) : (
            <Paper radius="lg" p="sm" withBorder bg="rgba(14, 165, 233, 0.06)">
              <Group gap="sm" wrap="nowrap">
                <Boxes size={17} color="var(--mantine-color-cyan-4)" />
                <Text size="xs" c="dimmed">
                  This page is read-only. It shows connected product, invoice, and location records without changing stock.
                </Text>
              </Group>
            </Paper>
          )}
        </OperationsPanel>

        <OperationsPanel
          title="Inventory Details"
          icon={Boxes}
          description="Reference-linked product master, PO invoice rows, quantity, and location stock."
          className="lg:col-span-8 flex flex-col overflow-hidden h-full"
          contentClassName="overflow-y-auto scrollbar-thin"
        >
          {!lookupResult ? (
            <OperationsEmptyState
              icon={ClipboardCheck}
              title="Enter SKU To View Product Details"
              description="Search a SKU code to see invoice details, price, quantity, and allotted stock locations."
            />
          ) : (
            <Stack gap="sm">
              <Paper
                radius="lg"
                p="md"
                withBorder
                bg="linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(15, 23, 42, 0.72))"
                style={{ borderColor: "rgba(34, 211, 238, 0.16)" }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <div className="min-w-0">
                  <Group gap="xs" wrap="nowrap">
                    <Badge size="sm" radius="md" variant="default" color="gray">
                      {lookupResult.sku}
                    </Badge>
                    <Badge size="sm" radius="md" variant={lookupResult.quantityRow ? "success" : "warning"}>
                      {lookupResult.quantityRow ? "Stock Available" : "No Stock Row"}
                    </Badge>
                  </Group>
                  <MasterLink
                    onClick={() => lookupResult?.product && setIsEditModalOpen(true)}
                    size="lg"
                    weight={900}
                    className="mt-2"
                  >
                    {productTitle}
                  </MasterLink>
                  <Text size="11px" c="dimmed">
                    {lookupResult.quantityRow
                      ? `Stock updated ${format(new Date(lookupResult.quantityRow.updatedAt), "dd MMM yyyy HH:mm")}`
                      : "No stock quantity row exists for this SKU"}
                  </Text>
                  </div>
                </Group>
              </Paper>

              <SimpleGrid cols={{ base: 1, md: 4 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Boxes} label="Current Stock" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.quantityRow?.currentQuantity ?? 0}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={FileText} label="PO Qty." />
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.totalPoQuantity}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={MapPin} label="Allotted Stock" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {lookupResult.totalLocationStock}
                  </Text>
                </Paper>
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={IndianRupee} label="Latest Invoice Price" />
                  <Text mt={6} size="xl" fw={800} ff="monospace">
                    {formatMoney(lookupResult.invoices[0]?.mrp)}
                  </Text>
                </Paper>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={Package} label="Product Master" />
                  <SimpleGrid cols={2} spacing={6} mt="xs">
                    <Info
                      label="Name"
                      value={
                        <MasterLink onClick={() => lookupResult?.product && setIsEditModalOpen(true)}>
                          {lookupResult.product?.name || productTitle}
                        </MasterLink>
                      }
                    />
                    <Info
                      label="SKU"
                      value={
                        <MasterLink onClick={() => lookupResult?.product && setIsEditModalOpen(true)} mono>
                          {lookupResult.product?.sku || lookupResult.sku}
                        </MasterLink>
                      }
                    />
                    <Info label="MRP" value={formatMoney(lookupResult.product?.mrp)} />
                    <Info label="USSP" value={formatMoney(lookupResult.product?.ussp)} />
                    <Info label="Net Qty." value={lookupResult.product?.netQuantity || "-"} />
                    <Info label="Unit" value={lookupResult.product?.unitType || "-"} />
                    <Info label="Country" value={lookupResult.product?.countryOfOrigin || "-"} />
                    <Info label="Best Before" value={`${lookupResult.product?.bestBeforeMonths ?? "-"} months`} />
                  </SimpleGrid>
                </Paper>

                <Paper radius="lg" p="sm" withBorder bg="transparent">
                  <MetricLabel icon={MapPin} label="Location Stock" />
                  {lookupResult.locations.length === 0 ? (
                    <EmptyInline message="No allotted location stock found for this SKU." />
                  ) : (
                    <Stack gap={6} mt="xs">
                      {lookupResult.locations.map((entry) => (
                        <Group
                          key={entry.locationCode}
                          justify="space-between"
                          wrap="nowrap"
                          className="rounded-md border border-slate-700/60 px-2 py-1.5"
                        >
                          <Group gap={6} wrap="nowrap">
                            <MapPin size={13} color="var(--mantine-color-cyan-4)" />
                            <MasterLink
                              href={masterHref("/warehouse-map", entry.locationCode)}
                              mono
                            >
                              {entry.locationCode}
                            </MasterLink>
                          </Group>
                          <Text size="12px" fw={800} ff="monospace">
                            {entry.quantity}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  )}
                </Paper>
              </SimpleGrid>

              <Paper radius="lg" p="sm" withBorder bg="transparent">
                <Group justify="space-between" mb="xs">
                  <MetricLabel icon={FileText} label="PO Invoice Details With Price" />
                  <Badge size="sm" radius="md" variant="default" color="gray">
                    {lookupResult.invoices.length} rows
                  </Badge>
                </Group>
                {lookupResult.invoices.length === 0 ? (
                  <EmptyInline message="No PO invoice rows found for this SKU." />
                ) : (
                  <ScrollArea type="auto">
                    <Table striped highlightOnHover withTableBorder withColumnBorders miw={760}>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Invoice No.</Table.Th>
                          <Table.Th>Date</Table.Th>
                          <Table.Th>Party</Table.Th>
                          <Table.Th>Product</Table.Th>
                          <Table.Th>Invoice Price</Table.Th>
                          <Table.Th>Billed Qty.</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {lookupResult.invoices.map((invoice) => (
                          <Table.Tr key={invoice.id}>
                            <Table.Td>
                              <MasterLink
                                href={masterHref("/inward", invoice.invoiceNumber)}
                                mono
                              >
                                {invoice.invoiceNumber}
                              </MasterLink>
                            </Table.Td>
                            <Table.Td>{format(new Date(invoice.invoiceDate), "dd MMM yyyy")}</Table.Td>
                            <Table.Td>{invoice.partyName}</Table.Td>
                            <Table.Td>
                              <MasterLink onClick={() => {
                                const prod = products.find(p => p.sku === invoice.skuCode);
                                if (prod) {
                                  setLookupResult(prev => prev ? { ...prev, product: prod } : null);
                                  setIsEditModalOpen(true);
                                } else {
                                  navigate(masterHref("/mpd", invoice.skuCode));
                                }
                              }}>
                                {invoice.productName}
                              </MasterLink>
                            </Table.Td>
                            <Table.Td>{formatMoney(invoice.mrp)}</Table.Td>
                            <Table.Td>{invoice.billedQty}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                )}
              </Paper>
            </Stack>
          )}
        </OperationsPanel>
      </div>
      <ProductFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        product={lookupResult?.product || null}
        onSuccess={() => void loadData()}
        onPrint={handlePrint}
      />
      <StickerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        product={selectedPrintProduct}
      />
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

function MetricLabel({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
}) {
  return (
    <Group gap={6} wrap="nowrap">
      <Icon size={13} color="var(--mantine-color-cyan-4)" />
      <Text size="10px" fw={800} c="dimmed">
        {label.toUpperCase()}
      </Text>
    </Group>
  );
}

function MasterLink({
  children,
  href,
  onClick,
  mono = false,
  size = "12px",
  weight = 800,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  mono?: boolean;
  size?: string;
  weight?: number;
  className?: string;
}) {
  return (
    <Text
      component={onClick ? "button" : "a"}
      onClick={onClick}
      href={href}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
      size={size}
      fw={weight}
      ff={mono ? "monospace" : undefined}
      className={className}
      style={{
        color: "var(--mantine-color-cyan-3)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        textDecoration: "none",
        cursor: "pointer",
        background: "none",
        border: "none",
        padding: 0,
        textAlign: "left",
      }}
    >
      <span className="truncate">{children}</span>
      <ExternalLink size={12} />
    </Text>
  );
}

function ReferenceLink({
  icon: Icon,
  label,
  value,
  href,
  onClick,
  isButton,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  value: string;
  href?: string;
  onClick?: () => void;
  isButton?: boolean;
}) {
  const inner = (
    <>
      <Group gap={7} wrap="nowrap" className="min-w-0">
        <Icon size={14} color="var(--mantine-color-cyan-4)" />
        <div className="min-w-0">
          <Text size="9px" fw={800} c="dimmed">
            {label.toUpperCase()}
          </Text>
          <Text size="11px" fw={800} c="cyan.3" truncate>
            {value}
          </Text>
        </div>
      </Group>
      <ExternalLink size={13} color="var(--mantine-color-cyan-4)" />
    </>
  );

  if (isButton || onClick) {
    return (
      <button
        onClick={onClick}
        type="button"
        className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10 w-full text-left cursor-pointer"
      >
        {inner}
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-2 rounded-md border border-cyan-400/10 bg-slate-950/30 px-2 py-2 no-underline transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
    >
      {inner}
    </a>
  );
}

function EmptyInline({ message }: { message: string }) {
  return (
    <Group gap="sm" mt="xs" wrap="nowrap" className="rounded-md border border-slate-700/60 px-2 py-2">
      <AlertTriangle size={15} color="var(--mantine-color-yellow-4)" />
      <Text size="xs" c="dimmed">
        {message}
      </Text>
    </Group>
  );
}

export default StockCheck;
