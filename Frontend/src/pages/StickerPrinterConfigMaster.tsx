import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconPrinter,
  IconPlus,
  IconEdit,
  IconTrash,
  IconAlertCircle,
  IconCheck,
} from "@tabler/icons-react";
import {
  Table,
  Button,
  Group,
  Text,
  Badge,
  Modal,
  TextInput,
  NumberInput,
  Select,
  Switch,
  Stack,
  Paper,
  Box,
  ActionIcon,
  Tooltip,
  Center,
  Loader,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useForm } from "@mantine/form";

import {
  OperationsPage,
  OperationsPanel,
  OperationsEmptyState,
} from "../components/organisms/Operations/OperationsShell";
import {
  StickerPrinterConfig,
  stickerPrinterConfigsApi,
} from "../services/stickerPrinterConfigsApi";

const STICKER_SIZES = [
  { value: "50x50", label: "50 x 50 MM" },
  { value: "60x60", label: "60 x 60 MM" },
  { value: "75x75", label: "75 x 75 MM" },
];

export default function StickerPrinterConfigMaster() {
  const [configs, setConfigs] = useState<StickerPrinterConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] =
    useState<StickerPrinterConfig | null>(null);

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
    } catch (error) {
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
    if (!result.hasErrors) {
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
  const activeConfigs = configs.filter((c) => c.isActive).length;

  const rows = useMemo(
    () =>
      configs.map((config) => (
        <Table.Tr key={config.id}>
          <Table.Td>
            <Badge variant="light" color="blue" size="sm">
              {config.stickerSize}
            </Badge>
          </Table.Td>
          <Table.Td>
            <Text size="sm" fw={600} fontFamily="monospace">
              {config.printerIp}
            </Text>
          </Table.Td>
          <Table.Td>
            <Text size="sm">{config.printerPort}</Text>
          </Table.Td>
          <Table.Td>
            <Badge
              variant="dot"
              color={config.isActive ? "green" : "gray"}
              size="sm"
            >
              {config.isActive ? "Active" : "Inactive"}
            </Badge>
          </Table.Td>
          <Table.Td>
            <Group gap="xs">
              <Tooltip label="Edit">
                <ActionIcon
                  variant="light"
                  color="blue"
                  size="sm"
                  onClick={() => handleOpenModal(config)}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete">
                <ActionIcon
                  variant="light"
                  color="red"
                  size="sm"
                  onClick={() => handleDelete(config)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Table.Td>
        </Table.Tr>
      )),
    [configs, handleOpenModal, handleDelete],
  );

  return (
    <OperationsPage
      title="Sticker Printer Config"
      description="Manage printer IP and port for each sticker size."
      icon={IconPrinter}
      metrics={[
        { label: "Total Configs", value: totalConfigs },
        { label: "Active", value: activeConfigs, tone: "success" },
      ]}
    >
      <OperationsPanel
        title="Printer Configurations"
        icon={IconPrinter}
        description="Three sticker sizes, three printers."
        action={
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => handleOpenModal()}
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            Add Config
          </Button>
        }
      >
        {isLoading ? (
          <Center h={200}>
            <Loader size="sm" />
          </Center>
        ) : configs.length === 0 ? (
          <OperationsEmptyState
            icon={IconPrinter}
            title="No printer configs"
            description="Add printer configuration for each sticker size."
          />
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Sticker Size</Table.Th>
                <Table.Th>Printer IP</Table.Th>
                <Table.Th>Port</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        )}
      </OperationsPanel>

      <Modal
        opened={isModalOpen}
        onClose={handleCloseModal}
        title={editingConfig ? "Edit Printer Config" : "Add Printer Config"}
        size="md"
        centered
      >
        <Stack gap="md">
          <Select
            label="Sticker Size"
            data={STICKER_SIZES}
            {...form.getInputProps("stickerSize")}
          />
          <TextInput
            label="Printer IP"
            placeholder="192.168.10.151"
            {...form.getInputProps("printerIp")}
          />
          <NumberInput
            label="Printer Port"
            placeholder="9100"
            min={1}
            max={65535}
            {...form.getInputProps("printerPort")}
          />
          <Switch
            label="Active"
            {...form.getInputProps("isActive", { type: "checkbox" })}
          />
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
