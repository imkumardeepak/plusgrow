import React, { useEffect, useState, useMemo } from "react";
import { ActionIcon, Group, Paper, Select, Stack, Text, Tooltip } from "@mantine/core";
import { Globe, IndianRupee, Package, Printer, Tag, Trash2 } from "lucide-react";
import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";
import { Modal } from "../atoms/Modal";
import {
  productsApi,
  manufacturersApi,
  commoditiesApi,
  Product,
  Manufacturer,
  Commodity,
  CreateProductDto,
} from "../../services/masterApi";
import { toast } from "../../lib/toast";

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSuccess: () => void;
  onPrint?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  initialManufacturers?: Manufacturer[];
  initialCommodities?: Commodity[];
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSuccess,
  onPrint,
  onDelete,
  initialManufacturers,
  initialCommodities,
}: ProductFormModalProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers || []);
  const [commodities, setCommodities] = useState<Commodity[]>(initialCommodities || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateProductDto>({
    name: "",
    sku: "",
    alias: "",
    commodityId: undefined,
    manufacturerId: undefined,
    countryOfOrigin: "India",
    factor: "",
    netQuantity: "",
    unitType: "UNIT",
    ussp: 0,
    weight: 0,
    ownership: "Self",
    mrp: 0,
    bestBeforeMonths: 84,
  });

  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name,
          sku: product.sku || "",
          alias: product.alias || "",
          commodityId: product.commodityId,
          manufacturerId: product.manufacturerId,
          countryOfOrigin: product.countryOfOrigin || "India",
          factor: product.factor || "",
          netQuantity: product.netQuantity || "",
          unitType: product.unitType || "UNIT",
          ussp: product.ussp || 0,
          weight: product.weight || 0,
          ownership: product.ownership || "Self",
          mrp: product.mrp || 0,
          bestBeforeMonths: product.bestBeforeMonths || 84,
        });
      } else {
        setFormData({
          name: "",
          sku: "",
          alias: "",
          commodityId: undefined,
          manufacturerId: undefined,
          countryOfOrigin: "India",
          factor: "",
          netQuantity: "",
          unitType: "UNIT",
          ussp: 0,
          weight: 0,
          ownership: "Self",
          mrp: 0,
          bestBeforeMonths: 84,
        });
      }

      // Fetch if not provided
      if (!initialManufacturers) {
        manufacturersApi.getAll().then(setManufacturers).catch(() => {});
      }
      if (!initialCommodities) {
        commoditiesApi.getAll().then(setCommodities).catch(() => {});
      }
    }
  }, [isOpen, product, initialManufacturers, initialCommodities]);

  const manufacturerOptions = useMemo(
    () => manufacturers.map((m) => ({ value: String(m.id), label: m.name })),
    [manufacturers],
  );

  const commodityOptions = useMemo(
    () => commodities.map((c) => ({ value: String(c.id), label: c.name })),
    [commodities],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.name || !formData.sku) {
      toast.error("Product name and SKU are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const ussp = formData.mrp && formData.factor ? formData.mrp / parseFloat(formData.factor) || 0 : 0;

      const payload = {
        id: product?.id || 0,
        name: formData.name,
        sku: formData.sku,
        alias: formData.alias || null,
        commodityId: formData.commodityId || null,
        manufacturerId: formData.manufacturerId || null,
        countryOfOrigin: formData.countryOfOrigin || null,
        factor: formData.factor || null,
        netQuantity: formData.netQuantity || null,
        unitType: formData.unitType || null,
        ussp: ussp,
        weight: formData.weight || 0,
        ownership: formData.ownership || null,
        mrp: formData.mrp || 0,
        bestBeforeMonths: formData.bestBeforeMonths || 84,
      };

      if (product) {
        await productsApi.update(product.id, payload);
        toast.success("Product updated successfully");
      } else {
        await productsApi.create(payload);
        toast.success("Product created successfully");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "New Product"}
      size="xl"
      headerActions={
        product ? (
          <>
            {onPrint && (
              <Tooltip label="Print sticker">
                <ActionIcon
                  size="md"
                  radius="md"
                  variant="light"
                  color="cyan"
                  onClick={() => onPrint(product)}
                >
                  <Printer size={18} />
                </ActionIcon>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip label="Delete product">
                <ActionIcon
                  size="md"
                  radius="md"
                  variant="light"
                  color="red"
                  onClick={() => onDelete(product)}
                >
                  <Trash2 size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </>
        ) : null
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Paper radius="lg" p="md" withBorder bg="transparent">
            <Stack gap="md">
              <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                Identity
              </Text>
              <Input
                label="Product Name"
                placeholder="Mechanical keyboard pro"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                leftElement={<Package size={16} />}
                required
              />
              <Group grow align="flex-start">
                <Input
                  label="SKU"
                  placeholder="SKU-1001"
                  value={formData.sku}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      sku: event.target.value.toUpperCase(),
                    }))
                  }
                  leftElement={<Tag size={16} />}
                  required
                />
                <Input
                  label="Alias"
                  placeholder="Alternative name or code"
                  value={formData.alias}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      alias: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Country of Origin"
                  placeholder="India"
                  value={formData.countryOfOrigin}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      countryOfOrigin: event.target.value,
                    }))
                  }
                  leftElement={<Globe size={16} />}
                />
              </Group>
              <Group grow align="flex-start">
                <Select
                  label="Manufacturer"
                  placeholder="Select manufacturer"
                  data={manufacturerOptions}
                  value={
                    formData.manufacturerId
                      ? String(formData.manufacturerId)
                      : null
                  }
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      manufacturerId: value ? Number(value) : undefined,
                    }))
                  }
                  searchable
                  clearable
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
                <Select
                  label="Commodity"
                  placeholder="Select commodity"
                  data={commodityOptions}
                  value={
                    formData.commodityId ? String(formData.commodityId) : null
                  }
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      commodityId: value ? Number(value) : undefined,
                    }))
                  }
                  searchable
                  clearable
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
                <Select
                  label="Ownership"
                  placeholder="Self or ThirdParty"
                  data={[
                    { value: "Self", label: "Self" },
                    { value: "ThirdParty", label: "ThirdParty" },
                  ]}
                  value={formData.ownership || null}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      ownership: value || undefined,
                    }))
                  }
                  clearable
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
              </Group>
            </Stack>
          </Paper>

          <Paper radius="lg" p="md" withBorder bg="transparent">
            <Stack gap="md">
              <Text size="11px" fw={800} c="dimmed" tt="uppercase">
                Pricing and Packaging
              </Text>
              <Group grow align="flex-start">
                <Input
                  label="MRP"
                  type="number"
                  step="0.01"
                  value={String(formData.mrp ?? 0)}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      mrp: Number(event.target.value),
                    }))
                  }
                  leftElement={<IndianRupee size={16} />}
                />
                <Input
                  label="Factor"
                  placeholder="1 or 500"
                  type="number"
                  step="1"
                  min="1"
                  value={formData.factor}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      factor: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Net Qnty"
                  placeholder="1L or 500ml"
                  value={formData.netQuantity}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      netQuantity: event.target.value,
                    }))
                  }
                />
              </Group>
              <Group grow align="flex-start">
                <Input
                  label="USSP (Auto-calculated)"
                  type="number"
                  step="0.01"
                  value={String(
                    formData.mrp && formData.factor
                      ? formData.mrp / parseFloat(formData.factor) || 0
                      : 0,
                  )}
                  disabled
                  leftElement={<IndianRupee size={16} />}
                />
                <Input
                  label="Unit"
                  placeholder="UNIT, KG, ML"
                  value={formData.unitType}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      unitType: event.target.value,
                    }))
                  }
                />
                <Input
                  label="Weight"
                  type="number"
                  step="0.01"
                  min="0"
                  value={String(formData.weight ?? 0)}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      weight: Number(event.target.value),
                    }))
                  }
                />
                <Input
                  label="Best Before Months"
                  type="number"
                  min="0"
                  value={String(formData.bestBeforeMonths ?? 84)}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      bestBeforeMonths: Number(event.target.value),
                    }))
                  }
                />
              </Group>
            </Stack>
          </Paper>
          <Group justify="flex-end" pt="sm">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {product ? "Update Product" : "Create Product"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
