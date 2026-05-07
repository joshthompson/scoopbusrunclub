import { createSignal, onMount, onCleanup, type Accessor } from 'solid-js';

interface MenuNavOpts {
  onBack?: () => void;
  /**
   * Grid navigation: items in [gridStart, gridStart+gridCount) form a grid.
   * Up/Down move by row, Left/Right move within the row.
   * Items outside the grid range are navigated linearly with Up/Down.
   */
  gridStart?: number;
  gridCount?: Accessor<number>;
  gridCols?: Accessor<number>;
}

/**
 * Keyboard + gamepad navigation for menu screens.
 *
 * Keyboard: W/Up = up, S/Down = down, A/Left = left, D/Right = right,
 *           Enter = confirm, Escape = back.
 * Gamepad:  D-pad/left analog, X (button 0) = confirm, O (button 1) = back,
 *           Options/Start (button 9) = confirm.
 */
export function useMenuNav(count: Accessor<number>, opts?: MenuNavOpts) {
  const [focusedIndex, setFocusedIndex] = createSignal(0);
  let rafId: number | null = null;
  let prevButtons: boolean[] = [];
  let gpAxisHeldV = false;
  let gpAxisHeldH = false;

  function getGrid() {
    if (opts?.gridCols == null || opts?.gridCount == null) return null;
    const cols = opts.gridCols();
    const gridCount = opts.gridCount();
    const start = opts.gridStart ?? 0;
    if (cols <= 0 || gridCount <= 0) return null;
    return { start, count: gridCount, cols };
  }

  function moveUp() {
    const n = count();
    if (n === 0) return;
    const grid = getGrid();
    const idx = focusedIndex();

    if (grid) {
      const { start, count: gc, cols } = grid;
      const end = start + gc;
      if (idx >= start && idx < end) {
        // Inside grid
        const gridIdx = idx - start;
        const row = Math.floor(gridIdx / cols);
        const col = gridIdx % cols;
        if (row > 0) {
          // Move up within grid
          setFocusedIndex(start + (row - 1) * cols + col);
        } else {
          // First row → item before grid (or wrap)
          setFocusedIndex(start > 0 ? start - 1 : (n - 1));
        }
        return;
      }
      if (idx === start && start > 0) {
        setFocusedIndex(start - 1);
        return;
      }
      // Below grid → go to last row, same-ish column
      if (idx >= end) {
        const lastRowStart = start + Math.floor((gc - 1) / cols) * cols;
        const lastRowLen = gc - (lastRowStart - start);
        const belowIdx = idx - end;
        const col = Math.min(belowIdx, lastRowLen - 1);
        setFocusedIndex(lastRowStart + col);
        return;
      }
    }
    // Linear fallback
    setFocusedIndex((i) => (i - 1 + n) % n);
  }

  function moveDown() {
    const n = count();
    if (n === 0) return;
    const grid = getGrid();
    const idx = focusedIndex();

    if (grid) {
      const { start, count: gc, cols } = grid;
      const end = start + gc;
      if (idx >= start && idx < end) {
        // Inside grid
        const gridIdx = idx - start;
        const row = Math.floor(gridIdx / cols);
        const col = gridIdx % cols;
        const nextRowStart = (row + 1) * cols;
        if (nextRowStart < gc) {
          // Move down within grid, clamp col to row length
          const nextRowLen = Math.min(cols, gc - nextRowStart);
          setFocusedIndex(start + nextRowStart + Math.min(col, nextRowLen - 1));
        } else {
          // Last row → first item after grid (or wrap)
          setFocusedIndex(end < n ? end : 0);
        }
        return;
      }
      // Above grid → go to first row
      if (idx < start) {
        setFocusedIndex(start);
        return;
      }
    }
    // Linear fallback
    setFocusedIndex((i) => (i + 1) % n);
  }

  function moveLeft() {
    const n = count();
    if (n === 0) return;
    const grid = getGrid();
    const idx = focusedIndex();

    if (grid) {
      const { start, count: gc } = grid;
      const end = start + gc;
      if (idx >= start && idx < end) {
        // Inside grid: move linearly left, wrapping rows
        const gridIdx = idx - start;
        if (gridIdx > 0) {
          setFocusedIndex(idx - 1);
        } else {
          // At first grid item → go to item before grid (or wrap to last)
          setFocusedIndex(start > 0 ? start - 1 : start + gc - 1);
        }
        return;
      }
    }
    // Linear: treat same as up
    setFocusedIndex((i) => (i - 1 + n) % n);
  }

  function moveRight() {
    const n = count();
    if (n === 0) return;
    const grid = getGrid();
    const idx = focusedIndex();

    if (grid) {
      const { start, count: gc } = grid;
      const end = start + gc;
      if (idx >= start && idx < end) {
        // Inside grid: move linearly right, wrapping rows
        const gridIdx = idx - start;
        if (gridIdx < gc - 1) {
          setFocusedIndex(idx + 1);
        } else {
          // At last grid item → go to item after grid (or wrap to first)
          setFocusedIndex(end < n ? end : start);
        }
        return;
      }
    }
    // Linear: treat same as down
    setFocusedIndex((i) => (i + 1) % n);
  }

  function onKeyDown(e: KeyboardEvent) {
    const n = count();
    if (n === 0) return;

    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      moveUp();
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      moveDown();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      moveLeft();
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      moveRight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const el = document.querySelector('.menu-focused') as HTMLElement | null;
      el?.click();
    } else if (e.key === 'Escape') {
      if (opts?.onBack) {
        e.preventDefault();
        opts.onBack();
      }
    }
  }

  function pollGamepad() {
    const n = count();
    const gamepads = navigator.getGamepads();
    let gp: Gamepad | null = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]?.connected) { gp = gamepads[i]; break; }
    }

    if (gp && n > 0) {
      // Vertical: D-pad / left analog
      const leftY = gp.axes[1] ?? 0;
      const dpadUp = gp.buttons[12]?.pressed ?? false;
      const dpadDown = gp.buttons[13]?.pressed ?? false;
      const up = leftY < -0.5 || dpadUp;
      const down = leftY > 0.5 || dpadDown;

      if (up && !gpAxisHeldV) {
        moveUp();
        gpAxisHeldV = true;
      } else if (down && !gpAxisHeldV) {
        moveDown();
        gpAxisHeldV = true;
      } else if (!up && !down) {
        gpAxisHeldV = false;
      }

      // Horizontal: D-pad / left analog
      const leftX = gp.axes[0] ?? 0;
      const dpadLeft = gp.buttons[14]?.pressed ?? false;
      const dpadRight = gp.buttons[15]?.pressed ?? false;
      const left = leftX < -0.5 || dpadLeft;
      const right = leftX > 0.5 || dpadRight;

      if (left && !gpAxisHeldH) {
        moveLeft();
        gpAxisHeldH = true;
      } else if (right && !gpAxisHeldH) {
        moveRight();
        gpAxisHeldH = true;
      } else if (!left && !right) {
        gpAxisHeldH = false;
      }

      // X button (0) = confirm, Options/Start (9) = confirm
      const xPressed = (gp.buttons[0]?.pressed ?? false) && !prevButtons[0];
      const startPressed = (gp.buttons[9]?.pressed ?? false) && !prevButtons[9];
      if (xPressed || startPressed) {
        const el = document.querySelector('.menu-focused') as HTMLElement | null;
        el?.click();
      }

      // O button (1) = back
      const oPressed = (gp.buttons[1]?.pressed ?? false) && !prevButtons[1];
      if (oPressed && opts?.onBack) {
        opts.onBack();
      }

      prevButtons = gp.buttons.map((b) => b.pressed);
    }

    rafId = requestAnimationFrame(pollGamepad);
  }

  onMount(() => {
    window.addEventListener('keydown', onKeyDown);
    rafId = requestAnimationFrame(pollGamepad);
  });
  onCleanup(() => {
    window.removeEventListener('keydown', onKeyDown);
    if (rafId !== null) cancelAnimationFrame(rafId);
  });

  function isFocused(index: number) {
    return focusedIndex() === index;
  }

  return { focusedIndex, setFocusedIndex, isFocused };
}
