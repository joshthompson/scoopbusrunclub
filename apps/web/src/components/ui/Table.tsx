import { css, cva } from '@style/css';
import { For, JSX, Show } from 'solid-js'

export interface TableColumn {
  id?: string;
  title: string;
  sortable?: boolean;
  width?: string;
} 

export function Table(props: {
  columns: TableColumn[];
  data: JSX.Element[][];
  empty?: JSX.Element;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  onDoubleClick?: (index: number) => void;
}) {
  return (
    <Show
      when={props.data.length > 0 || props.empty === undefined}
      fallback={<div class={styles.empty}>{props.empty}</div>}
    >
      <div class={styles.wrapper}>
        <table class={styles.table}>
          <thead>
            <tr>
              <For each={props.columns}>
                {(column) => <th
                  class={styles.headerCell({ sortable: column.sortable })}
                  style={{ width: column.width ?? undefined }}
                  onClick={() => {
                    if (!column.sortable || !props.onSortChange) return;
                    const newDir =
                      props.sortKey === column.id && props.sortDir === 'asc'
                        ? 'desc'
                        : 'asc'
                    props.onSortChange(column.id || column.title, newDir)
                  }}
                >
                  {column.title}
                  {column.sortable && props.sortKey === (column.id || column.title) && (
                    <span class={styles.sortIndicator}>
                      {props.sortDir === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </th>
                }
              </For>
            </tr>
          </thead>
          <tbody>
            <For each={props.data}>
              {(row, n) => (
                <tr class={styles.row} onDblClick={() => props.onDoubleClick?.(n())}>
                  <For each={row}>
                    {(cell) => <td class={styles.cell}>{cell}</td>}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  )
}

const styles = {
  wrapper: css({
    overflowX: "auto",
  }),
  empty: css({
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
  }),
  table: css({
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
    textAlign: "left",
  }),
  headerCell: cva({
    base: {
      textAlign: "left",
      padding: "0.5rem 0.75rem",
      borderBottom: "2px solid var(--overlay-black-20)",
      fontWeight: "bold",
      textTransform: "uppercase",
      fontSize: "0.75rem",
      letterSpacing: "0.05em",
    },
    variants: {
      sortable: {
        true: {
          cursor: "pointer",
          _hover: { background: "var(--overlay-black-5)" },
        },
      },
    },
  }),
  row: css({
    _hover: { background: "var(--overlay-black-5)" },
  }),
  cell: css({
    padding: "0.5rem 0.75rem",
    borderBottom: "1px solid var(--overlay-black-10)",
    verticalAlign: "middle",
  }),
  sortIndicator: css({
    marginLeft: "0.25rem",
    fontSize: "0.6rem",
    width: "0.6rem",
    marginRight: '-0.85rem',
  }),
}
