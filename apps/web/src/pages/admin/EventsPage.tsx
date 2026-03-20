import {
  type Component,
  createSignal,
  createResource,
  Show,
  createMemo,
  For,
} from "solid-js";
import { css, cx } from "@style/css";
import { DirtBlock } from "@/components/ui/DirtBlock";
import {
  fetchRaces,
  createRace,
  updateRace,
  deleteRace,
  type Race,
  type RaceAttendee,
} from "@/utils/adminApi";
import { runners, type RunnerName } from "@/data/runners";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminToolbar } from "@/components/admin/AdminToolbar";
import { AdminButton } from "@/components/admin/AdminButton";
import { AdminDropdown, AdminDropdownItem } from "@/components/admin/AdminDropdown";
import { Checkbox } from "@/components/ui/Checkbox";
import { EventModal } from "./EventModal";
import { AdminAvatar } from "@/components/admin/AdminAvatar";
import { AdminTooltip } from "@/components/admin/AdminTooltip";
import { Icon } from "@/components/ui/Icon";

type SortKey = "date" | "name" | "attendees" | "public";
type SortDir = "asc" | "desc";

export const EventsPage: Component = () => {
  const [includeOld, setIncludeOld] = createSignal(false);
  const [races, { refetch }] = createResource(
    () => ({ includeOld: includeOld() }),
    (opts) => fetchRaces(opts.includeOld)
  );

  const [sortKey, setSortKey] = createSignal<SortKey>("date");
  const [sortDir, setSortDir] = createSignal<SortDir>("asc");

  const [modalOpen, setModalOpen] = createSignal(false);
  const [editingRace, setEditingRace] = createSignal<Race | null>(null);
  const [duplicating, setDuplicating] = createSignal(false);

  const sortedRaces = createMemo(() => {
    const list = races() ?? [];
    const key = sortKey();
    const dir = sortDir();
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (key) {
        case "date":
          cmp = a.date.localeCompare(b.date);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "attendees":
          cmp = a.attendees.length - b.attendees.length;
          break;
        case "public":
          cmp = Number(a.public) - Number(b.public);
          break;
      }
      return dir === "asc" ? cmp : -cmp;
    });
  });

  const runnerDisplayName = (runnerId: string): string => {
    const r = runners[runnerId as RunnerName];
    if (r) return r[0]().name;
    return runnerId;
  };

  const handleCreate = () => {
    setEditingRace(null);
    setDuplicating(false);
    setModalOpen(true);
  };

  const handleEdit = (race: Race) => {
    setEditingRace(race);
    setDuplicating(false);
    setModalOpen(true);
  };

  const handleDuplicate = (race: Race) => {
    setEditingRace(race);
    setDuplicating(true);
    setModalOpen(true);
  };

  const handleDelete = async (race: Race) => {
    if (!confirm(`Delete "${race.name}" on ${race.date}?`)) return;
    await deleteRace(race._id);
    refetch();
  };

  const handleSave = async (data: {
    date: string;
    name: string;
    website?: string;
    type?: string;
    attendees: RaceAttendee[];
    majorEvent?: boolean;
    public: boolean;
  }) => {
    const editing = editingRace();
    if (editing && !duplicating()) {
      await updateRace(editing._id, data);
    } else {
      await createRace(data);
    }
    setModalOpen(false);
    refetch();
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <AdminToolbar>
        <AdminButton onClick={handleCreate}>+ New Event</AdminButton>
        <Checkbox
          label="View older events"
          checked={includeOld()}
          onChange={(e) => setIncludeOld(e.currentTarget.checked)}
          variant="green"
        />
      </AdminToolbar>

      <DirtBlock title="Events">
        <Show
          when={!races.loading}
          fallback={<p class={styles.emptyText}>Loading…</p>}
        >
          <AdminTable
            columns={[
              { id: "date", title: "Date", sortable: true },
              { id: "name", title: "Name", sortable: true },
              { id: "type", title: "Type", sortable: true },
              { id: "attendees", title: "Attendees", sortable: true },
              { id: "public", title: "Public", sortable: true },
              { id: "major", title: "Calendar", sortable: true },
              { id: "actions", title: "Actions", width: '10px' },
            ]}
            data={(sortedRaces() ?? []).map(race => [
              formatDate(race.date),
              <>
                {race.name}
                <Show when={race.website}>
                  &nbsp;&nbsp;<a href={race.website} target="_blank" rel="noopener">
                    <Icon name="external" alt={`${race.name} Website`} size="small" />
                  </a>
                </Show>
              </>,
              
              race.type ?? '—',
              <span title={race.attendees.map((a) => runnerDisplayName(a.runnerId)).join(", ")}>
                <For each={race.attendees}>
                  {(att) =>
                    <AdminTooltip content={runnerDisplayName(att.runnerId)}>
                      <AdminAvatar user={att.runnerId} size="small" title={runnerDisplayName(att.runnerId)} />
                    </AdminTooltip>
                  }
                </For>
              </span>,
              race.public ? "✓" : "✗",
              race.majorEvent ? "✓" : "✗",
              <AdminDropdown>
                <AdminDropdownItem onClick={() => handleEdit(race)}>Edit</AdminDropdownItem>
                <AdminDropdownItem onClick={() => handleDuplicate(race)}>Duplicate</AdminDropdownItem>
                <AdminDropdownItem onClick={() => handleDelete(race)}>Delete</AdminDropdownItem>
              </AdminDropdown>,
            ])}
            empty="No events found."
            sortKey={sortKey()}
            sortDir={sortDir()}
            onSortChange={(key, dir) => {
              setSortKey(key as SortKey)
              setSortDir(dir)
            }}
            onDoubleClick={(n) => handleEdit(sortedRaces()[n])}
          />
        </Show>
      </DirtBlock>

      <Show when={modalOpen()}>
        <EventModal
          race={editingRace()}
          isNew={duplicating()}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      </Show>
    </div>
  );
};

const styles = {
  link: css({
    textDecoration: "underline",
  }),
  actions: css({
    display: "flex",
    gap: "4px",
  }),
  emptyText: css({
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    padding: "2rem",
  }),
};
