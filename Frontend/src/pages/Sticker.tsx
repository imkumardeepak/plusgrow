import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  IconAlertCircle,
  IconCheck,
  IconEye,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTag,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Group,
  Image,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Radio,
  ScrollArea,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Printer } from "lucide-react";

import {
  OperationsEmptyState,
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  Importer,
  Manufacturer,
  PoInvoice,
  PoInvoiceFilters,
  Product,
  importersApi,
  manufacturersApi,
  poInvoicesApi,
  productsApi,
} from "../services/masterApi";
import { StickerTemplate, stickersApi } from "../services/stickersApi";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";

type StickerMode = "Combined" | "Separate";
type StickerStatusFilter = "all" | "pending" | "printed";

const rowStatusColor = (printed: boolean) => (printed ? "green" : "orange");
const labelModeText: Record<StickerMode, string> = {
  Combined: "Imported & Marketed By",
  Separate: "Marketed / Imported",
};
const defaultToDate = format(new Date(), "yyyy-MM-dd");
const defaultFromDate = format(
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  "yyyy-MM-dd",
);

export const Sticker = memo(function Sticker() {
  const [poInvoices, setPoInvoices] = useState<PoInvoice[]>([]);
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<StickerMode>("Combined");
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [importerId, setImporterId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StickerStatusFilter>("all");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [selectedRow, setSelectedRow] = useState<PoInvoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reprintFrom, setReprintFrom] = useState<number | "">(1);
  const [reprintTo, setReprintTo] = useState<number | "">(1);

  const loadMetaData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        manufacturerData,
        importerData,
        productData,
        templateData,
        configData,
      ] = await Promise.all([
        manufacturersApi.getAll(),
        importersApi.getAll(),
        productsApi.getAll(),
        stickersApi.getTemplates(),
        stickerPrinterConfigsApi.getAll(),
      ]);

      setManufacturers(manufacturerData);
      setImporters(importerData);
      setProducts(productData);
      setTemplates(templateData);
      setPrinterConfigs(configData);
    } catch (error) {
      notifications.show({
        title: "Load failed",
        message: "Could not load PO invoice sticker data",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetaData();
  }, [loadMetaData]);

  useEffect(() => {
    setImporterId(null);
  }, [stickerType]);

  useEffect(() => {
    if (!selectedRow) return;
    setReprintFrom(1);
    setReprintTo(selectedRow.billedQty || 1);
  }, [selectedRow]);

  const printerConfig = useMemo(
    () =>
      printerConfigs.find(
        (config) => config.stickerSize === stickerSize && config.isActive,
      ) ?? null,
    [printerConfigs, stickerSize],
  );

  const activeTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.size === stickerSize && template.type === stickerType,
      ) ?? null,
    [stickerSize, stickerType, templates],
  );

  const manufacturerOptions = useMemo(
    () =>
      manufacturers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [manufacturers],
  );

  const importerOptions = useMemo(
    () =>
      importers.map((item) => ({
        value: String(item.id),
        label: item.name,
      })),
    [importers],
  );

  const selectedProduct = useMemo(
    () =>
      selectedRow
        ? products.find((product) => product.id === selectedRow.productId) ??
          null
        : null,
    [products, selectedRow],
  );

  const filteredRows = poInvoices;

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const invoiceData = await poInvoicesApi.getAll(filters);
      setPoInvoices(invoiceData);
    } catch (error) {
      notifications.show({
        title: "Rows load failed",
        message: "Could not load filtered PO invoice rows",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInvoiceRows({
      search,
      status: statusFilter,
      fromDate,
      toDate,
    });
  }, [fromDate, loadInvoiceRows, search, statusFilter, toDate]);

  const pendingRows = poInvoices.filter((row) => !row.printed).length;
  const printedRows = poInvoices.length - pendingRows;
  const pendingLabels = poInvoices
    .filter((row) => !row.printed)
    .reduce((sum, row) => sum + row.billedQty, 0);

  const buildPayload = useCallback(
    (row: PoInvoice, quantity: number) => ({
      productId: row.productId,
      manufacturerId: manufacturerId ? Number(manufacturerId) : undefined,
      importerId:
        stickerType === "Separate" && importerId
          ? Number(importerId)
          : undefined,
      size: stickerSize,
      type: stickerType,
      monthYear: format(new Date(row.invoiceDate), "MMM/yyyy").toUpperCase(),
      batchNumber: row.invoiceNumber,
      note: "",
      quantity,
    }),
    [importerId, manufacturerId, stickerSize, stickerType],
  );

  const refreshPreview = useCallback(async () => {
    if (!selectedRow) {
      setPreviewUrl(null);
      return;
    }

    setIsPreviewLoading(true);
    try {
      const nextPreview = await stickersApi.getPreview(
        buildPayload(selectedRow, selectedRow.billedQty || 1),
      );
      setPreviewUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return nextPreview;
      });
    } catch (error) {
      setPreviewUrl(null);
    } finally {
      setIsPreviewLoading(false);
    }
  }, [buildPayload, selectedRow]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [refreshPreview]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const getPrinterAddress = () => {
    if (!printerConfig?.printerIp?.trim()) return null;
    return `${printerConfig.printerIp.trim()}:${printerConfig.printerPort}`;
  };

  const handlePrint = async (mode: "normal" | "reprint") => {
    if (!selectedRow) return;

    const printerAddress = getPrinterAddress();
    if (!printerAddress) {
      notifications.show({
        title: "Printer missing",
        message: "Active printer profile not found for selected sticker size",
        color: "red",
      });
      return;
    }

    const from = Number(reprintFrom || 1);
    const to = Number(reprintTo || from);
    const reprintQuantity = Math.max(1, to - from + 1);
    const quantity = mode === "normal" ? selectedRow.billedQty : reprintQuantity;

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerAddress,
        items: [
          {
            config: {
              ...buildPayload(selectedRow, quantity),
              note:
                mode === "reprint"
                  ? `Reprint sticker ${from} to ${to}`
                  : "",
            },
            quantity,
          },
        ],
      });

      if (mode === "normal") {
        await poInvoicesApi.markPrinted([selectedRow.id]);
        await loadInvoiceRows({
          search,
          status: statusFilter,
          fromDate,
          toDate,
        });
        setSelectedRow((current) =>
          current ? { ...current, printed: true } : current,
        );
      }

      notifications.show({
        title: mode === "normal" ? "Printed" : "Reprint sent",
        message:
          mode === "normal"
            ? `${selectedRow.billedQty} stickers sent`
            : `${quantity} stickers sent from ${from} to ${to}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error: any) {
      notifications.show({
        title: "Print failed",
        message: error.message || "Sticker print job failed",
        color: "red",
        icon: <IconAlertCircle size={16} />,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <OperationsPage
      title="Sticker"
      description="Select sticker type first, review PO invoice table, then open row print view."
      icon={Printer}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={IconTag}
          description="Status and invoice date window for sticker rows."
        >
          <SimpleGrid cols={{ base: 1, lg: 4 }} spacing="sm">
            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as StickerStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "pending", label: "Pending" },
                  { value: "printed", label: "Printed" },
                ]}
              />
            </Box>

            <TextInput
              size="xs"
              radius="md"
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.currentTarget.value)}
            />

            <TextInput
              size="xs"
              radius="md"
              label="To Date"
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.currentTarget.value)}
            />

            <Box>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                QUICK RANGE
              </Text>
              <Group gap="xs" wrap="nowrap">
                <Button
                  size="xs"
                  variant="light"
                  onClick={() => {
                    setFromDate(defaultFromDate);
                    setToDate(defaultToDate);
                  }}
                >
                  Last 7 Days
                </Button>
                <Button
                  size="xs"
                  variant="subtle"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                    setStatusFilter("all");
                  }}
                >
                  Clear
                </Button>
              </Group>
            </Box>
          </SimpleGrid>
        </OperationsPanel>

        <OperationsPanel
          title="PO Invoice Data"
          icon={IconPrinter}
          description="Table view for sticker print and reprint actions."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {poInvoices.length} rows
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="orange">
                {pendingRows} pending
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="cyan">
                {pendingLabels} stickers
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {printedRows} printed
              </Badge>
              <TextInput
                size="xs"
                radius="md"
                w={260}
                value={search}
                onChange={(event) => setSearch(event.currentTarget.value)}
                placeholder="Search invoice, party, SKU..."
                leftSection={<IconSearch size={14} />}
              />
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() =>
                  void loadInvoiceRows({
                    search,
                    status: statusFilter,
                    fromDate,
                    toDate,
                  })
                }
                loading={isRowsLoading}
                aria-label="Refresh PO invoice data"
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Group>
          }
          contentClassName="p-0"
        >
          {isLoading || isRowsLoading ? (
            <Center h={260}>
              <Loader size="sm" />
            </Center>
          ) : filteredRows.length === 0 ? (
            <OperationsEmptyState
              icon={IconPrinter}
              title="No PO invoice rows"
              description="No sticker rows match current search."
            />
          ) : (
            <ScrollArea>
              <Table
                highlightOnHover
                stickyHeader
                verticalSpacing={6}
                horizontalSpacing="sm"
                style={{ minWidth: 980, fontSize: 12 }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Invoice</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Party</Table.Th>
                    <Table.Th>SKU</Table.Th>
                    <Table.Th>Product</Table.Th>
                    <Table.Th ta="right">Qty</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th ta="right">Action</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredRows.map((row) => (
                    <Table.Tr key={row.id}>
                      <Table.Td>
                        <Text size="xs" fw={800} ff="monospace">
                          {row.invoiceNumber}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          {format(new Date(row.invoiceDate), "dd-MMM-yy")}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={650} lineClamp={1}>
                          {row.partyName}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" fw={800} ff="monospace" c="cyan.3">
                          {row.skuCode}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs" lineClamp={1} maw={320}>
                          {row.productName}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="xs" fw={800}>
                          {row.billedQty}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="xs"
                          radius="sm"
                          color={rowStatusColor(row.printed)}
                          variant={row.printed ? "light" : "filled"}
                        >
                          {row.printed ? "Printed" : "Pending"}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Tooltip label="View print options">
                          <ActionIcon
                            size="sm"
                            radius="md"
                            variant="light"
                            color="cyan"
                            onClick={() => setSelectedRow(row)}
                            aria-label="View print options"
                          >
                            <IconEye size={15} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </OperationsPanel>
      </Stack>

      <Modal
        opened={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        title="Sticker Print"
        size="xl"
        centered
      >
        {selectedRow ? (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            <Stack gap="sm">
              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Sticker Options
                </Text>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
                  <Box>
                    <Text size="10px" fw={800} c="dimmed" mb={5}>
                      SIZE
                    </Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      radius="md"
                      value={stickerSize}
                      onChange={setStickerSize}
                      data={[
                        { value: "50x50", label: "50x50" },
                        { value: "60x60", label: "60x60" },
                        { value: "75x75", label: "75x75" },
                      ]}
                    />
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed" mb={5}>
                      LABEL MODE
                    </Text>
                    <Radio.Group
                      value={stickerType}
                      onChange={(value) => setStickerType(value as StickerMode)}
                    >
                      <Stack gap={6}>
                        <Radio
                          value="Combined"
                          label={labelModeText.Combined}
                          size="xs"
                        />
                        <Radio
                          value="Separate"
                          label={labelModeText.Separate}
                          size="xs"
                        />
                      </Stack>
                    </Radio.Group>
                  </Box>
                  <Select
                    label="Manufacturer"
                    size="xs"
                    radius="md"
                    placeholder="Default"
                    value={manufacturerId}
                    onChange={setManufacturerId}
                    searchable
                    clearable
                    data={manufacturerOptions}
                  />
                  {stickerType === "Separate" ? (
                    <Select
                      label="Importer"
                      size="xs"
                      radius="md"
                      placeholder="Select importer"
                      value={importerId}
                      onChange={setImporterId}
                      searchable
                      clearable
                      data={importerOptions}
                    />
                  ) : (
                    <Box>
                      <Text size="10px" fw={800} c="dimmed">
                        TEMPLATE
                      </Text>
                      <Text size="xs" fw={700} lineClamp={1} mt={4}>
                        {activeTemplate?.name || "Template missing"}
                      </Text>
                    </Box>
                  )}
                </SimpleGrid>
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Group justify="space-between" align="flex-start">
                  <Box>
                    <Text size="xs" fw={800} ff="monospace">
                      {selectedRow.invoiceNumber}
                    </Text>
                    <Text size="sm" fw={700} mt={2}>
                      {selectedRow.partyName}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {format(new Date(selectedRow.invoiceDate), "dd MMM yyyy")}
                    </Text>
                  </Box>
                  <Badge
                    color={rowStatusColor(selectedRow.printed)}
                    variant={selectedRow.printed ? "light" : "filled"}
                  >
                    {selectedRow.printed ? "Printed" : "Pending"}
                  </Badge>
                </Group>
                <Divider my="sm" />
                <Text size="xs" c="dimmed">
                  SKU
                </Text>
                <Text size="sm" fw={800} ff="monospace" c="cyan.3">
                  {selectedRow.skuCode}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Product
                </Text>
                <Text size="sm" fw={700}>
                  {selectedRow.productName}
                </Text>
                <Text size="xs" c="dimmed" mt="xs">
                  Product master
                </Text>
                <Text size="xs">
                  {selectedProduct?.name || "Not matched"} ·{" "}
                  {selectedProduct?.unitType || "No unit"}
                </Text>
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <SimpleGrid cols={3} spacing="xs">
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      SIZE
                    </Text>
                    <Text size="xs" fw={800}>
                      {stickerSize}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      MODE
                    </Text>
                    <Text size="xs" fw={800}>
                      {labelModeText[stickerType]}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="10px" fw={800} c="dimmed">
                      QTY
                    </Text>
                    <Text size="xs" fw={800}>
                      {selectedRow.billedQty}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Paper>

              <Paper radius="md" p="sm" withBorder>
                <Text size="xs" fw={800} mb="xs">
                  Reprint Range
                </Text>
                <SimpleGrid cols={2} spacing="xs">
                  <NumberInput
                    size="xs"
                    label="From sticker"
                    min={1}
                    max={selectedRow.billedQty}
                    value={reprintFrom}
                    onChange={(value) =>
                      setReprintFrom(typeof value === "number" ? value : "")
                    }
                  />
                  <NumberInput
                    size="xs"
                    label="To sticker"
                    min={1}
                    max={selectedRow.billedQty}
                    value={reprintTo}
                    onChange={(value) =>
                      setReprintTo(typeof value === "number" ? value : "")
                    }
                  />
                </SimpleGrid>
                <Group mt="sm" grow>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconPrinter size={14} />}
                    onClick={() => void handlePrint("reprint")}
                    loading={isPrinting}
                  >
                    Reprint Range
                  </Button>
                  <Button
                    size="xs"
                    leftSection={<IconPrinter size={14} />}
                    onClick={() => void handlePrint("normal")}
                    loading={isPrinting}
                    disabled={selectedRow.printed}
                  >
                    Print Full Qty
                  </Button>
                </Group>
              </Paper>
            </Stack>

            <Paper radius="md" p="sm" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="xs" fw={800}>
                  Preview
                </Text>
                <Badge size="xs" variant="light" color="cyan">
                  {activeTemplate?.fileName || "Template missing"}
                </Badge>
              </Group>
              {isPreviewLoading ? (
                <Center h={300}>
                  <Loader size="sm" />
                </Center>
              ) : previewUrl ? (
                <Center h={300}>
                  <Image
                    src={previewUrl}
                    alt="Sticker preview"
                    fit="contain"
                    mah={280}
                    radius="sm"
                    style={{ background: "white", padding: 12 }}
                  />
                </Center>
              ) : (
                <OperationsEmptyState
                  icon={IconTag}
                  title="No preview"
                  description="Preview not available for this row."
                />
              )}
            </Paper>
          </SimpleGrid>
        ) : null}
      </Modal>
    </OperationsPage>
  );
});

export default Sticker;
