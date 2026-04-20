import {
  type Component,
  createSignal,
  createResource,
  Show,
  For,
  onCleanup,
  onMount,
  createMemo,
} from "solid-js"
import { A } from "@solidjs/router"
import { css } from "@style/css"
import { fetchTodayRaces, updateRace } from "@/utils/adminApi"
import { runners, type RunnerName } from "@/data/runners"
import QrScanner from "qr-scanner"
import { BarcodeDetector as BarcodeDetectorPolyfill } from "barcode-detector/pure"
import { Modal } from "@/components/ui/Modal"
import { AdminButton } from "@/components/admin/AdminButton"


// Build a lookup: parkrunId → { key, name }
const parkrunIdMap = new Map<string, { key: RunnerName; name: string }>();
for (const [key, signal] of Object.entries(runners)) {
  const data = (signal as any)[0]();
  if (data.id) {
    parkrunIdMap.set(data.id, { key: key as RunnerName, name: data.name });
  }
}

export const ScanPage: Component = () => {
  const [todayRaces, { refetch }] = createResource(fetchTodayRaces);
  const [selectedRaceId, setSelectedRaceId] = createSignal<string>("");
  const [cameraActive, setCameraActive] = createSignal(false);
  const [scanResult, setScanResult] = createSignal<{
    runnerName: string;
    runnerId: string;
    eventName: string;
    eventDate: string;
  } | null>(null);
  const [toast, setToast] = createSignal<string>('');
  const [checkedIn, setCheckedIn] = createSignal<string[]>([]);

  let videoRef!: HTMLVideoElement;
  let overlayRef!: HTMLDivElement;
  let cameraAreaRef!: HTMLDivElement;
  let qrScanner: QrScanner | null = null;
  let barcodeDetector: any = null;
  let barcodeIntervalId: ReturnType<typeof setInterval> | null = null;
  let invertCanvas: HTMLCanvasElement | null = null;
  let invertCtx: CanvasRenderingContext2D | null = null;
  let barcodeScanning = false;
  const [squareSize, setSquareSize] = createSignal<number>(0);

  const selectedRace = createMemo(() => {
    const races = todayRaces() ?? [];
    const id = selectedRaceId();
    return races.find((r) => r._id === id) ?? null;
  });

  // Auto-select single race
  const autoSelect = createMemo(() => {
    const races = todayRaces() ?? [];
    if (races.length === 1 && !selectedRaceId()) {
      setSelectedRaceId(races[0]._id);
      // Populate checked-in list
      setCheckedIn(races[0].attendees.map((a) => a.runnerId));
    }
    return races;
  });

  const startCamera = async () => {
    try {
      setCameraActive(true);
      startScanning();
    } catch (err) {
      console.error("Camera access denied", err);
      setCameraActive(false);
      setToast("Camera access denied. Please allow camera in browser settings.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  const startScanning = () => {
    if (qrScanner) {
      qrScanner.start();
      return;
    }

    qrScanner = new QrScanner(
      videoRef,
      (result: QrScanner.ScanResult) => {
        handleBarcode(result.data);
      },
      {
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: true,
        overlay: overlayRef,
        calculateScanRegion: (video: HTMLVideoElement) => {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const side = Math.min(vw, vh);
          return {
            x: Math.round((vw - side) / 2),
            y: Math.round((vh - side) / 2),
            width: side,
            height: side,
          };
        },
      }
    );

    qrScanner.setInversionMode('both');

    qrScanner.start().then(() => {
      startBarcodeDetector();
    }).catch((err) => {
      console.error("Failed to start scanner", err);
      setCameraActive(false);
      setToast("Could not start camera. Please check permissions.");
      setTimeout(() => setToast(""), 4000);
    });
  };

  // Barcode detector for 1D barcodes (Code 128, etc.) using polyfill
  const startBarcodeDetector = async () => {
    try {
      const supported = await BarcodeDetectorPolyfill.getSupportedFormats();
      const wanted = ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf'] as const;
      const formats = wanted.filter((f) => (supported as readonly string[]).includes(f));
      if (formats.length === 0) return;
      barcodeDetector = new BarcodeDetectorPolyfill({ formats: [...formats] });
      // Scan every 250ms to avoid hammering the CPU
      barcodeIntervalId = setInterval(scanBarcodeFrame, 250);
    } catch (err) {
      console.error('BarcodeDetector polyfill init failed', err);
    }
  };

  const scanBarcodeFrame = async () => {
    if (!barcodeDetector || !videoRef || videoRef.readyState < 2) return;
    if (barcodeScanning) return; // prevent overlapping calls
    barcodeScanning = true;
    try {
      // Scan original (black-on-white)
      const results = await barcodeDetector.detect(videoRef);
      if (results.length > 0) {
        handleBarcode(results[0].rawValue);
        return;
      }

      // Scan inverted (white-on-black) by drawing to a canvas with CSS filter
      const w = videoRef.videoWidth;
      const h = videoRef.videoHeight;
      if (w === 0 || h === 0) return;

      if (!invertCanvas) {
        invertCanvas = document.createElement('canvas');
        invertCtx = invertCanvas.getContext('2d', { willReadFrequently: true });
      }
      if (invertCanvas.width !== w) invertCanvas.width = w;
      if (invertCanvas.height !== h) invertCanvas.height = h;
      if (!invertCtx) return;

      // Use filter to invert colors (much faster than pixel manipulation)
      invertCtx.filter = 'invert(1)';
      invertCtx.drawImage(videoRef, 0, 0, w, h);
      invertCtx.filter = 'none';

      const invertedResults = await barcodeDetector.detect(invertCanvas);
      if (invertedResults.length > 0) {
        handleBarcode(invertedResults[0].rawValue);
      }
    } catch {
      // ignore transient detection errors
    } finally {
      barcodeScanning = false;
    }
  };

  const stopBarcodeDetector = () => {
    if (barcodeIntervalId) {
      clearInterval(barcodeIntervalId);
      barcodeIntervalId = null;
    }
  };

  const stopScanning = () => {
    if (qrScanner) {
      qrScanner.stop();
    }
    stopBarcodeDetector();
  };

  const handleBarcode = (rawData: string) => {
    // Parkrun barcodes typically start with "A" followed by the parkrunId
    let id = rawData.trim();
    if (id.toUpperCase().startsWith("A")) {
      id = id.substring(1);
    }

    // Check if already checked in
    if (checkedIn().includes(id) || checkedIn().some((cid) => {
      const r = parkrunIdMap.get(id);
      return r && cid === r.key;
    })) {
      setToast(`Already checked in!`);
      setTimeout(() => setToast(""), 2000);
      return;
    }

    // Look up runner
    const runner = parkrunIdMap.get(id);
    if (!runner) {
      setToast(`Unknown barcode: ${rawData}`);
      setTimeout(() => setToast(""), 3000);
      return;
    }

    const race = selectedRace();
    if (!race) {
      setToast("No event selected");
      setTimeout(() => setToast(""), 2000);
      return;
    }

    // Pause scanning and show confirmation
    stopScanning();
    setScanResult({
      runnerName: runner.name,
      runnerId: runner.key,
      eventName: race.name,
      eventDate: race.date,
    });
  };

  const confirmCheckin = async () => {
    const result = scanResult();
    const race = selectedRace();
    if (!result || !race) return;

    // Add to local checked-in list
    setCheckedIn((prev) => [...prev, result.runnerId]);

    // Update the race on the server
    const newAttendees = [
      ...race.attendees,
      { runnerId: result.runnerId, scanned: true },
    ];
    await updateRace(race._id, { attendees: newAttendees });

    setScanResult(null);
    // Resume scanning
    startScanning();
    // Refresh races to get updated attendee list
    refetch();
  };

  const dismissCheckin = () => {
    setScanResult(null);
    startScanning();
  };

  const runnerDisplayName = (runnerId: string): string => {
    const r = runners[runnerId as RunnerName];
    if (r) return r[0]().name;
    return runnerId;
  };

  // Measure camera area and compute square size
  let resizeObserver: ResizeObserver | null = null;

  const setupResizeObserver = () => {
    if (resizeObserver) return;
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSquareSize(Math.floor(Math.min(width, height)));
      }
    });
    if (cameraAreaRef) {
      resizeObserver.observe(cameraAreaRef);
    }
  };

  onCleanup(() => {
    if (qrScanner) {
      qrScanner.destroy();
      qrScanner = null;
    }
    stopBarcodeDetector();
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }
  });

  // Suppress noisy "No QR code found" logs from qr-scanner
  onMount(() => {
    const origLog = console.log;
    console.log = (...args: unknown[]) => {
      if (
        args.length > 0 &&
        typeof args[0] === "string" &&
        args[0].includes("No QR code found")
      ) {
        return;
      }
      origLog.apply(console, args);
    };
    onCleanup(() => {
      console.log = origLog;
    });
  });

  // Track autoSelect
  onMount(() => autoSelect());

  return (
    <div class={styles.scanPage}>
      {/* Event selector */}
      <div class={styles.eventSelector}>
        <Show
          when={(todayRaces() ?? []).length > 0}
          fallback={
            <p class={styles.noEvents}>
              No events today.{" "}
              <A href="/admin" class={styles.link}>
                Go here
              </A>{" "}
              to create an event.
            </p>
          }
        >
          <label class={styles.selectLabel}>
            Event:
            <select
              class={styles.select}
              value={selectedRaceId()}
              onChange={(e) => {
                setSelectedRaceId(e.currentTarget.value);
                const race = (todayRaces() ?? []).find(
                  (r) => r._id === e.currentTarget.value
                );
                if (race) {
                  setCheckedIn(race.attendees.map((a) => a.runnerId));
                }
              }}
            >
              <option value="">Select event…</option>
              <For each={todayRaces() ?? []}>
                {(race) => (
                  <option value={race._id}>
                    {race.name} - {race.date} ({race.attendees.length} attendees)
                  </option>
                )}
              </For>
            </select>
          </label>
        </Show>
      </div>

      {/* Camera area */}
      <Show when={!selectedRace()}>
        <div class={styles.noEvent}>Select an event</div>
      </Show>
      <Show when={selectedRace()}>
        <div class={styles.cameraArea} ref={(el) => { cameraAreaRef = el; setupResizeObserver(); }}>
          <Show
            when={cameraActive()}
            fallback={
              <div class={styles.cameraPlaceholder}>
                <button class={styles.startCameraBtn} onClick={startCamera}>
                  📷 Start Camera
                </button>
              </div>
            }
          >
            <div
              class={styles.videoWrapper}
              style={{
                width: `${squareSize()}px`,
                height: `${squareSize()}px`,
              }}
            >
              <video
                ref={videoRef!}
                class={styles.video}
                playsinline
                muted
              />
              <div ref={overlayRef!} class={styles.overlayScan} />
              <div class={styles.scanRegionBorder} />
            </div>
          </Show>
        </div>

        {/* Checked-in runners */}
        <div class={styles.checkedInSection}>
          <h3 class={styles.checkedInTitle}>
            Checked In ({checkedIn().length})
          </h3>
          <div class={styles.checkedInList}>
            <For each={checkedIn()}>
              {(rid) => (
                <span class={styles.checkedInChip}>
                  {runnerDisplayName(rid)}
                </span>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Toast */}
      <Show when={toast()}>
        <div class={styles.toast}>{toast()}</div>
      </Show>

      {/* Scan result confirmation modal */}
      <Show when={scanResult()}>
        {(result) => (
          <Modal title="Runner Found!">
            <div class={styles.confirmContent}>
              <div class={styles.confirmText}>
                Would you like to check in <strong>{result().runnerName}</strong> to:<br/>
                <strong>{result().eventName}</strong>
              </div>
              <div class={styles.confirmActions}>
                <AdminButton onClick={dismissCheckin} variant="secondary">Skip</AdminButton>
                <AdminButton onClick={confirmCheckin}>OK</AdminButton>
              </div>
            </div>
          </Modal>
        )}
      </Show>
    </div>
  );
};

