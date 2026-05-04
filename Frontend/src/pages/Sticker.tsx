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
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Printer } from "lucide-react";

import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import {
  Importer,
  Manufacturer,
  PaginationInfo,
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
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [templates, setTemplates] = useState<StickerTemplate[]>([]);
  const [printerConfigs, setPrinterConfigs] = useState<StickerPrinterConfig[]>(
    [],
  );
  const [stickerSize, setStickerSize] = useState("50x50");
  const [stickerType, setStickerType] = useState<StickerMode>("Combined");
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [importerId, setImporterId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StickerStatusFilter>("all");
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [selectedRow, setSelectedRow] = useState<PoInvoice | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRowsLoading, setIsRowsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reprintFrom, setReprintFrom] = useState<number | "">(1);
  const [reprintTo, setReprintTo] = useState<number | "">(1);
  const [stickerNote, setStickerNote] = useState("");
  const [manufacturerSearch, setManufacturerSearch] = useState("");
  const [importerSearch, setImporterSearch] = useState("");

  const loadMetaData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [
        manufacturerData,
        importerData,
        templateData,
        configData,
      ] = await Promise.all([
        manufacturersApi.getPaged({ page: 1, pageSize: 25 }),
        importersApi.getPaged({ page: 1, pageSize: 25 }),
        stickersApi.getTemplates(),
        stickerPrinterConfigsApi.getAll(),
      ]);

      setManufacturers(manufacturerData.data);
      setImporters(importerData.data);
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

  const loadManufacturerLookup = useCallback(async (query: string) => {
    const result = await manufacturersApi.getPaged({
      search: query,
      page: 1,
      pageSize: 25,
      sortBy: "name",
      sortDirection: "asc",
    });
    setManufacturers(result.data);
  }, []);

  const loadImporterLookup = useCallback(async (query: string) => {
    const result = await importersApi.getPaged({
      search: query,
      page: 1,
      pageSize: 25,
      sortBy: "name",
      sortDirection: "asc",
    });
    setImporters(result.data);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadManufacturerLookup(manufacturerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadManufacturerLookup, manufacturerSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadImporterLookup(importerSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [importerSearch, loadImporterLookup]);

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
    setStickerNote("");
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

  useEffect(() => {
    let isMounted = true;

    const loadSelectedProduct = async () => {
      if (!selectedRow) {
        setSelectedProduct(null);
        return;
      }

      const product = await productsApi.getById(selectedRow.productId);
      if (isMounted) setSelectedProduct(product);
    };

    void loadSelectedProduct();

    return () => {
      isMounted = false;
    };
  }, [selectedRow]);

  const filteredRows = poInvoices;

  const columns: DataTableColumn<PoInvoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice No",
      sortable: true,
      sortAccessor: (row) => row.invoiceNumber,
      render: (row) => (
        <Text size="11px" ff="monospace" c="cyan.2" fw={700} lineClamp={1}>
          {row.invoiceNumber}
        </Text>
      ),
      width: 140,
    },
    {
      key: "invoiceDate",
      header: "Invoice Date",
      sortable: true,
      sortAccessor: (row) => row.invoiceDate,
      render: (row) => (
        <Text size="xs" fw={500} lineClamp={1}>
          {format(new Date(row.invoiceDate), "dd MMM yyyy")}
        </Text>
      ),
      width: 120,
    },
    {
      key: "partyName",
      header: "Party Name",
      sortable: true,
      sortAccessor: (row) => row.partyName,
      render: (row) => (
        <Text size="xs" lineClamp={1} maw={150}>
          {row.partyName || "N/A"}
        </Text>
      ),
      width: 150,
    },
    {
      key: "productName",
      header: "Product",
      sortable: true,
      sortAccessor: (row) => row.productName,
      render: (row) => (
        <Text size="xs" fw={600} lineClamp={1} maw={180}>
          {row.productName}
        </Text>
      ),
      width: 180,
    },
    {
      key: "billedQty",
      header: "Billed Qty",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.billedQty,
      render: (row) => (
        <Text size="xs" fw={800} c="cyan.3">
          {row.billedQty}
        </Text>
      ),
      width: 100,
    },
    {
      key: "remainingAllocation",
      header: "Remaining",
      align: "right",
      sortable: true,
      sortAccessor: (row) => row.remainingAllocation,
      render: (row) => (
        <Text
          size="xs"
          fw={800}
          c={row.remainingAllocation > 0 ? "orange.3" : "green.3"}
        >
          {row.remainingAllocation}
        </Text>
      ),
      width: 100,
    },
    {
      key: "printed",
      header: "Sticker Status",
      sortable: true,
      sortAccessor: (row) => (row.printed ? "1" : "0"),
      render: (row) => (
        <Badge
          size="sm"
          radius="md"
          variant="light"
          color={row.printed ? "green" : "orange"}
        >
          {row.printed ? "Printed" : "Pending"}
        </Badge>
      ),
      width: 120,
    },
    {
      key: "actions",
      header: "Action",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
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
        </Group>
      ),
      width: 90,
    },
  ];

  const loadInvoiceRows = useCallback(async (filters: PoInvoiceFilters) => {
    try {
      setIsRowsLoading(true);
      const result = await poInvoicesApi.getPaged(filters);
      setPoInvoices(result.data);
      setPagination(result.pagination);
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
      page,
      pageSize: 25,
    });
  }, [fromDate, loadInvoiceRows, page, search, statusFilter, toDate]);

  useEffect(() => {
    setPage(1);
  }, [fromDate, search, statusFilter, toDate]);

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
      note: stickerNote.trim(),
      quantity,
    }),
    [importerId, manufacturerId, stickerNote, stickerSize, stickerType],
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
    const quantity =
      mode === "normal" ? selectedRow.billedQty : reprintQuantity;

    setIsPrinting(true);
    try {
      await stickersApi.print({
        printerIp: printerAddress,
        items: [
          {
            config: {
              ...buildPayload(selectedRow, quantity),
              note: stickerNote.trim(),
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
          page,
          pageSize: 25,
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
          <MantineDataTable<PoInvoice>
            data={filteredRows}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading || isRowsLoading}
            pageSize={pagination?.pageSize ?? 25}
            currentPage={pagination?.page ?? page}
            totalItems={pagination?.total}
            onPageChange={setPage}
            emptyIcon={IconPrinter}
            emptyTitle="No PO invoice rows"
            emptyDescription="No sticker rows match current search."
            itemLabel="invoices"
            resetPageKey={`${search}-${statusFilter}-${fromDate}-${toDate}`}
          />
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
                    searchValue={manufacturerSearch}
                    onSearchChange={setManufacturerSearch}
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
                      searchValue={importerSearch}
                      onSearchChange={setImporterSearch}
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
                <TextInput
                  label="Note"
                  size="xs"
                  radius="md"
                  mt="sm"
                  placeholder="Optional note for sticker"
                  value={stickerNote}
                  onChange={(event) => setStickerNote(event.currentTarget.value)}
                />
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

            </Stack>

            <Stack gap="sm">
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
                  <Paper
                    withBorder
                    radius="md"
                    p="xl"
                    style={{ textAlign: "center" }}
                  >
                    <IconTag size={48} style={{ marginBottom: 12 }} />
                    <Text fw={700} size="lg" mb="xs">
                      No preview
                    </Text>
                    <Text size="sm" c="dimmed">
                      Preview not available for this row.
                    </Text>
                  </Paper>
                )}
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
          </SimpleGrid>
        ) : null}
      </Modal>
    </OperationsPage>
  );
});

export default Sticker;
