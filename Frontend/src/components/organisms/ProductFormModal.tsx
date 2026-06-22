import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { ActionIcon, Center, Group, Image, Paper, Select, SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { Globe, IndianRupee, MapPin, Package, Printer, QrCode, Search, Tag, Trash2 } from "lucide-react";
import { Input } from "../atoms/Input";
import { Button } from "../atoms/Button";
import { Modal } from "../atoms/Modal";
import {
  productsApi,
  manufacturersApi,
  commoditiesApi,
  partiesApi,
  Product,
  Manufacturer,
  Commodity,
  Party,
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
  onViewLocations?: (product: Product) => void;
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
  onViewLocations,
  initialManufacturers,
  initialCommodities,
}: ProductFormModalProps) {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(initialManufacturers || []);
  const [commodities, setCommodities] = useState<Commodity[]>(initialCommodities || []);
  const [parties, setParties] = useState<Party[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skuQrDataUrl, setSkuQrDataUrl] = useState<string | null>(null);
  const [isSkuQrModalOpen, setIsSkuQrModalOpen] = useState(false);
  const navigate = useNavigate();
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
    note: "",
    cartonQr: "",
    cartonPerItem: null,
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
          note: product.note || "",
          cartonQr: product.cartonQr || "",
          cartonPerItem: product.cartonPerItem ?? null,
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
          note: "",
          cartonQr: "",
          cartonPerItem: null,
        });
      }

      // Fetch if not provided
      if (!initialManufacturers) {
        manufacturersApi.getAll().then(setManufacturers).catch(() => {});
      }
      if (!initialCommodities) {
        commoditiesApi.getAll().then(setCommodities).catch(() => {});
      }
      partiesApi.getAll().then(setParties).catch(() => {});
    }
  }, [isOpen, product, initialManufacturers, initialCommodities]);

  useEffect(() => {
    const sku = formData.sku?.trim().toUpperCase() || "";
    if (!isOpen || !sku) {
      setSkuQrDataUrl(null);
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(sku, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((url) => {
        if (isMounted) setSkuQrDataUrl(url);
      })
      .catch(() => {
        if (isMounted) setSkuQrDataUrl(null);
      });

    return () => {
      isMounted = false;
    };
  }, [formData.sku, isOpen]);

  const manufacturerOptions = useMemo(
    () => manufacturers.map((m) => ({ value: String(m.id), label: m.name })),
    [manufacturers],
  );

  const commodityOptions = useMemo(
    () => commodities.map((c) => ({ value: String(c.id), label: c.name })),
    [commodities],
  );

  const ownershipOptions = useMemo(() => {
    const options = [
      { value: "Self", label: "Self" },
      ...parties.map((item) => ({
        value: item.name.trim(),
        label: item.name.trim(),
      })),
    ];

    const savedOwnership = formData.ownership?.trim();
    const hasSavedOwnership = savedOwnership
      ? options.some((option) => option.value.toLowerCase() === savedOwnership.toLowerCase())
      : true;

    if (savedOwnership && !hasSavedOwnership) {
      options.push({ value: savedOwnership, label: savedOwnership });
    }

    return options;
  }, [formData.ownership, parties]);

  const ownershipSelectValue = useMemo(() => {
    const ownership = formData.ownership?.trim();
    if (!ownership) return null;
    return ownershipOptions.find((option) => option.value.toLowerCase() === ownership.toLowerCase())?.value ?? ownership;
  }, [formData.ownership, ownershipOptions]);

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
        note: formData.note || null,
        cartonQr: formData.cartonQr || null,
        cartonPerItem: formData.cartonPerItem && formData.cartonPerItem > 0 ? formData.cartonPerItem : null,
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
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? "Edit Product" : "New Product"}
      size="xxl"
      headerActions={
        <>
            <Tooltip label={formData.sku ? "SKU QR generated" : "Enter SKU to generate QR"}>
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="violet"
                disabled={!formData.sku?.trim()}
                onClick={() => setIsSkuQrModalOpen(true)}
                aria-label="SKU QR code"
              >
                <QrCode size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Open in Product Query">
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="blue"
                disabled={!formData.sku?.trim()}
                onClick={() => {
                  const sku = formData.sku?.trim();
                  if (sku) navigate(`/product-query?search=${encodeURIComponent(sku)}`);
                }}
                aria-label="Product Query"
              >
                <Search size={18} />
              </ActionIcon>
            </Tooltip>
          {product ? (
            <>
            <Tooltip label="View product locations">
              <ActionIcon
                size="md"
                radius="md"
                variant="light"
                color="teal"
                onClick={() => onViewLocations?.(product)}
                disabled={!onViewLocations}
                aria-label="View product locations"
              >
                <MapPin size={18} />
              </ActionIcon>
            </Tooltip>
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
          ) : null}
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="xs">
          <Paper radius="md" p="xs" withBorder bg="transparent">
            <Stack gap={6}>
              <Group justify="space-between" gap="xs">
                <Text size="10px" fw={800} c="dimmed" tt="uppercase">
                  Product Details
                </Text>
                <Text size="10px" c="dimmed">
                  Compact view
                </Text>
              </Group>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3, xl: 5 }} spacing={8} verticalSpacing={6}>
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
                  placeholder="Self or Party"
                  data={ownershipOptions}
                  value={ownershipSelectValue}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      ownership: value?.trim() || undefined,
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
                <Input
                  label="Product Note"
                  placeholder="Sticker note"
                  value={formData.note || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      note: event.target.value,
                    }))
                  }
                />
                <Input
                  label="MRP"
                  type="number"
                  step="0.01"
                  min="0"
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
                <Input
                  label="Carton QR"
                  placeholder="Carton QR / barcode"
                  value={formData.cartonQr || ""}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      cartonQr: event.target.value,
                    }))
                  }
                  leftElement={<Tag size={16} />}
                />
                <Input
                  label="Carton Per Item"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Items per carton"
                  value={formData.cartonPerItem == null ? "" : String(formData.cartonPerItem)}
                  onChange={(event) =>
                    setFormData((prev) => ({
                      ...prev,
                      cartonPerItem: event.target.value ? Number(event.target.value) : null,
                    }))
                  }
                  leftElement={<Package size={16} />}
                />
              </SimpleGrid>
            </Stack>
          </Paper>
          <Group justify="flex-end" pt={4} gap="xs">
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
    <Modal
      isOpen={isSkuQrModalOpen}
      onClose={() => setIsSkuQrModalOpen(false)}
      title="SKU QR Code"
      size="sm"
      headerActions={
        <ActionIcon size="md" radius="md" variant="light" color="violet" aria-label="SKU QR code">
          <QrCode size={18} />
        </ActionIcon>
      }
    >
      <Stack align="center" gap="md">
        <Paper radius="lg" p="md" withBorder bg="white">
          {skuQrDataUrl ? (
            <Image src={skuQrDataUrl} alt="SKU QR code" w={240} h={240} fit="contain" />
          ) : (
            <Center w={240} h={240}>
              <QrCode size={54} color="var(--mantine-color-dimmed)" />
            </Center>
          )}
        </Paper>
        <Stack gap={2} align="center">
          <Text size="10px" fw={800} c="dimmed" tt="uppercase">
            SKU
          </Text>
          <Text size="sm" fw={900} ff="monospace">
            {formData.sku?.trim() || "No SKU"}
          </Text>
        </Stack>
      </Stack>
    </Modal>
    </>
  );
}
