import React, { memo, useCallback, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  ScanBarcode,
  X,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import {
  Badge,
  Box,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Loader,
  Center,
} from "@mantine/core";
import { Button } from "../components/atoms/Button";
import {
  OperationsPage,
  OperationsPanel,
} from "../components/organisms/Operations/OperationsShell";
import { toast } from "../lib/toast";
import {
  locationsApi,
  binsApi,
  Location,
  Bin,
} from "../services/masterApi";

export const BinMovement = memo(function BinMovement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scannedLocation, setScannedLocation] = useState<Location | null>(null);
  const [locationInput, setLocationInput] = useState("");
  const [scannedBins, setScannedBins] = useState<string[]>([]);
  const [binInput, setBinInput] = useState("");
  const [alreadyMappedBins, setAlreadyMappedBins] = useState<
    Array<{ binCode: string; locationCode: string }>
  >([]);
  const [isSaving, setIsSaving] = useState(false);

  const navigate = useNavigate();
  const locationInputRef = useRef<HTMLInputElement | null>(null);
  const binInputRef = useRef<HTMLInputElement | null>(null);

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
      toast.error("Failed to load location/bin directory");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Focus location input initially
  useEffect(() => {
    if (!isLoading && !scannedLocation) {
      window.setTimeout(() => locationInputRef.current?.focus(), 50);
    }
  }, [isLoading, scannedLocation]);

  // Focus bin input when location is selected
  useEffect(() => {
    if (scannedLocation) {
      window.setTimeout(() => binInputRef.current?.focus(), 50);
    }
  }, [scannedLocation]);

  const handleLocationScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && locationInput.trim()) {
      event.preventDefault();
      const code = locationInput.trim().toUpperCase();
      const matched = locations.find(
        (loc) => loc.locationCode.toUpperCase() === code
      );

      if (matched) {
        setScannedLocation(matched);
        setScannedBins(matched.bins || []);
        setAlreadyMappedBins([]);
        setLocationInput("");
        toast.success(`Location identified: ${matched.locationCode}`);
      } else {
        toast.error(`Location "${code}" not found in Location Master`);
      }
    }
  };

  const handleBinScan = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && binInput.trim() && scannedLocation) {
      event.preventDefault();
      const binCode = binInput.trim().toUpperCase();

      if (scannedBins.includes(binCode)) {
        toast.error(`Bin "${binCode}" already scanned`);
        setBinInput("");
        return;
      }

      const binExists = bins.some((b) => b.binCode.toUpperCase() === binCode);
      if (!binExists) {
        toast.error(`Bin "${binCode}" not found in Bin Master. Add it first.`);
        setBinInput("");
        return;
      }

      const assignedLocation = locations.find(
        (loc) =>
          loc.id !== scannedLocation.id &&
          loc.bins?.some((b) => b.toUpperCase() === binCode)
      );

      if (assignedLocation) {
        if (!alreadyMappedBins.some((item) => item.binCode === binCode)) {
          setAlreadyMappedBins((prev) => [
            ...prev,
            { binCode, locationCode: assignedLocation.locationCode },
          ]);
        }
      }

      setScannedBins((prev) => [...prev, binCode]);
      setBinInput("");
      toast.success(`Bin "${binCode}" added`);
    }
  };

  const handleRemoveBin = (binCode: string) => {
    setScannedBins((prev) => prev.filter((b) => b !== binCode));
    setAlreadyMappedBins((prev) =>
      prev.filter((item) => item.binCode !== binCode)
    );
  };

  const handleSave = async () => {
    if (!scannedLocation) return;
    setIsSaving(true);
    try {
      await locationsApi.mapBins(scannedLocation.id, scannedBins);
      toast.success(`Bins mapped to ${scannedLocation.locationCode} successfully`);

      // Update local locations list to reflect new mapping
      setLocations((prev) =>
        prev.map((loc) => {
          if (loc.id === scannedLocation.id) {
            return { ...loc, bins: scannedBins };
          }
          const filteredBins = loc.bins?.filter((b) => !scannedBins.includes(b)) || [];
          return { ...loc, bins: filteredBins };
        })
      );

      // Reset after success to allow scanning next location
      setScannedLocation(null);
      setScannedBins([]);
      setAlreadyMappedBins([]);
      setLocationInput("");
      setBinInput("");
    } catch (error: any) {
      toast.error(error.message || "Failed to save bin mapping");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate("/");
  };

  return (
    <OperationsPage
      title="Bin Movement"
      description="Scan location and relocate bins."
      icon={MapPin}
      hideHeader
    >
      <Stack gap="md" maw={640} mx="auto" w="100%">
        <OperationsPanel
          title="Relocate Bins"
          icon={ScanBarcode}
          description="Scan location code and associate bin identifiers."
          action={
            <Button
              size="xs"
              variant="outline"
              leftIcon={<ArrowLeft size={14} />}
              onClick={handleBackToDashboard}
            >
              Back
            </Button>
          }
        >
          {isLoading ? (
            <Center p="xl">
              <Stack gap="xs" align="center">
                <Loader size="md" />
                <Text size="sm" c="dimmed">
                  Loading Location Directories...
                </Text>
              </Stack>
            </Center>
          ) : (
            <Stack gap="md">
              {/* Scan Location */}
              {!scannedLocation ? (
                <Stack gap="xs">
                  <Text fw={700} size="sm">
                    Scan Target Location
                  </Text>
                  <TextInput
                    ref={locationInputRef}
                    placeholder="Scan or type location code (e.g. 101-A-3)"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyDown={handleLocationScan}
                    leftSection={<MapPin size={18} />}
                    size="md"
                    autoFocus
                  />
                  <Text size="xs" c="dimmed">
                    Ensure location exists in Master. Press Enter to confirm.
                  </Text>
                </Stack>
              ) : (
                <Stack gap="md">
                  {/* Location Card Info */}
                  <Paper
                    p="md"
                    withBorder
                    style={{
                      background: "rgba(30, 192, 243, 0.05)",
                      borderColor: "rgba(30, 192, 243, 0.2)",
                    }}
                  >
                    <Group justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          size={40}
                          radius="md"
                          variant="light"
                          color="cyan"
                        >
                          <MapPin size={20} />
                        </ThemeIcon>
                        <Stack gap={2}>
                          <Text fw={800} size="md">
                            {scannedLocation.locationCode}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Aisle: {scannedLocation.aisle} | Rack: {scannedLocation.rack} | Shelf: {scannedLocation.shelf}
                          </Text>
                        </Stack>
                      </Group>
                      <Button
                        size="xs"
                        variant="outline"
                        color="gray"
                        onClick={() => {
                          setScannedLocation(null);
                          setScannedBins([]);
                          setAlreadyMappedBins([]);
                        }}
                      >
                        Change Location
                      </Button>
                    </Group>
                  </Paper>

                  {/* Bin Scanner Input */}
                  <Stack gap="xs">
                    <Text fw={700} size="sm">
                      Scan Bin Code
                    </Text>
                    <TextInput
                      ref={binInputRef}
                      placeholder="Scan or type bin code (e.g. B-101-A)"
                      value={binInput}
                      onChange={(e) => setBinInput(e.target.value)}
                      onKeyDown={handleBinScan}
                      leftSection={<ScanBarcode size={18} />}
                      size="md"
                      autoFocus
                    />
                    <Text size="xs" c="dimmed">
                      Scan bin to assign to location. Press Enter to confirm.
                    </Text>
                  </Stack>

                  {/* Relocated Bins Warning */}
                  {alreadyMappedBins.length > 0 && (
                    <Paper
                      p="sm"
                      withBorder
                      style={{
                        background: "rgba(255, 146, 43, 0.05)",
                        borderColor: "rgba(255, 146, 43, 0.2)",
                      }}
                    >
                      <Stack gap="xs">
                        <Text fw={700} size="xs" c="orange.4">
                          ⚠️ Bins to be moved from other locations:
                        </Text>
                        <ScrollArea.Autosize mah={100}>
                          <Stack gap={4}>
                            {alreadyMappedBins.map((item) => (
                              <Group key={item.binCode} justify="space-between" wrap="nowrap">
                                <Text size="xs" fw={700} fontFamily="monospace" c="orange.3">
                                  {item.binCode}
                                </Text>
                                <Badge size="xs" variant="light" color="orange">
                                  from {item.locationCode}
                                </Badge>
                              </Group>
                            ))}
                          </Stack>
                        </ScrollArea.Autosize>
                      </Stack>
                    </Paper>
                  )}

                  {/* Scanned Bins List */}
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={700} size="sm">
                        Scanned Bins ({scannedBins.length})
                      </Text>
                      {scannedBins.length > 0 && (
                        <Text
                          size="xs"
                          c="red.4"
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setScannedBins([]);
                            setAlreadyMappedBins([]);
                          }}
                        >
                          Clear All
                        </Text>
                      )}
                    </Group>

                    {scannedBins.length === 0 ? (
                      <Paper
                        p="lg"
                        withBorder
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          borderStyle: "dashed",
                        }}
                      >
                        <Center>
                          <Stack gap="xs" align="center">
                            <ScanBarcode size={28} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed">
                              No bins scanned for this location yet.
                            </Text>
                          </Stack>
                        </Center>
                      </Paper>
                    ) : (
                      <ScrollArea.Autosize mah={240}>
                        <Stack gap={6}>
                          {scannedBins.map((bin) => (
                            <Paper
                              key={bin}
                              p="xs"
                              withBorder
                              style={{
                                background: "rgba(255, 255, 255, 0.02)",
                                borderColor: "rgba(30, 192, 243, 0.15)",
                              }}
                            >
                              <Group justify="space-between" wrap="nowrap">
                                <Group gap="xs" wrap="nowrap">
                                  <CheckCircle2 size={16} color="var(--mantine-color-green-4)" />
                                  <Text fw={650} size="xs" fontFamily="monospace" c="white">
                                    {bin}
                                  </Text>
                                </Group>
                                <Box
                                  style={{ cursor: "pointer" }}
                                  onClick={() => handleRemoveBin(bin)}
                                >
                                  <X size={16} color="var(--mantine-color-red-4)" />
                                </Box>
                              </Group>
                            </Paper>
                          ))}
                        </Stack>
                      </ScrollArea.Autosize>
                    )}
                  </Stack>

                  <Group justify="flex-end" pt="xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setScannedLocation(null);
                        setScannedBins([]);
                        setAlreadyMappedBins([]);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      loading={isSaving}
                      disabled={scannedBins.length === 0}
                      leftIcon={<CheckCircle2 size={16} />}
                    >
                      Save Bin Movement
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          )}
        </OperationsPanel>
      </Stack>
    </OperationsPage>
  );
});

export default BinMovement;
