import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconCheck,
  IconEdit,
  IconFolder,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  ThemeIcon,
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
  ExportPathConfig,
  CreateExportPathConfigDto,
  ExportType,
  EXPORT_TYPE_OPTIONS,
  exportPathConfigsApi,
} from "../services/masterApi";

type StatusFilter = "all" | "enabled" | "disabled";

const EXPORT_TYPE_LABEL: Record<ExportType, string> = {
  WmsStock: "WMS Stock",
  SelfProducts: "Self Products",
  TallyStock: "Tally Stock",
};

const EXPORT_TYPE_COLOR: Record<ExportType, string> = {
  WmsStock: "blue",
  SelfProducts: "teal",
  TallyStock: "indigo",
};

export default function ExportPathConfigMaster() {
  const [configs, setConfigs] = useState<ExportPathConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ExportPathConfig | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<ExportPathConfig | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateExportPathConfigDto>({
    initialValues: {
      exportType: "WmsStock",
      folderPath: "",
      fileName: "",
      isEnabled: true,
    },
    validate: {
      exportType: (value) => (!value ? "Export type is required" : null),
      folderPath: (value) =>
        !value?.trim() ? "Folder path is required" : null,
    },
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await exportPathConfigsApi.getAll();
      setConfigs(data);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to load export path configs",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingConfig(null);
    form.reset();
    setIsModalOpen(true);
  };

  const openEdit = (config: ExportPathConfig) => {
    setEditingConfig(config);
    form.setValues({
      exportType: config.exportType,
      folderPath: config.folderPath,
      fileName: config.fileName ?? "",
      isEnabled: config.isEnabled,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: CreateExportPathConfigDto) => {
    setIsSubmitting(true);
    try {
      const dto: CreateExportPathConfigDto = {
        ...values,
        fileName: values.fileName?.trim() || null,
      };

      if (editingConfig) {
        await exportPathConfigsApi.update(editingConfig.id, dto);
        notifications.show({
          title: "Updated",
          message: "Export path config updated successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      } else {
        await exportPathConfigsApi.create(dto);
        notifications.show({
          title: "Created",
          message: "Export path config created successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to save export path config";
      notifications.show({
        title: "Error",
        message,
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await exportPathConfigsApi.delete(deleteTarget.id);
      notifications.show({
        title: "Deleted",
        message: "Export path config deleted",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setDeleteTarget(null);
      await loadData();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to delete config",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredConfigs = useMemo(() => {
    let result = configs;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.folderPath.toLowerCase().includes(q) ||
          (c.fileName ?? "").toLowerCase().includes(q) ||
          EXPORT_TYPE_LABEL[c.exportType].toLowerCase().includes(q)
      );
    }

    if (statusFilter === "enabled") result = result.filter((c) => c.isEnabled);
    if (statusFilter === "disabled")
      result = result.filter((c) => !c.isEnabled);

    return result;
  }, [configs, search, statusFilter]);

  const columns: DataTableColumn<ExportPathConfig>[] = [
    {
      key: "exportType",
      header: "Export Type",
      render: (row) => (
        <Badge color={EXPORT_TYPE_COLOR[row.exportType]} variant="light">
          {EXPORT_TYPE_LABEL[row.exportType]}
        </Badge>
      ),
    },
    {
      key: "folderPath",
      header: "Folder Path",
      render: (row) => (
        <Group gap="xs" wrap="nowrap">
          <ThemeIcon size="xs" variant="transparent" color="dimmed">
            <IconFolder size={14} />
          </ThemeIcon>
          <Text size="sm" style={{ wordBreak: "break-all" }}>
            {row.folderPath}
          </Text>
        </Group>
      ),
    },
    {
      key: "fileName",
      header: "File Name",
      render: (row) => (
        <Text size="sm" c={row.fileName ? undefined : "dimmed"}>
          {row.fileName || "(auto)"}
        </Text>
      ),
    },
    {
      key: "isEnabled",
      header: "Status",
      render: (row) => (
        <Badge color={row.isEnabled ? "green" : "gray"} variant="dot">
          {row.isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <Group gap="xs">
          <Tooltip label="Edit">
            <ActionIcon
              variant="light"
              color="blue"
              size="sm"
              onClick={() => openEdit(row)}
              id={`edit-config-${row.id}`}
            >
              <IconEdit size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete">
            <ActionIcon
              variant="light"
              color="red"
              size="sm"
              onClick={() => setDeleteTarget(row)}
              id={`delete-config-${row.id}`}
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ),
    },
  ];

  return (
    <OperationsPage
      title="Export Path Config"
      description="Manage export destinations for scheduled stock reports."
      icon={IconUpload}
      hideHeader
    >
      <Stack gap="sm">
        {/* ── Filters Panel ── */}
        <OperationsPanel
          title="Filters"
          icon={IconSearch}
          description="Search and filter export path configurations."
        >
          <Group gap="sm" align="flex-end" wrap="wrap">
            <TextInput
              id="export-config-search"
              label="Search"
              size="xs"
              radius="md"
              placeholder="Type, path or file name…"
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              w={260}
            />
            <div>
              <Text size="10px" fw={800} c="dimmed" mb={5}>
                STATUS
              </Text>
              <SegmentedControl
                id="export-config-status-filter"
                size="xs"
                radius="md"
                value={statusFilter}
                onChange={(v) => setStatusFilter(v as StatusFilter)}
                data={[
                  { label: "All", value: "all" },
                  { label: "Enabled", value: "enabled" },
                  { label: "Disabled", value: "disabled" },
                ]}
              />
            </div>
          </Group>
        </OperationsPanel>

        {/* ── Configs Table Panel ── */}
        <OperationsPanel
          title="Export Configurations"
          icon={IconUpload}
          description="Each config controls one export job type."
          action={
            <Group gap="xs" wrap="nowrap">
              <Badge size="sm" radius="md" variant="light" color="gray">
                {configs.length} total
              </Badge>
              <Badge size="sm" radius="md" variant="light" color="green">
                {configs.filter((c) => c.isEnabled).length} enabled
              </Badge>
              <ActionIcon
                size="sm"
                radius="md"
                variant="light"
                color="gray"
                onClick={() => void loadData()}
                loading={isLoading}
                aria-label="Refresh configs"
                id="export-config-refresh"
              >
                <IconRefresh size={14} />
              </ActionIcon>
              <Button
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={openCreate}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
                id="export-config-add"
              >
                Add Config
              </Button>
            </Group>
          }
          contentClassName="p-0"
        >
          <MantineDataTable<ExportPathConfig>
            data={filteredConfigs}
            columns={columns}
            rowKey={(row) => row.id}
            isLoading={isLoading}
            emptyIcon={IconUpload}
            emptyTitle="No export configs"
            emptyDescription="Add a config to control where stock reports are exported."
            itemLabel="configs"
            resetPageKey={`${search}-${statusFilter}`}
          />
        </OperationsPanel>
      </Stack>

      {/* ── Create / Edit Modal ── */}
      <Modal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          <Text fw={600}>
            {editingConfig ? "Edit Export Config" : "New Export Config"}
          </Text>
        }
        centered
        size="md"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* Export Type dropdown — fixed 3 options */}
            <Select
              id="form-export-type"
              label="Export Type"
              description="What kind of stock this config exports"
              required
              data={EXPORT_TYPE_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              size="sm"
              radius="md"
              {...form.getInputProps("exportType")}
            />

            {/* Folder Path */}
            <TextInput
              id="form-folder-path"
              label="Folder Path"
              description="Full path to the destination folder"
              placeholder="C:\Users\PlusGrow\Dropbox\Stocks - Self"
              required
              size="sm"
              radius="md"
              leftSection={<IconFolder size={14} />}
              {...form.getInputProps("folderPath")}
            />

            {/* File Name (optional) */}
            <TextInput
              id="form-file-name"
              label="File Name"
              description="Optional — leave empty to use the default name for the selected type"
              placeholder="e.g. Stock.xlsx"
              size="sm"
              radius="md"
              {...form.getInputProps("fileName")}
            />

            {/* Is Enabled */}
            <Switch
              id="form-is-enabled"
              label="Enabled"
              description="Disabled configs are skipped during the scheduled job"
              size="sm"
              checked={form.values.isEnabled}
              onChange={(e) =>
                form.setFieldValue("isEnabled", e.currentTarget.checked)
              }
            />

            <Group justify="flex-end" mt="xs">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                id="form-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={isSubmitting}
                id="form-save"
                leftSection={<IconCheck size={16} />}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
              >
                {editingConfig ? "Save Changes" : "Create"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={<Text fw={600}>Delete Export Config</Text>}
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to delete the{" "}
            <b>
              {deleteTarget ? EXPORT_TYPE_LABEL[deleteTarget.exportType] : ""}
            </b>{" "}
            config?
          </Text>
          <Paper p="xs" withBorder radius="sm">
            <Text size="sm" c="dimmed" style={{ wordBreak: "break-all" }}>
              {deleteTarget?.folderPath}
            </Text>
          </Paper>
          <Group justify="flex-end">
            <Button
              variant="default"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              id="delete-cancel"
            >
              Cancel
            </Button>
            <Button
              color="red"
              size="sm"
              loading={isDeleting}
              onClick={handleDelete}
              id="delete-confirm"
              leftSection={<IconTrash size={16} />}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </OperationsPage>
  );
}
