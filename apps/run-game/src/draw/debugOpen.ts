import { createSignal } from 'solid-js'

/**
 * Whether the debug menu's open (see `DebugMenu`): the pause menu and the
 * pause's shade are hidden under it, so it's the game that's seen. Here, on
 * its own, so they needn't load the menu, which is the dev server's only.
 */
export const [debugMenuOpen, setDebugMenuOpen] = createSignal(false)
