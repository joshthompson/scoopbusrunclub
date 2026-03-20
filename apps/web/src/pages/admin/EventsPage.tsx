import {
  type Component,
  createSignal,
  createResource,
  Show,
  createMemo,
  For,
} from "solid-js";
import { css } from "@style/css";
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
import { AdminSelect } from "@/components/admin/AdminSelect";
import { AdminInput } from "@/components/admin/AdminInput";
import { Icon } from "@/components/ui/Icon";

export const EVENT_TYPES = [
  {
    groupName: "Social",
    types: ["Track and Food", "Other Social"],
  },
  {
    groupName: "Race",
    types: ["Marathon", "Half Marathon", "Ultra", "Other"],
  },
  {
    groupName: "Misc",
    types: ["Parkrun Test Event", "5 вёрст", "Other"],
  },
] as const;

type SortKey = "date" | "name" | "type" | "attendees" | "public" | "major";
type SortDir = "asc" | "desc";
type EventDateFilter = "all" | "past" | "upcoming";

const allRunnerKeys = Object.keys(runners) as RunnerName[];

export const EventsPage: Component = () => {
  const [sortKey, setSortKey] = createSignal<SortKey>("date");
  const [sortDir, setSortDir] = createSignal<SortDir>("asc");

  // Filters
  const [filterType, setFilterType] = createSignal("");
  const [filterCalendar, setFilterCalendar] = createSignal("");
  const [filterPublic, setFilterPublic] = createSignal("");
  const [filterAttendee, setFilterAttendee] = createSignal("");
  const [filterEventDate, setFilterEventDate] = createSignal<EventDateFilter>("upcoming");
  const [searchName, setSearchName] = createSignal("");

  const [races, { refetch }] = createResource(
    () => ({ includeOld: filterEventDate() !== "upcoming" }),
    (opts) => fetchRaces(opts.includeOld)
  );

  const [filtersOpen, setFiltersOpen] = createSignal(window.innerWidth > 900);
  const [modalOpen, setModalOpen] = createSignal(false);
  const [editingRace, setEditingRace] = createSignal<Race | null>(null);
  const [duplicating, setDuplicating] = createSignal(false);

  const filteredRaces = createMemo(() => {
    let list = races() ?? [];

    const typeVal = filterType();
    if (typeVal) list = list.filter((r) => (r.type ?? "") === typeVal);

    const calVal = filterCalendar();
    if (calVal === "yes") list = list.filter((r) => r.majorEvent);
    else if (calVal === "no") list = list.filter((r) => !r.majorEvent);

    const pubVal = filterPublic();
    if (pubVal === "yes") list = list.filter((r) => r.public);
    else if (pubVal === "no") list = list.filter((r) => !r.public);

    const attendeeVal = filterAttendee();
    if (attendeeVal) list = list.filter((r) => r.attendees.some((a) => a.runnerId === attendeeVal));

    const eventDateVal = filterEventDate();
    if (eventDateVal !== "all") {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      if (eventDateVal === "past") {
        list = list.filter((r) => r.date < today);
      } else {
        list = list.filter((r) => r.date >= today);
      }
    }

    const search = searchName().toLowerCase().trim();
    if (search) list = list.filter((r) => r.name.toLowerCase().includes(search));

    return list;
  });

  const sortedRaces = createMemo(() => {
    const list = filteredRaces();
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
        case "type":
          cmp = (a.type ?? "").localeCompare(b.type ?? "");
          break;
        case "attendees":
          cmp = a.attendees.length - b.attendees.length;
          break;
        case "public":
          cmp = Number(a.public) - Number(b.public);
          break;
        case "major":
          cmp = Number(a.majorEvent ?? 0) - Number(b.majorEvent ?? 0);
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
          label="Show Filters"
          checked={filtersOpen()}
          onChange={() => setFiltersOpen((o) => !o)}
          variant="green"
        />
      </AdminToolbar>

      <DirtBlock title="Events">
        <Show
          when={!races.loading}
          fallback={<p class={styles.emptyText}>Loading…</p>}
        >
          <Show when={filtersOpen()}>
          <div class={styles.filters}>
            <AdminInput
              label="Search"
              size="small"
              placeholder="Event name…"
              value={searchName()}
              onInput={(e) => setSearchName(e.currentTarget.value)}
              width="160px"
            />
            <AdminSelect
              label="Type"
              size="small"
              value={filterType()}
              onChange={(e) => setFilterType(e.currentTarget.value)}
            >
              <option value="">All</option>
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
            <AdminSelect
              label="Public"
              size="small"
              value={filterPublic()}
              onChange={(e) => setFilterPublic(e.currentTarget.value)}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </AdminSelect>
            <AdminSelect
              label="Calendar"
              size="small"
              value={filterCalendar()}
              onChange={(e) => setFilterCalendar(e.currentTarget.value)}
            >
              <option value="">All</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </AdminSelect>
            <AdminSelect
              label="Attendee"
              size="small"
              value={filterAttendee()}
              onChange={(e) => setFilterAttendee(e.currentTarget.value)}
            >
              <option value="">All</option>
              <For each={allRunnerKeys}>
                {(key) => <option value={key}>{runnerDisplayName(key)}</option>}
              </For>
            </AdminSelect>
            <AdminSelect
              label="Event Date"
              size="small"
              value={filterEventDate()}
              onChange={(e) => setFilterEventDate(e.currentTarget.value as EventDateFilter)}
            >
              <option value="all">All</option>
              <option value="past">Past</option>
              <option value="upcoming">Upcoming (inc Today)</option>
            </AdminSelect>
          </div>
          </Show>
          
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
  filters: css({
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "0.5rem 0.5rem",
    marginBottom: "0.75rem",
    textAlign: "left",
    '& > *': {
      flex: "0 1 80px",
    },
  }),
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
