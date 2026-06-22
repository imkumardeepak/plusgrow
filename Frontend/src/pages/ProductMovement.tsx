import React, { memo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftRight,
  Boxes,
  MapPin,
  ScanLine,
  Search,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Minus,
  Plus,
  X,
} from "lucide-react";
import {
  ActionIcon,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Loader,
  Badge,
  Select,
  NumberInput,
  SimpleGrid,
  Tooltip,
} from "@mantine/core";
import { Button } from "../components/atoms/Button";
import { toast } from "../lib/toast";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import {
  productsApi,
  productAllottedLocationsApi,
  locationsApi,
  type ProductLookupResult,
  type Location,
} from "../services/masterApi";

export const ProductMovement = memo(function ProductMovement() {
  const navigate = useNavigate();
  
  // Search state
  const [skuInput, setSkuInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [productData, setProductData] = useState<ProductLookupResult | null>(null);
  
  // Form states
  const [sourceLoc, setSourceLoc] = useState<string | null>(null);
  const [destLocInput, setDestLocInput] = useState("");
  const [quantity, setQuantity] = useState<number | "">(1);
  const [reason, setReason] = useState<string | null>("Relocation");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  const skuInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    skuInputRef.current?.focus();
    
    // Fetch locations directory for validation
    const loadLocations = async () => {
      try {
        const data = await locationsApi.getAll();
        setLocations(data);
      } catch (err) {
        console.error("Failed to load locations master", err);
      }
    };
    loadLocations();
  }, []);

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const rawInput = skuInput.trim();
    if (!rawInput) return;

    const sku = rawInput.split("#")[0].trim().toUpperCase();
    setSkuInput(sku);

    setIsSearching(true);
    try {
      const result = await productsApi.lookup(sku);
      setProductData(result);
      // Reset form on new product lookup
      setSourceLoc(null);
      setDestLocInput("");
      setQuantity(1);
      setNotes("");
      
      if (result.locations.length > 0) {
        // Auto-select the first source location with stock, then continue scan flow.
        const autoSource =
          result.locations.find((loc) => loc.quantity > 0) || result.locations[0];
        setSourceLoc(autoSource.locationCode);
        toast.success(`Product identified: ${result.product?.name}`);
        setTimeout(() => destInputRef.current?.focus(), 100);
      } else {
        toast.error("This product does not have any allocated stock in the warehouse.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Product SKU not found");
      setProductData(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDestLocScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && destLocInput.trim()) {
      e.preventDefault();
      const code = destLocInput.trim().toUpperCase();

      // Find standard location code matching input or matching bin contents
      const matched = locations.find(
        (loc) =>
          loc.locationCode.toUpperCase() === code ||
          loc.bins?.some((bin) => bin.toUpperCase() === code)
      );

      if (matched) {
        setDestLocInput(matched.locationCode);
        toast.success(`Destination identified: ${matched.locationCode}`);
        setTimeout(() => qtyInputRef.current?.focus(), 50);
      } else {
        toast.error(`Location or Bin "${code}" not found in Location Master`);
      }
    }
  };

  // Get current quantity of selected source location
  const sourceQty = productData?.locations.find(
    (loc) => loc.locationCode === sourceLoc
  )?.quantity || 0;

  const clampMoveQuantity = (value: number | "") => {
    if (value === "") return "";
    const numericValue = Math.trunc(value);
    if (!Number.isFinite(numericValue)) return "";
    return Math.max(1, Math.min(numericValue, sourceQty || 1));
  };

  const updateMoveQuantity = (value: number | string) => {
    if (value === "") {
      setQuantity("");
      return;
    }

    const numericValue = typeof value === "number" ? value : Number(value);
    setQuantity(clampMoveQuantity(numericValue));
  };

  const stepMoveQuantity = (direction: 1 | -1) => {
    const currentValue = typeof quantity === "number" ? quantity : 0;
    setQuantity(clampMoveQuantity(currentValue + direction));
    qtyInputRef.current?.focus();
  };

  const handleMoveStock = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!productData?.product?.id) {
      toast.error("Please select a product first");
      return;
    }
    if (!sourceLoc) {
      toast.error("Source location is required");
      return;
    }
    if (!destLocInput.trim()) {
      toast.error("Destination location is required");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be greater than zero");
      return;
    }
    if (quantity > sourceQty) {
      toast.error(`Quantity exceeds available stock of ${sourceQty} units at ${sourceLoc}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await productAllottedLocationsApi.moveStock({
        productId: productData.product.id,
        sourceLocationCode: sourceLoc,
        destinationLocationCode: destLocInput.trim().toUpperCase(),
        quantity: Number(quantity),
        reason: reason || "Relocation",
        notes: notes,
      });

      toast.success("Product stock relocated successfully!");
      
      // Refresh product details to show updated stock mapping
      const updatedResult = await productsApi.lookup(productData.sku);
      setProductData(updatedResult);
      
      // Reset input fields except search SKU
      setSourceLoc(null);
      setDestLocInput("");
      setQuantity(1);
      setNotes("");
      
      // Autofocus back to scan input for next operation
      skuInputRef.current?.focus();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to relocate stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setSkuInput("");
    setProductData(null);
    setSourceLoc(null);
    setDestLocInput("");
    setQuantity(1);
    setNotes("");
    skuInputRef.current?.focus();
  };

  // Transform product locations into Mantine Select options
  const sourceOptions = (productData?.locations || []).map((loc) => ({
    value: loc.locationCode,
    label: `${loc.locationCode} (${loc.quantity} units)`,
  }));

  return (
    <OperationsPage
      title="Product Movement"
      description="Scan product SKU and move stock from one location to another."
      icon={ArrowLeftRight}
      hideHeader
    >
      <div className="max-w-2xl mx-auto w-full space-y-2 sm:space-y-4 px-1 sm:px-0">
        
        {/* Search Panel */}
        <OperationsPanel
          title="Identify Product"
          icon={ScanLine}
          description="Scan barcode or enter product SKU code to locate stock."
          action={
            <Button
              size="xs"
              variant="outline"
              leftIcon={<ArrowLeft size={14} />}
              onClick={() => navigate("/")}
            >
              Back
            </Button>
          }
        >
          <form onSubmit={handleLookup} className="space-y-2 sm:space-y-4">
            <TextInput
              ref={skuInputRef}
              label="SKU CODE"
              placeholder="Scan or enter SKU..."
              value={skuInput}
              onChange={(e) => setSkuInput(e.currentTarget.value)}
              required
              styles={{
                input: {
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                },
              }}
              leftSection={isSearching ? <Loader size={14} /> : <Search size={14} />}
              rightSection={
                productData && (
                  <Badge color="cyan" variant="filled" size="xs">
                    Loaded
                  </Badge>
                )
              }
            />
            
            <Group gap="xs" wrap="nowrap">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={isSearching}
                loading={isSearching}
              >
                Scan / Find
              </Button>
              {productData && (
                <Button
                  type="button"
                  size="sm"
                  variant="subtle"
                  onClick={handleClear}
                >
                  Clear
                </Button>
              )}
            </Group>
          </form>
        </OperationsPanel>

        {/* Relocation Panel */}
        {productData && (
          <OperationsPanel
            title="Relocation Details"
            icon={Boxes}
            description="Provide source, destination, and quantity to relocate."
          >
            <Stack gap={{ base: "xs", sm: "md" }}>
              {/* Product Info Banner */}
              <Paper
                radius="lg"
                p="sm"
                withBorder
                style={{
                  background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08), rgba(15, 23, 42, 0.72))",
                  borderColor: "rgba(34, 211, 238, 0.16)",
                }}
              >
                <Stack gap={4}>
                  <Text size="xs" fw={800} c="cyan.4" ff="monospace">
                    {productData.sku}
                  </Text>
                  <Text size="sm" fw={800} c="white" lineClamp={2}>
                    {productData.product?.name}
                  </Text>
                  <Group gap="xs" mt={4}>
                    <Badge variant="light" color="cyan" size="xs">
                      Total Stock: {productData.currentStock}
                    </Badge>
                    <Badge variant="light" color="indigo" size="xs">
                      Locations: {productData.locations.length}
                    </Badge>
                  </Group>
                </Stack>
              </Paper>

              <form onSubmit={handleMoveStock} className="space-y-2 sm:space-y-4">
                
                {/* Source Location */}
                <Select
                  label="SOURCE LOCATION (FROM)"
                  placeholder="Select location containing stock"
                  data={sourceOptions}
                  value={sourceLoc}
                  onChange={(val) => {
                    setSourceLoc(val);
                    // Focus destination input when source is selected
                    setTimeout(() => destInputRef.current?.focus(), 100);
                  }}
                  required
                  searchable
                  clearable={false}
                  leftSection={<MapPin size={16} />}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: "xs", sm: "md" }}>
                  {/* Destination Location */}
                  <TextInput
                    ref={destInputRef}
                    id="dest-loc-input"
                    label="DESTINATION LOCATION (TO)"
                    placeholder="Scan / type destination code"
                    value={destLocInput}
                    onChange={(e) => setDestLocInput(e.target.value)}
                    onKeyDown={handleDestLocScan}
                    required
                    styles={{
                      input: {
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                      },
                    }}
                    leftSection={<ScanLine size={16} />}
                  />

                  {/* Quantity */}
                  <NumberInput
                    ref={qtyInputRef}
                    id="move-qty-input"
                    label="QUANTITY TO MOVE"
                    placeholder="Enter quantity"
                    min={1}
                    max={sourceQty || 1}
                    value={quantity}
                    onChange={updateMoveQuantity}
                    required
                    hideControls
                    data-no-clear
                    data-no-stepper
                    leftSection={<Boxes size={16} />}
                    rightSectionPointerEvents="all"
                    rightSectionWidth={104}
                    rightSection={
                      <Group gap={3} wrap="nowrap" pr={4}>
                        <Tooltip label="Clear quantity">
                          <ActionIcon
                            type="button"
                            size="sm"
                            radius="md"
                            variant="subtle"
                            color="gray"
                            aria-label="Clear quantity"
                            disabled={!sourceLoc || quantity === ""}
                            onClick={() => {
                              setQuantity("");
                              qtyInputRef.current?.focus();
                            }}
                          >
                            <X size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Decrease quantity">
                          <ActionIcon
                            type="button"
                            size="sm"
                            radius="md"
                            variant="subtle"
                            color="red"
                            aria-label="Decrease quantity"
                            disabled={!sourceLoc || quantity === "" || quantity <= 1}
                            onClick={() => stepMoveQuantity(-1)}
                          >
                            <Minus size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Increase quantity">
                          <ActionIcon
                            type="button"
                            size="sm"
                            radius="md"
                            variant="subtle"
                            color="green"
                            aria-label="Increase quantity"
                            disabled={
                              !sourceLoc ||
                              sourceQty <= 0 ||
                              (typeof quantity === "number" && quantity >= sourceQty)
                            }
                            onClick={() => stepMoveQuantity(1)}
                          >
                            <Plus size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    }
                    disabled={!sourceLoc}
                    description={sourceLoc ? `Max available: ${sourceQty}` : "Select source first"}
                    styles={{
                      input: {
                        paddingRight: 108,
                      },
                    }}
                  />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={{ base: "xs", sm: "md" }}>
                  {/* Reason */}
                  <Select
                    label="REASON"
                    placeholder="Select relocation reason"
                    data={["Relocation", "Damaged Area", "QC Hold", "Other"]}
                    value={reason}
                    onChange={setReason}
                    allowDeselect={false}
                    leftSection={<AlertTriangle size={16} />}
                  />

                  {/* Notes */}
                  <TextInput
                    label="NOTES (OPTIONAL)"
                    placeholder="Add brief details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    leftSection={<FileText size={16} />}
                  />
                </SimpleGrid>

                {/* Relocation Action */}
                <Button
                  type="submit"
                  size="md"
                  fullWidth
                  disabled={isSubmitting || !sourceLoc || !destLocInput.trim()}
                  loading={isSubmitting}
                  className="mt-2 sm:mt-6"
                >
                  Confirm Movement
                </Button>
              </form>
            </Stack>
          </OperationsPanel>
        )}
      </div>
    </OperationsPage>
  );
});

export default ProductMovement;