const styles = {
  scanPage: css({
    display: "flex",
    flexDirection: "column",
    height: "100%",
    flexGrow: 1,
    mb: 0,
  }),
  eventSelector: css({
    background: "var(--grey-800)",
    padding: "0.75rem 1rem",
  }),
  selectLabel: css({
    color: "var(--color-white)",
    fontSize: "0.875rem",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  }),
  select: css({
    padding: "0.5rem 0.75rem",
    border: "2px solid var(--overlay-white-30)",
    borderRadius: "4px",
    background: "var(--overlay-black-40)",
    color: "var(--color-white)",
    fontSize: "0.875rem",
    outline: "none",
    cursor: "pointer",
    flexGrow: 1,
    width: '10px',
    maxWidth: "400px",
  }),
  noEvent: css({
    flexGrow: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-black)",
    color: "var(--color-white)",
  }),
  noEvents: css({
    color: "var(--overlay-white-70)",
    textAlign: "center",
    padding: "1rem",
  }),
  link: css({
    color: "var(--color-white)",
    textDecoration: "underline",
  }),
  cameraArea: css({
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--color-black)",
    overflow: 'hidden',
  }),
  cameraPlaceholder: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--overlay-black-30)",
    flexGrow: 1,
  }),
  startCameraBtn: css({
    padding: "1rem 2rem",
    border: "3px double var(--color-white)",
    background: "var(--overlay-white-15)",
    color: "var(--color-white)",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "1.125rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    _hover: { background: "var(--overlay-white-25)" },
  }),
  videoWrapper: css({
    position: "relative",
    overflow: "hidden",
    background: "var(--color-black)",
  }),
  video: css({
    width: "100%",
    height: "100%",
    display: "block",
    objectFit: "cover",
  }),
  overlayScan: css({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  }),
  scanRegionBorder: css({
    position: "absolute",
    top: "10%",
    left: "10%",
    width: "80%",
    height: "80%",
    border: "2px solid var(--overlay-white-50)",
    borderRadius: "12px",
    pointerEvents: "none",
    boxShadow: "0 0 0 9999px var(--overlay-black-25)",
  }),
  checkedInSection: css({
    padding: "1rem",
    borderTop: "1px solid var(--overlay-white-15)",
    background: "var(--grey-800)",
  }),
  checkedInTitle: css({
    color: "var(--color-white)",
    fontSize: "0.875rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    margin: "0 0 0.5rem 0",
  }),
  checkedInList: css({
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    minHeight: "27px",
  }),
  checkedInChip: css({
    background: "var(--overlay-white-15)",
    color: "var(--color-white)",
    padding: "0.25rem 0.75rem",
    borderRadius: "999px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  }),
  toast: css({
    position: "fixed",
    top: "50%",
    left: "50%",
    translate: "-50% -50%",
    background: "var(--overlay-black-80)",
    color: "var(--color-white)",
    padding: "0.75rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    zIndex: 1000,
    animation: "fadeIn 0.2s ease",
  }),
  confirmContent: css({
    textAlign: "center",
  }),
  confirmText: css({
    fontSize: "1rem",
    lineHeight: 1.5,
    margin: "0 0 1.25rem 0",
  }),
  confirmActions: css({
    display: "flex",
    justifyContent: "center",
    gap: "0.75rem",
  }),
};
