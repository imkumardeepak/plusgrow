import React, { memo, useEffect, useState } from "react";
import { Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { Edit2, Plus, Tag, Trash2 } from "lucide-react";
import { Button } from "../components/atoms/Button";
import { Input } from "../components/atoms/Input";
import { Modal, ConfirmDialog } from "../components/atoms/Modal";
import { DataTable, createTableColumns } from "../components/molecules/DataTable";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import {
  commoditiesApi,
  Commodity,
  CreateCommodityDto,
} from "../services/masterApi";

export const Commodities = memo(function Commodities() {
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState<Commodity | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Commodity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<CreateCommodityDto>({
    name: "",
  });

  useEffect(() => {
    loadCommodities();
  }, []);

  const loadCommodities = async () => {
    try {
      setIsLoading(true);
      const data = await commoditiesApi.getAll();
      setCommodities(data);
    } catch {
      toast.error("Failed to load commodities");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Commodity name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await commoditiesApi.update(isEditing.id, formData);
        toast.success("Commodity updated successfully");
      } else {
        await commoditiesApi.create(formData);
        toast.success("Commodity created successfully");
      }
      await loadCommodities();
      closeModal();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save commodity");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData({ name: "" });
    setIsEditing(null);
    setIsModalOpen(true);
  };

  const openEditModal = (commodity: Commodity) => {
    setFormData({ name: commodity.name });
    setIsEditing(commodity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(null);
    setFormData({ name: "" });
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await commoditiesApi.delete(deleteTarget.id);
      toast.success("Commodity deleted successfully");
      await loadCommodities();
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete commodity");
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = createTableColumns<Commodity>(
    [
      {
        accessorKey: "id",
        header: "ID",
        cell: (row) => (
          <Text size="11px" c="dimmed" ff="monospace">
            #{row.id}
          </Text>
        ),
      },
      {
        accessorKey: "name",
        header: "Commodity",
        cell: (row) => (
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon
              size={40}
              radius="lg"
              variant="light"
              color="cyan"
              style={{
                background: "rgba(30, 192, 243, 0.12)",
                border: "1px solid rgba(30, 192, 243, 0.18)",
              }}
            >
              <Tag size={18} />
            </ThemeIcon>
            <Text fw={700} size="sm">
              {row.name}
            </Text>
          </Group>
        ),
      },
    ],
    [
      {
        label: "Edit",
        icon: <Edit2 className="h-4 w-4" />,
        onClick: (row) => openEditModal(row),
      },
      {
        label: "Delete",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (row) => setDeleteTarget(row),
        variant: "destructive",
      },
    ],
  );

  return (
    <>
      <OperationsPage
        title="Commodities"
        description="Category management follows same SaaS form and table language as all master modules."
        icon={Tag}
        actions={
          <Button onClick={openCreateModal} leftIcon={<Plus size={16} />}>
            New Commodity
          </Button>
        }
        metrics={[
          { label: "Categories", value: commodities.length, tone: "brand" },
        ]}
      >
        <OperationsPanel
          title="Commodity Registry"
          description="Single search, single action menu, single visual system."
          icon={Tag}
        >
          <DataTable
            columns={columns}
            data={commodities}
            loading={isLoading}
            searchPlaceholder="Search commodities..."
            onSearch={setSearchTerm}
            searchValue={searchTerm}
          />
        </OperationsPanel>
      </OperationsPage>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={isEditing ? "Edit Commodity" : "New Commodity"}
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <Input
              label="Commodity Name"
              placeholder="Raw materials, packaging, finished goods..."
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              leftElement={<Tag size={16} />}
              required
            />
            <Group justify="flex-end" pt="sm">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" loading={isSubmitting}>
                {isEditing ? "Update Commodity" : "Create Commodity"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Commodity"
        message={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
});

export default Commodities;
