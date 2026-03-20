import {
  type Component,
  createSignal,
  For,
  Show,
  createMemo,
} from "solid-js";
import { css } from "@style/css";
import { runners, type RunnerName } from "@/data/runners";
import type { Race, RaceAttendee } from "@/utils/adminApi";
import { AdminModal } from "@/components/admin/AdminModal";
import { AdminInput } from "@/components/admin/AdminInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { AdminButton } from "@/components/admin/AdminButton";
import qrIconAsset from "@/assets/misc/qr.png";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { EVENT_TYPES } from "./EventsPage";

/** Validate time string: accepts h:mm:ss, hh:mm:ss, m:ss, mm:ss */
const TIME_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/;

function isValidTime(v: string): boolean {
  return v === "" || TIME_RE.test(v);
}

interface EventModalProps {
  race: Race | null;
  /** When true, treat as a new event even if race data is provided (for duplication) */
  isNew?: boolean;
  onSave: (data: {
    date: string;
    name: string;
    website?: string;
    type?: string;
    attendees: RaceAttendee[];
    majorEvent?: boolean;
    public: boolean;
  }) => void;
  onClose: () => void;
}

const allRunnerKeys = Object.keys(runners) as RunnerName[];

export const EventModal: Component<EventModalProps> = (props) => {
  const race = props.race;

  const [date, setDate] = createSignal(race?.date ?? "");
  const [name, setName] = createSignal(race?.name ?? "");
  const [website, setWebsite] = createSignal(race?.website ?? "");
  const [type, setType] = createSignal(race?.type ?? "");
  const [isMajorEvent, setIsMajorEvent] = createSignal(race?.majorEvent ?? false);
  const [isPublic, setIsPublic] = createSignal(race?.public ?? true);
  const [attendees, setAttendees] = createSignal<RaceAttendee[]>(
    race?.attendees ?? []
  );
  const [saving, setSaving] = createSignal(false);

  // Local string state for each attendee's numeric/text inputs to avoid losing focus
  const initStrings = (race?.attendees ?? []).map((a) => ({
    position: a.position != null ? String(a.position) : "",
    time: a.time ?? "",
    distance: a.distance != null ? String(a.distance) : "",
    laps: a.laps != null ? String(a.laps) : "",
  }));
  const [fieldStrings, setFieldStrings] = createSignal<
    { position: string; time: string; distance: string; laps: string }[]
  >(initStrings);

  const availableRunners = createMemo(() => {
    const used = new Set(attendees().map((a) => a.runnerId));
    return allRunnerKeys.filter((k) => !used.has(k));
  });

  const addAttendee = (runnerId: string) => {
    if (!runnerId) return;
    setAttendees((prev) => [...prev, { runnerId }]);
    setFieldStrings((prev) => [...prev, { position: "", time: "", distance: "", laps: "" }]);
  };

  const removeAttendee = (index: number) => {
    const att = attendees()[index];
    const displayName = runnerDisplayName(att?.runnerId ?? "");
    if (!confirm(`Remove ${displayName} from this event?`)) return;
    setAttendees((prev) => prev.filter((_, i) => i !== index));
    setFieldStrings((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFieldString = (
    index: number,
    field: "position" | "time" | "distance" | "laps",
    value: string
  ) => {
    setFieldStrings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const runnerDisplayName = (runnerId: string): string => {
    const r = runners[runnerId as RunnerName];
    if (r) return r[0]().name;
    return runnerId;
  };

  /** Build attendees array from local string state, returns null if validation fails */
  const buildAttendees = (): RaceAttendee[] | null => {
    const strings = fieldStrings();
    const atts = attendees();
    const result: RaceAttendee[] = [];

    for (let i = 0; i < atts.length; i++) {
      const s = strings[i] ?? { position: "", time: "", distance: "", laps: "" };
      const entry: RaceAttendee = { runnerId: atts[i].runnerId };

      // Preserve scanned flag
      if (atts[i].scanned) entry.scanned = true;

      // Position: integer
      if (s.position !== "") {
        const n = Number(s.position);
        if (!Number.isFinite(n) || n < 0) return null;
        entry.position = Math.round(n);
      }

      // Time: string in hh:mm:ss / mm:ss format
      if (s.time !== "") {
        if (!isValidTime(s.time)) return null;
        entry.time = s.time;
      }

      // Distance: decimal number
      if (s.distance !== "") {
        const n = Number(s.distance);
        if (!Number.isFinite(n) || n < 0) return null;
        entry.distance = n;
      }

      // Laps: integer
      if (s.laps !== "") {
        const n = Number(s.laps);
        if (!Number.isFinite(n) || n < 0) return null;
        entry.laps = Math.round(n);
      }

      result.push(entry);
    }
    return result;
  };

  const isFormValid = createMemo(() => {
    if (!date() || !name()) return false;
    return buildAttendees() !== null;
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const builtAttendees = buildAttendees();
    if (!date() || !name() || !builtAttendees) return;
    setSaving(true);
    try {
      props.onSave({
        date: date(),
        name: name(),
        website: website() || undefined,
        type: type() || undefined,
        attendees: builtAttendees,
        majorEvent: isMajorEvent() || undefined,
        public: isPublic(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal title={race && !props.isNew ? "Edit Event" : "New Event"} onClose={props.onClose} maxWidth="580px">
      <form onSubmit={handleSubmit} class={styles.form}>
        <div class={styles.row2}>
          <AdminInput
            label="Name"
            type="text"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="e.g. Rome Marathon"
            required
          />
          <AdminInput
            label="Date"
            type="date"
            value={date()}
            onInput={(e) => setDate(e.currentTarget.value)}
            required
          />
        </div>

        <div class={styles.row2}>
          <AdminInput
            label="Website"
            type="url"
            value={website()}
            onInput={(e) => setWebsite(e.currentTarget.value)}
            placeholder="https://..."
          />
          <AdminSelect
            label="Type"
            value={type()}
            onChange={(e) => setType(e.currentTarget.value)}
          >
            <option value="">— None —</option>
            <For each={EVENT_TYPES}>
              {(group) =>
                <optgroup label={group.groupName}>
                  <For each={group.types}>
                    {(type) => <option value={type}>{type}</option>}
                  </For>
                </optgroup>
              }
            </For>
          </AdminSelect>
        </div>

        <Checkbox
          label="Public (visible on the site)"
          checked={isPublic()}
          onChange={(e) => setIsPublic(e.currentTarget.checked)}
        />

        <Checkbox
          label="Race Calendar (tick this for major events)"
          checked={isMajorEvent()}
          onChange={(e) => setIsMajorEvent(e.currentTarget.checked)}
        />

        {/* Attendees */}
        <div class={styles.section}>
          <div class={styles.sectionHeader}>
            <span>Attendees ({attendees().length})</span>
            <Show when={availableRunners().length > 0}>
              <AdminSelect
                onChange={(e) => {
                  addAttendee(e.currentTarget.value);
                  e.currentTarget.value = "";
                }}
              >
                <option value="">+ Add runner…</option>
                <For each={availableRunners()}>
                  {(key) => (
                    <option value={key}>
                      {runnerDisplayName(key)}
                    </option>
                  )}
                </For>
              </AdminSelect>
            </Show>
          </div>

          <Show when={attendees().length > 0}>
            <div class={styles.attendeeList}>
              <For each={attendees()}>
                {(att, idx) => (
                  <div class={styles.attendeeRow}>
                    <AdminAvatar user={att.runnerId} size="medium" />
                    <span class={styles.attendeeName}>
                      {runnerDisplayName(att.runnerId)}
                      <Show when={att.scanned}>
                        <span class={styles.scannedIcon} title="Scanned via barcode">
                          <img src={qrIconAsset} alt="Scanned via barcode" width={12} height={12} />
                        </span>
                      </Show>
                    </span>
                    <div class={styles.attendeeFields}>
                      <AdminInput
                        type="number"
                        placeholder="Pos"
                        value={fieldStrings()[idx()]?.position ?? ""}
                        onInput={(e) =>
                          updateFieldString(idx(), "position", e.currentTarget.value)
                        }
                        size="small"
                        width="60px"
                      />
                      <AdminInput
                        type="text"
                        placeholder="hh:mm:ss"
                        value={fieldStrings()[idx()]?.time ?? ""}
                        onInput={(e) =>
                          updateFieldString(idx(), "time", e.currentTarget.value)
                        }
                        size="small"
                        width="80px"
                      />
                      <AdminInput
                        type="text"
                        placeholder="Distance"
                        value={fieldStrings()[idx()]?.distance ?? ""}
                        onInput={(e) =>
                          updateFieldString(idx(), "distance", e.currentTarget.value)
                        }
                        size="small"
                        width="70px"
                      />
                      <AdminInput
                        type="number"
                        placeholder="Laps"
                        value={fieldStrings()[idx()]?.laps ?? ""}
                        onInput={(e) =>
                          updateFieldString(idx(), "laps", e.currentTarget.value)
                        }
                        size="small"
                        width="60px"
                      />
                    </div>
                    <button
                      type="button"
                      class={styles.removeBtn}
                      onClick={() => removeAttendee(idx())}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        <div class={styles.actions}>
          <AdminButton onClick={props.onClose} variant="secondary">Cancel</AdminButton>
          <AdminButton
            type="submit"
            disabled={saving() || !isFormValid()}
          >
            {saving() ? "Saving…" : race && !props.isNew ? "Update" : "Create"}
          </AdminButton>
        </div>
      </form>
    </AdminModal>
  );
};

const styles = {
  form: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.875rem",
    textAlign: "left",
  }),
  row2: css({
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    maxWidth: "100%",
    overflow: "hidden",
    '& > *': { flex: "1 1 200px" },
  }),
  section: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  }),
  sectionHeader: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  }),
  attendeeList: css({
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
  }),
  attendeeRow: css({
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "rgba(0,0,0,0.15)",
    borderRadius: "4px",
    padding: "0.25rem 28px 0.25rem 0.5rem",
    position: "relative",
    flexWrap: "wrap",
  }),
  attendeeName: css({
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: "bold",
    minWidth: "80px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  }),
  attendeeFields: css({
    display: "flex",
    alignItems: "center",
    gap: "0.375rem",
    flexWrap: "wrap",
    flex: "1 1 auto",
  }),
  scannedIcon: css({
    fontSize: "0.7rem",
    filter: "invert(100%) sepia(100%) grayscale(100%) brightness(150%)",
    ml: "0.25rem",
  }),
  smallInput: css({
    width: "55px",
    padding: "0.25rem 0.375rem",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "3px",
    background: "rgba(0,0,0,0.3)",
    color: "#fff",
    fontSize: "0.75rem",
    outline: "none",
    textAlign: "center",
  }),
  removeBtn: css({
    position: "absolute",
    top: "4px",
    right: "4px",
    background: "transparent",
    border: "none",
    color: "black",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "1rem",
    padding: "0.125rem 0.375rem",
    borderRadius: "3px",
    flexShrink: 0,
    _hover: { background: "rgba(0,0,0,0.2)" },
  }),
  actions: css({
    display: "flex",
    justifyContent: "flex-end",
    gap: "0.75rem",
    marginTop: "0.5rem",
  }),
  cancelBtn: css({
    padding: "0.5rem 1.25rem",
    border: "2px solid rgba(255,255,255,0.3)",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    _hover: { background: "rgba(255,255,255,0.1)" },
  }),
  saveBtn: css({
    padding: "0.5rem 1.25rem",
    border: "3px double #fff",
    background: "rgba(255,255,255,0.15)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "0.8rem",
    textTransform: "uppercase",
    borderRadius: "4px",
    _hover: { background: "rgba(255,255,255,0.25)" },
    _disabled: { opacity: 0.5, cursor: "default" },
  }),
};
