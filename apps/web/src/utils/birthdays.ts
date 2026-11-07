import { createSignal } from 'solid-js'

/**
 * Whose birthday it is, said by hand. The members' real birthdays come from
 * their own data when the header is set up; this is for flying the plane on any
 * other day.
 */
const [birthday, setBirthdayName] = createSignal<string>()
export { birthday }

/** Fly the birthday plane for `name`, whatever the date. */
export function setBirthday(name: string) {
	setBirthdayName(name)
}

declare global {
	interface Window {
		setBirthday: (name: string) => string
	}
}

/**
 * `setBirthday('Keith')` from the browser console to send the birthday plane
 * over for Keith, in place of whoever's it is today. Any name does, member or
 * not. Sticks until reload.
 */
if (typeof window !== 'undefined') {
	window.setBirthday = (name: string) => {
		setBirthday(name)
		return `birthday: ${name}`
	}
}
