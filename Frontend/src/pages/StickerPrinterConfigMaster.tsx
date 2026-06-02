import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconPlus,
  IconPrinter,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  MantineDataTable,
  DataTableColumn,
} from "../components/molecules/MantineDataTable";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";

const STICKER_SIZES = [
  { value: "25x25", label: "25 x 25 MM" },
  { value: "38x38", label: "38 x 38 MM" },
  { value: "50x50", label: "50 x 50 MM" },
  { value: "60x60", label: "60 x 60 MM" },
  { value: "75x75", label: "75 x 75 MM" },
];

type ConfigStatusFilter = "all" | "active" | "inactive";

export default function StickerPrinterConfigMaster() {
  const [configs, setConfigs] = useState<StickerPrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<StickerPrinterConfig | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConfigStatusFilter>("all");

  const form = useForm({
    initialValues: {
      stickerSize: "50x50",
      printerIp: "",
      printerPort: 9100,
      isActive: true,
    },
    validate: {
      stickerSize: (value) => (!value ? "Sticker size required" : null),
      printerIp: (value) => (!value ? "Printer IP required" : null),
      printerPort: (value) =>
        !value || value < 1 || value > 65535 ? "Valid port required" : null,
    },
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await stickerPrinterConfigsApi.getAll();
      setConfigs(data);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to load printer configurations",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredConfigs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return configs.filter((config) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && config.isActive) ||
        (statusFilter === "inactive" && !config.isActive);

      const matchesSearch =
        !query ||
        config.stickerSize.toLowerCase().includes(query) ||
        config.printerIp.toLowerCase().includes(query) ||
        String(config.printerPort).includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [configs, search, statusFilter]);

  const columns: DataTableColumn<StickerPrinterConfig>[] = [
    {
      key: "stickerSize",
      header: "Sticker Size",
      render: (row) => (
        <Badge variant="light" color="blue" size="sm">
          {row.stickerSize}
        </Badge>
      ),
      width: 140,
    },
    {
      key: "printerIp",
      header: "Printer IP",
      render: (row) => (
        <Text size="xs" fw={700} ff="monospace">
          {row.printerIp}
        </Text>
      ),
    },
    {
      key: "printerPort",
      header: "Port",
      render: (row) => (
        <Text size="xs" fw={600}>
          {row.printerPort}
        </Text>
      ),
      width: 100,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <Badge
          variant={row.isActive ? "light" : "filled"}
          color={row.isActive ? "green" : "gray"}
          size="sm"
        >
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
      width: 120,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (row) => (
        <Group gap="xs" justify="flex-end" wrap="nowrap">
          <Tooltip label="Edit config">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="blue"
              onClick={() => handleOpenModal(row)}
            >
              <IconEdit size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete config">
            <ActionIcon
              size="sm"
              radius="md"
              variant="light"
              color="red"
              onClick={() => handleDelete(row)}
            >
              <IconTrash size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
      width: 120,
    },
  ];

  const handleOpenModal = useCallback(
    (config?: StickerPrinterConfig) => {
      if (config) {
        setEditingConfig(config);
        form.setValues({
          stickerSize: config.stickerSize,
          printerIp: config.printerIp,
          printerPort: config.printerPort,
          isActive: config.isActive,
        });
      } else {
        setEditingConfig(null);
        form.reset();
      }
      setIsModalOpen(true);
    },
    [form],
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingConfig(null);
    form.reset();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    const result = form.validate();
    if (result.hasErrors) {
      return;
    }

    try {
      if (editingConfig) {
        await stickerPrinterConfigsApi.update(editingConfig.id, {
          ...editingConfig,
          ...form.values,
        });
        notifications.show({
          title: "Success",
          message: "Printer config updated",
          color: "green",
          icon: <IconCheck size={18} />,
        });
      } else {
        await stickerPrinterConfigsApi.create(form.values);
        notifications.show({
          title: "Success",
          message: "Printer config created",
          color: "green",
          icon: <IconCheck size={18} />,
        });
      }

      handleCloseModal();
      await loadData();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to save printer config",
        color: "red",
        icon: <IconAlertCircle size={18} />,
      });
    }
  }, [editingConfig, form, handleCloseModal, loadData]);

  const handleDelete = useCallback(
    async (config: StickerPrinterConfig) => {
      try {
        await stickerPrinterConfigsApi.delete(config.id);
        notifications.show({
          title: "Success",
          message: "Printer config deleted",
          color: "green",
          icon: <IconCheck size={18} />,
        });
        await loadData();
      } catch (error: any) {
        notifications.show({
          title: "Error",
          message: error.message || "Failed to delete printer config",
          color: "red",
          icon: <IconAlertCircle size={18} />,
        });
      }
    },
    [loadData],
  );

  const totalConfigs = configs.length;
  const activeConfigs = configs.filter((config) => config.isActive).length;
  const inactiveConfigs = totalConfigs - activeConfigs;

  return (
    <OperationsPage
      title="Sticker Printer Config"
      description="Manage printer IP and port for each sticker size."
      icon={IconPrinter}
      hideHeader
    >
      <Stack gap="sm">
        <OperationsPanel
          title="Filters"
          icon={IconPrinter}
          description="Quick status and search controls for printer endpoints."
        >
          <Group gap="sm" align="flex-end" grow>
            <div>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <SegmentedControl
                fullWidth
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(value) =>
                  setStatusFilter(value as ConfigStatusFilter)
                }
                data={[
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
              />
            </div>

            <TextInput
              label="Search"
              size="xs"
              radius="md"
              placeholder="Search size, IP, port..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </Group>
        </OperationsPanel>

        <OperationsPanel
          title="Printer Configurations"
          icon={IconPrinter}
          description="Compact table for sticker size to printer routing."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {totalConfigs} total
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {activeConfigs} active
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="orange">
                {inactiveConfigs} inactive
              </Badge>
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() => void loadData()}
                loading={isLoading}
                aria-label="Refresh printer configs"
              >
                <IconRefresh size={14} />
              </ActionIcon>
              <Button
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => handleOpenModal()}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                Add Config
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          <MantineDataTable<StickerPrinterConfig>
            data={filteredConfigs}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyIcon={IconPrinter}
            emptyTitle="No printer configs"
            emptyDescription="Add printer configuration for each sticker size."
            itemLabel="configs"
            resetPageKey={`${search}-${statusFilter}`}
          />
        </OperationsPanel>
      </Stack>

      <Modal
        opened={isModalOpen}
        onClose={handleCloseModal}
        title={editingConfig ? "Edit Printer Config" : "Add Printer Config"}
        size="md"
        centered
      >
        <Stack gap="md">
          <Paper radius="md" p="sm" withBorder>
            <Text size="xs" fw={800} mb="xs">
              Printer Mapping
            </Text>
            <Stack gap="sm">
              <Select
                label="Sticker Size"
                data={STICKER_SIZES}
                size="sm"
                radius="md"
                {...form.getInputProps("stickerSize")}
              />
              <TextInput
                label="Printer IP"
                placeholder="192.168.10.151"
                size="sm"
                radius="md"
                {...form.getInputProps("printerIp")}
              />
              <NumberInput
                label="Printer Port"
                placeholder="9100"
                min={1}
                max={65535}
                size="sm"
                radius="md"
                {...form.getInputProps("printerPort")}
              />
              <Switch
                label="Active"
                {...form.getInputProps("isActive", { type: "checkbox" })}
              />
            </Stack>
          </Paper>

          <Group justify="flex-end">
            <Button variant="default" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
            >
              {editingConfig ? "Update" : "Create"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}
