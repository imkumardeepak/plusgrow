import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ActionIcon,
  Badge,
  Center,
  Group,
  MultiSelect,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  ScanBarcode,
  Search,
  Trash2,
  Upload,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import { toast } from "../lib/toast";
import {
  locationsApi,
  binsApi,
  Location,
  Bin,
  CreateLocationDto,
} from "../services/masterApi";

export const Locations = memo(function Locations() {
  const [searchParams] = useSearchParams();
  const [locations, setLocations] = useState<Location[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Location | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isBinMapModalOpen, setIsBinMapModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [binMapLocation, setBinMapLocation] = useState<Location | null>(null);
  const [scannedLocationCode, setScannedLocationCode] = useState("");
  const [scannedBins, setScannedBins] = useState<string[]>([]);
  const [currentBinInput, setCurrentBinInput] = useState("");
  const [isMappingBins, setIsMappingBins] = useState(false);
  const [alreadyMappedBins, setAlreadyMappedBins] = useState<
    Array<{ binCode: string; locationCode: string }>
  >([]);
  const [formData, setFormData] = useState<CreateLocationDto>({
    aisle: "",
    rack: "",
    shelf: "",
    locationCode: "",
    bins: [],
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [locationsData, binsData] = await Promise.all([
        locationsApi.getAll(),
        binsApi.getAll(),
      ]);
      setLocations(locationsData);
      setBins(binsData);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (isEditing) {
      return;
    }

    if (formData.aisle || formData.rack || formData.shelf) {
      setFormData((prev) => ({
        ...prev,
        locationCode: [prev.aisle, prev.rack, prev.shelf]
          .filter(Boolean)
          .join("-"),
      }));
    }
  }, [formData.aisle, formData.rack, formData.shelf, isEditing]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.locationCode.trim()) {
      toast.error("Location code is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await locationsApi.update(isEditing.id, formData);
        toast.success("Location updated successfully");
      } else {
        await locationsApi.create(formData);
        toast.success("Location created successfully");
      }
      await loadData();
      closeModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to save location");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      aisle: "",
      rack: "",
      shelf: "",
      locationCode: "",
      bins: [],
    });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (location: Location) => {
    setFormData({
      aisle: location.aisle,
      rack: location.rack,
      shelf: location.shelf,
      locationCode: location.locationCode,
      bins: location.bins || [],
      id: location.id,
    });
    setIsEditing(location);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({
      aisle: "",
      rack: "",
      shelf: "",
      locationCode: "",
      bins: [],
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await locationsApi.delete(deleteTarget.id);
      toast.success("Location deleted successfully");
      await loadData();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete location");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadTemplate = () => {
    locationsApi.downloadTemplate();
    toast.success("Template downloaded successfully");
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload a valid Excel file");
      return;
    }

    setUploadFile(file);
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      return;
    }

    setIsUploading(true);
    try {
      const result = await locationsApi.uploadExcel(uploadFile);
      if (result.success) {
        toast.success(
          `Successfully imported ${result.importedCount} locations`,
        );
        await loadData();
        setIsUploadModalOpen(false);
        setUploadFile(null);
      } else {
        toast.error("Import failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Error uploading file");
    } finally {
      setIsUploading(false);
    }
  };

  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setUploadFile(null);
  };

  const openBinMapModal = (location: Location) => {
    setBinMapLocation(location);
    setScannedLocationCode(location.locationCode);
    setScannedBins(location.bins || []);
    setCurrentBinInput("");
    setAlreadyMappedBins([]);
    setIsBinMapModalOpen(true);
  };

  const closeBinMapModal = () => {
    setIsBinMapModalOpen(false);
    setBinMapLocation(null);
    setScannedLocationCode("");
    setScannedBins([]);
    setCurrentBinInput("");
    setAlreadyMappedBins([]);
  };

  const handleBinScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && currentBinInput.trim()) {
      event.preventDefault();
      const binCode = currentBinInput.trim().toUpperCase();

      // Check if bin already scanned in current session
      if (scannedBins.includes(binCode)) {
        toast.error(`Bin "${binCode}" already scanned`);
        setCurrentBinInput("");
        return;
      }

      // Check if bin already mapped to current location
      if (binMapLocation?.bins?.some((b) => b.toUpperCase() === binCode)) {
        toast.error(`Bin "${binCode}" already mapped to this location`);
        setCurrentBinInput("");
        return;
      }

      // Check if bin exists in master
      const binExists = bins.some((b) => b.binCode.toUpperCase() === binCode);
      if (!binExists) {
        toast.error(
          `Bin "${binCode}" not found in Bin Master. Please add it first.`,
        );
        setCurrentBinInput("");
        return;
      }

      // Check if bin is already assigned to another location
      const assignedLocation = locations.find(
        (loc) =>
          loc.id !== binMapLocation?.id &&
          loc.bins?.some((b) => b.toUpperCase() === binCode),
      );

      if (assignedLocation) {
        // Add to already mapped bins list instead of blocking
        setAlreadyMappedBins((prev) => {
          // Avoid duplicates
          if (prev.some((item) => item.binCode === binCode)) {
            return prev;
          }
          return [
            ...prev,
            { binCode, locationCode: assignedLocation.locationCode },
          ];
        });
        toast.warning(
          `Bin "${binCode}" is already mapped to "${assignedLocation.locationCode}". It will be unmapped from there.`,
        );
      }

      // Add to scanned bins (will unmap from other location on save)
      setScannedBins((prev) => [...prev, binCode]);
      setCurrentBinInput("");
      toast.success(`Bin "${binCode}" added`);
    }
  };

  const removeScannedBin = (binCode: string) => {
    setScannedBins((prev) => prev.filter((b) => b !== binCode));
    // Also remove from already mapped bins if present
    setAlreadyMappedBins((prev) =>
      prev.filter((item) => item.binCode !== binCode),
    );
  };

  const handleMapBins = async () => {
    if (!binMapLocation) {
      return;
    }

    setIsMappingBins(true);
    try {
      await locationsApi.mapBins(binMapLocation.id, scannedBins);
      toast.success(
        `Successfully mapped ${scannedBins.length} bins to ${binMapLocation.locationCode}`,
      );
      await loadData();
      closeBinMapModal();
    } catch (error: any) {
      toast.error(error.message || "Failed to map bins");
    } finally {
      setIsMappingBins(false);
    }
  };

  const filteredLocations = useMemo(() => {
    if (!search.trim()) return locations;
    const searchLower = search.toLowerCase();
    return locations.filter(
      (loc) =>
        loc.locationCode.toLowerCase().includes(searchLower) ||
        loc.aisle.toLowerCase().includes(searchLower) ||
        loc.rack.toLowerCase().includes(searchLower) ||
        loc.shelf.toLowerCase().includes(searchLower) ||
        (loc.bins &&
          loc.bins.some((b) => b.toLowerCase().includes(searchLower))),
    );
  }, [locations, search]);

  const columns: DataTableColumn<Location>[] = [
    {
      key: "locationCode",
      header: "Location",
      sortable: true,
      sortAccessor: (row) => row.locationCode,
      render: (row) => (
        <Group gap="sm" wrap="nowrap">
          <ThemeIcon
            size={36}
            radius="lg"
            variant="light"
            color="cyan"
            style={{
              background: "rgba(30, 192, 243, 0.12)",
              border: "1px solid rgba(30, 192, 243, 0.18)",
            }}
          >
            <MapPin size={16} />
          </ThemeIcon>
          <Text fw={700} size="sm" ff="monospace">
            {row.locationCode}
          </Text>
        </Group>
      ),
    },
    {
      key: "aisle",
      header: "Aisle",
      sortable: true,
      sortAccessor: (row) => row.aisle,
      render: (row) => <Text size="xs">{row.aisle}</Text>,
      width: 80,
    },
    {
      key: "rack",
      header: "Rack",
      sortable: true,
      sortAccessor: (row) => row.rack,
      render: (row) => <Text size="xs">{row.rack}</Text>,
      width: 80,
    },
    {
      key: "shelf",
      header: "Shelf",
      sortable: true,
      sortAccessor: (row) => row.shelf,
      render: (row) => <Text size="xs">{row.shelf}</Text>,
      width: 80,
    },
    {
      key: "bins",
      header: "Bins",
      render: (row) => (
        <Text size="xs" lineClamp={2} maw={240}>
          {row.bins && row.bins.length > 0
            ? row.bins.join(", ")
            : "No bins assigned"}
        </Text>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortAccessor: (row) => row.createdAt,
      render: (row) => (
        <Badge variant="light" color="gray" size="xs" radius="sm">
          {row.createdAt ? format(new Date(row.createdAt), "dd-MMM-yy") : "N/A"}
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
          <Tooltip label="Map bins">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="cyan"
              onClick={() => openBinMapModal(row)}
            >
              <ScanBarcode size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Edit location">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => openEditModal(row)}
            >
              <Edit2 size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete location">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 160,
    },
  ];

  const locationStats = useMemo(() => {
    const totalBins = locations.reduce(
      (acc, item) => acc + (item.bins?.length ?? 0),
      0,
    );
    return { totalBins };
  }, [locations]);

  const binOptions = bins.map((bin) => ({
    value: bin.binCode,
    label: bin.binCode,
  }));

  return (
    <>
      <OperationsPage
        title="Location Master"
        description="Warehouse slot management now follows same SaaS page shell, actions, table, and form rhythm."
        icon={MapPin}
        hideHeader
      >
        <Stack gap="sm">
          <OperationsPanel
            title="Location Directory"
            description="Import, edit, and assign bins inside one common enterprise shell."
            icon={MapPin}
            action={
              <Group gap="xs" wrap="nowrap">
                <Badge size="sm" radius="md" variant="light" color="gray">
                  {locations.length} locations
                </Badge>
                <Badge size="sm" radius="md" variant="light" color="cyan">
                  {locationStats.totalBins} bins assigned
                </Badge>
                <Input
                  size="xs"
                  radius="md"
                  w={240}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search locations, bins..."
                  leftElement={<Search size={14} />}
                />
                <ActionIcon
                  size="sm"
                  radius="md"
                  variant="light"
                  color="gray"
                  onClick={() => void loadData()}
                  loading={isLoading}
                  aria-label="Refresh location data"
                >
                  <RefreshCw size={14} />
                </ActionIcon>
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<Upload size={14} />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Import Excel
                </Button>
                <Button
                  size="sm"
                  onClick={openCreateModal}
                  leftIcon={<Plus size={14} />}
                >
                  New Location
                </Button>
              </Group>
            }
            contentClassName="p-0"
          >
            <MantineDataTable<Location>
              data={filteredLocations}
              columns={columns}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              emptyIcon={MapPin}
              emptyTitle="No locations found"
              emptyDescription="No location records match current search."
              itemLabel="locations"
              resetPageKey={search}
            />
          </OperationsPanel>
        </Stack>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Location" : "New Location"}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Group grow align="flex-start">
              <Input
                label="Aisle"
                placeholder="101"
                value={formData.aisle}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    aisle: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Rack"
                placeholder="A"
                value={formData.rack}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, rack: event.target.value }))
                }
                required
              />
              <Input
                label="Shelf"
                placeholder="3"
                value={formData.shelf}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    shelf: event.target.value,
                  }))
                }
                required
              />
            </Group>
            <Input
              label="Location Code"
              placeholder="Auto-generated or custom code"
              value={formData.locationCode}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  locationCode: event.target.value,
                }))
              }
              leftElement={<MapPin size={16} />}
              required
            />
            <MultiSelect
              label="Assign Bins"
              placeholder="Select bins"
              data={binOptions}
              value={formData.bins || []}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, bins: value }))
              }
              searchable
              clearable
              maxDropdownHeight={240}
              styles={{
                input: {
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderColor: "rgba(255,255,255,0.12)",
                },
                dropdown: {
                  background:
                    "linear-gradient(180deg, rgba(16,25,41,0.98) 0%, rgba(8,14,26,0.98) 100%)",
                  borderColor: "rgba(148, 163, 184, 0.16)",
                },
              }}
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Location" : "Create Location"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
        title="Import Locations from Excel"
        size="lg"
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon
                size={42}
                radius="lg"
                variant="light"
                color="cyan"
                style={{
                  background: "rgba(30, 192, 243, 0.12)",
                  border: "1px solid rgba(30, 192, 243, 0.18)",
                }}
              >
                <FileSpreadsheet size={20} />
              </ThemeIcon>
              <Stack gap={2}>
                <Text fw={700}>Location Import Template</Text>
                <Text size="sm" c="dimmed">
                  Download template first. Each row should contain one location
                  code in Aisle-Rack-Shelf format (e.g., 101-A-1).
                </Text>
              </Stack>
            </Group>
            <Button
              variant="outline"
              leftIcon={<Download size={16} />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </Group>

          <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} />

          {uploadFile ? (
            <Group gap="sm" wrap="nowrap">
              <CheckCircle2 size={18} color="var(--mantine-color-green-4)" />
              <Stack gap={2}>
                <Text fw={600}>{uploadFile.name}</Text>
                <Text size="sm" c="dimmed">
                  {(uploadFile.size / 1024).toFixed(1)} KB ready
                </Text>
              </Stack>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Select Excel file to import location master data.
            </Text>
          )}

          <Group justify="flex-end">
            <Button variant="outline" onClick={closeUploadModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!uploadFile}
              loading={isUploading}
              leftIcon={
                isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )
              }
            >
              Import Locations
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Location"
        message={`Delete "${deleteTarget?.locationCode}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />

      <Modal
        isOpen={isBinMapModalOpen}
        onClose={closeBinMapModal}
        title="Map Bins to Location"
        size="xl"
      >
        <Stack gap="lg">
          {/* Location Info */}
          <Paper
            p="md"
            withBorder
            style={{ background: "rgba(30, 192, 243, 0.05)" }}
          >
            <Group justify="space-between">
              <Group gap="sm">
                <ThemeIcon
                  size={42}
                  radius="lg"
                  variant="light"
                  color="cyan"
                  style={{
                    background: "rgba(30, 192, 243, 0.12)",
                    border: "1px solid rgba(30, 192, 243, 0.18)",
                  }}
                >
                  <MapPin size={20} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text fw={700} size="lg">
                    {binMapLocation?.locationCode}
                  </Text>
                  <Text size="sm" c="dimmed">
                    Aisle: {binMapLocation?.aisle} | Rack:{" "}
                    {binMapLocation?.rack} | Shelf: {binMapLocation?.shelf}
                  </Text>
                </Stack>
              </Group>
              <Badge size="lg" variant="light" color="cyan">
                {scannedBins.length} Bins
              </Badge>
            </Group>
          </Paper>

          {/* Bin Scanner Input */}
          <Stack gap="sm">
            <Group gap="sm">
              <Text fw={700} size="sm">
                Scan Bin Code
              </Text>
              <ArrowRight size={16} color="var(--mantine-color-cyan-4)" />
              <Text size="xs" c="dimmed">
                Press Enter after each scan
              </Text>
            </Group>
            <TextInput
              placeholder="Scan or type bin code (e.g., A-101-B)"
              value={currentBinInput}
              onChange={(e) => setCurrentBinInput(e.target.value)}
              onKeyDown={handleBinScan}
              leftSection={<ScanBarcode size={18} />}
              size="md"
              autoFocus
            />
          </Stack>

          {/* Already Mapped Bins Warning */}
          {alreadyMappedBins.length > 0 && (
            <Paper
              p="md"
              withBorder
              style={{
                background: "rgba(255, 165, 0, 0.05)",
                borderColor: "rgba(255, 165, 0, 0.3)",
              }}
            >
              <Stack gap="xs">
                <Group gap="sm">
                  <Text fw={700} size="sm" c="orange.4">
                    ⚠️ Bins to be unmapped from other locations:
                  </Text>
                </Group>
                <ScrollArea.Autosize mah={120}>
                  <Stack gap="xs">
                    {alreadyMappedBins.map((item) => (
                      <Group key={item.binCode} gap="sm" wrap="nowrap">
                        <Text
                          size="xs"
                          fw={600}
                          fontFamily="monospace"
                          c="orange.3"
                        >
                          {item.binCode}
                        </Text>
                        <Text size="xs" c="dimmed">
                          → Currently mapped to
                        </Text>
                        <Badge size="sm" variant="light" color="orange">
                          {item.locationCode}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          (will be unmapped)
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </Stack>
            </Paper>
          )}

          {/* Scanned Bins List */}
          <Stack gap="sm">
            <Group justify="space-between">
              <Text fw={700} size="sm">
                Scanned Bins ({scannedBins.length})
              </Text>
              {scannedBins.length > 0 && (
                <Text
                  size="xs"
                  c="red"
                  style={{ cursor: "pointer" }}
                  onClick={() => setScannedBins([])}
                >
                  Clear All
                </Text>
              )}
            </Group>

            {scannedBins.length === 0 ? (
              <Paper
                p="xl"
                withBorder
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  borderStyle: "dashed",
                }}
              >
                <Center>
                  <Stack gap="xs" align="center">
                    <ScanBarcode
                      size={32}
                      color="var(--mantine-color-dimmed)"
                    />
                    <Text size="sm" c="dimmed" ta="center">
                      No bins scanned yet.
                      <br />
                      Use scanner or type bin code above.
                    </Text>
                  </Stack>
                </Center>
              </Paper>
            ) : (
              <ScrollArea.Autosize mah={300}>
                <Stack gap="xs">
                  {scannedBins.map((bin) => (
                    <Paper
                      key={bin}
                      p="xs"
                      withBorder
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        borderColor: "rgba(30, 192, 243, 0.2)",
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <CheckCircle2
                            size={16}
                            color="var(--mantine-color-green-4)"
                          />
                          <Text fw={600} size="sm" fontFamily="monospace">
                            {bin}
                          </Text>
                        </Group>
                        <X
                          size={18}
                          color="var(--mantine-color-red-4)"
                          style={{ cursor: "pointer" }}
                          onClick={() => removeScannedBin(bin)}
                        />
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Stack>

          {/* Action Buttons */}
          <Group justify="flex-end" pt="sm">
            <Button variant="outline" onClick={closeBinMapModal}>
              Cancel
            </Button>
            <Button
              onClick={handleMapBins}
              loading={isMappingBins}
              disabled={scannedBins.length === 0}
              leftIcon={<CheckCircle2 size={16} />}
              variant={alreadyMappedBins.length > 0 ? "gradient" : "filled"}
              gradient={
                alreadyMappedBins.length > 0
                  ? { from: "orange", to: "yellow" }
                  : undefined
              }
            >
              {alreadyMappedBins.length > 0
                ? `Unmap & Map ${scannedBins.length} ${scannedBins.length === 1 ? "Bin" : "Bins"}`
                : `Save ${scannedBins.length} ${scannedBins.length === 1 ? "Bin" : "Bins"}`}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
});

export default Locations;
