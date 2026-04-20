import { createSignal, type JSX, Show, onCleanup, onMount } from "solid-js"
import { Portal } from "solid-js/web"
import { css } from "@style/css"

interface AdminDropdownProps {
  trigger?: string
  children: JSX.Element
}

export function AdminDropdown(props: AdminDropdownProps) {
  const [open, setOpen] = createSignal(false)
  const [pos, setPos] = createSignal({ top: 0, left: 0 })
  let triggerRef: HTMLButtonElement | undefined
  let menuRef: HTMLDivElement | undefined

  const handleClickOutside = (e: MouseEvent) => {
    if (
      triggerRef && !triggerRef.contains(e.target as Node) &&
      menuRef && !menuRef.contains(e.target as Node)
    ) {
      setOpen(false)
    }
  }

  const updatePosition = () => {
    if (!triggerRef) return
    const rect = triggerRef.getBoundingClientRect()
    setPos({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX })
  }

  onMount(() => document.addEventListener("click", handleClickOutside))
  onCleanup(() => document.removeEventListener("click", handleClickOutside))

  return (
    <span class={styles.wrapper}>
      <button
        ref={triggerRef}
        class={styles.trigger}
        onClick={() => {
          updatePosition()
          setOpen(!open())
        }}
      >
        {props.trigger ?? "⋮"}
      </button>
      <Show when={open()}>
        <Portal>
          <div
            ref={menuRef}
            class={styles.menu}
            style={{ top: `${pos().top}px`, left: `${pos().left}px` }}
            onClick={() => setOpen(false)}
          >
            {props.children}
          </div>
        </Portal>
      </Show>
    </span>
  )
}

interface AdminDropdownItemProps {
  onClick: () => void
  children: JSX.Element
}

export function AdminDropdownItem(props: AdminDropdownItemProps) {
  return (
    <button class={styles.item} onClick={props.onClick}>
      {props.children}
    </button>
  )
}

const styles = {
  wrapper: css({
    position: "relative",
    display: "inline-block",
  }),
  trigger: css({
    background: "none",
    border: "none",
    fontWeight: "bold",
    fontSize: "1.25rem",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
    lineHeight: 1,

    _hover: {
      background: "rgba(0,0,0,0.1)",
      borderRadius: "4px",
    }
  }),
  menu: css({
    position: "absolute",
    transform: "translateX(-100%)",
    zIndex: 10000,
    background: "var(--grey-800)",
    cornerShape: "notch",
    borderRadius: "4px",
    display: "flex",
    flexDirection: "column",
    minWidth: "100px",
    overflow: "hidden",
  }),
  item: css({
    background: "none",
    border: "none",
    color: "var(--color-white)",
    fontSize: "0.8rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "inherit",
    cornerShape: "inherit",
    cursor: "pointer",
    textAlign: "left",
    _hover: {
      background: "var(--overlay-white-10)",
    },
  }),
}
