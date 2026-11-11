import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'

/**
 * What a custom runner's look is made of: every option the editor offers,
 * which is also what random runners on the course are made from.
 */

export type Avatar = CharacterSpriteProps
export type Head = Avatar['head']

/** A new runner's look before it's changed: the custom racer page's default. */
export const DEFAULT_AVATAR: Avatar = {
	topType: 'tshirt',
	bottomType: 'shorts',
	skin: 'light',
	topColor: '#2255cc',
	bottomColor: '#222222',
	showColor: '#2255cc',
	shoeColor: '#333333',
	head: {
		hair: 'short',
		hairColor: '#4a3222',
		topColorForNeck: false,
	},
}

/**
 * Kit colours: the website's palette, and enough else to make a club vest.
 * No greens like the grass, Haga's or Furby Fields': a runner in them
 * disappears into it. The green there is is a neon lime, which doesn't.
 */
export const KIT = [
	'#ffffff',
	'#9a9a9a',
	'#333333',
	'#222222',
	'#e0382f',
	'#ff8c1a',
	'#ffd23f',
	'#b8e02c',
	'#7a1f3d',
	'#5ae2ff',
	'#2255cc',
	'#8a4fd8',
	'#ff6fb0',
]

export const HAIR = [
	'#111111',
	'#4a3222',
	'#7a4a2a',
	'#a0522d',
	'#d0702a',
	'#e8c76a',
	'#f3e7c0',
	'#9a9a9a',
	'#ff6fb0',
	'#3a7bd5',
	'#b8e02c',
]

/** The "none" swatch, for socks. */
export const NONE = ''

/** One line of the form, which up and down move between. */
export type Row =
	| { kind: 'name' }
	| {
			kind: 'choice'
			label: string
			options: { value: string; label: string }[]
			get: (avatar: Avatar) => string
			set: (avatar: Avatar, value: string) => Avatar
			/** Only there when this is true: no hair colour for the bald. */
			show?: (avatar: Avatar) => boolean
	  }
	| {
			kind: 'colour'
			label: string
			palette: string[]
			get: (avatar: Avatar) => string
			set: (avatar: Avatar, value: string) => Avatar
			show?: (avatar: Avatar) => boolean
	  }

export const withHead = (avatar: Avatar, head: Partial<Head>): Avatar => ({
	...avatar,
	head: { ...avatar.head, ...head },
})

/**
 * Every row, made once so the list keeps its elements (and the name keeps its
 * focus) as the look changes and rows come and go.
 */
export const ROWS: Row[] = [
	{ kind: 'name' },
	{
		kind: 'choice',
		label: 'Skin',
		options: [
			{ value: 'light', label: 'Light' },
			{ value: 'medium-light', label: 'Medium light' },
			{ value: 'medium', label: 'Medium' },
			{ value: 'medium-dark', label: 'Medium dark' },
			{ value: 'dark', label: 'Dark' },
		],
		get: (a) => a.skin,
		set: (a, skin) => ({ ...a, skin: skin as Avatar['skin'] }),
	},
	{
		kind: 'choice',
		label: 'Hair',
		options: [
			{ value: '', label: 'Bald' },
			{ value: 'short', label: 'Short' },
			{ value: 'medium', label: 'Medium' },
			{ value: 'long', label: 'Long' },
		],
		get: (a) => a.head.hair ?? '',
		set: (a, hair) =>
			withHead(a, {
				hair: (hair || undefined) as Head['hair'],
				// Uncoloured hair is drawn black, which isn't what the swatch says.
				hairColor: a.head.hairColor ?? '#4a3222',
			}),
	},
	{
		kind: 'colour',
		label: 'Hair colour',
		palette: HAIR,
		get: (a) => a.head.hairColor ?? '#4a3222',
		set: (a, hairColor) => withHead(a, { hairColor }),
		show: (a) => !!a.head.hair,
	},
	{
		kind: 'choice',
		label: 'Facial hair',
		options: [
			{ value: '', label: 'None' },
			{ value: 'stubble', label: 'Stubble' },
			{ value: 'beard', label: 'Beard' },
			{ value: 'moustache', label: 'Moustache' },
			{ value: 'long', label: 'Long' },
		],
		get: (a) => a.head.facialHair ?? '',
		set: (a, facialHair) =>
			withHead(a, {
				facialHair: (facialHair || undefined) as Head['facialHair'],
			}),
	},
	{
		kind: 'colour',
		label: 'Beard colour',
		palette: HAIR,
		// Until it's picked, it's drawn in the hair's colour.
		get: (a) => a.head.facialHairColor ?? a.head.hairColor ?? '#111111',
		set: (a, facialHairColor) => withHead(a, { facialHairColor }),
		show: (a) => !!a.head.facialHair,
	},
	{
		kind: 'choice',
		label: 'Accessory',
		options: [
			{ value: '', label: 'None' },
			{ value: 'cap', label: 'Cap' },
			{ value: 'headband', label: 'Headband' },
			{ value: 'glasses', label: 'Glasses' },
		],
		get: (a) => a.head.accessory ?? '',
		set: (a, accessory) =>
			withHead(a, {
				accessory: (accessory || undefined) as Head['accessory'],
				accessoryColor: a.head.accessoryColor ?? '#e0382f',
			}),
	},
	{
		kind: 'colour',
		label: 'Its colour',
		palette: KIT,
		get: (a) => a.head.accessoryColor ?? '#e0382f',
		set: (a, accessoryColor) => withHead(a, { accessoryColor }),
		show: (a) => !!a.head.accessory,
	},
	{
		kind: 'choice',
		label: 'Top',
		options: [
			{ value: 'vest', label: 'Vest' },
			{ value: 'tshirt', label: 'T-shirt' },
			{ value: 'longsleeve', label: 'Long sleeve' },
		],
		get: (a) => a.topType,
		set: (a, topType) => ({ ...a, topType: topType as Avatar['topType'] }),
	},
	{
		kind: 'colour',
		label: 'Top colour',
		palette: KIT,
		get: (a) => a.topColor,
		set: (a, topColor) => ({ ...a, topColor }),
	},
	{
		kind: 'choice',
		label: 'Neck',
		options: [
			{ value: 'skin', label: 'Skin' },
			{ value: 'top', label: 'Top colour' },
		],
		get: (a) => (a.head.topColorForNeck ? 'top' : 'skin'),
		set: (a, neck) => withHead(a, { topColorForNeck: neck === 'top' }),
	},
	{
		kind: 'choice',
		label: 'Bottoms',
		options: [
			{ value: 'short-shorts', label: 'Short shorts' },
			{ value: 'shorts', label: 'Shorts' },
			{ value: 'trousers', label: 'Trousers' },
		],
		get: (a) => a.bottomType,
		set: (a, bottomType) => ({
			...a,
			bottomType: bottomType as Avatar['bottomType'],
		}),
	},
	{
		kind: 'colour',
		label: 'Bottoms colour',
		palette: KIT,
		get: (a) => a.bottomColor,
		set: (a, bottomColor) => ({ ...a, bottomColor }),
	},
	{
		kind: 'colour',
		label: 'Socks',
		palette: [NONE, ...KIT],
		get: (a) => a.sockColor ?? NONE,
		set: (a, sockColor) => ({ ...a, sockColor: sockColor || undefined }),
		// Trousers cover them.
		show: (a) => a.bottomType !== 'trousers',
	},
	{
		kind: 'colour',
		label: 'Shoes',
		palette: KIT,
		get: (a) => a.shoeColor,
		set: (a, shoeColor) => ({ ...a, shoeColor }),
	},
]

export const pickAny = <T>(list: T[]) =>
	list[Math.floor(Math.random() * list.length)]

/** Someone new, every row picked at random. */
export function randomAvatar(from: Avatar): Avatar {
	let avatar = from
	for (const row of ROWS) {
		if (row.kind === 'choice')
			avatar = row.set(avatar, pickAny(row.options).value)
		if (row.kind === 'colour') avatar = row.set(avatar, pickAny(row.palette))
	}
	// Everyone beardy would be a lot: the face rows are often left bare.
	if (Math.random() < 0.6) avatar = withHead(avatar, { facialHair: undefined })
	if (Math.random() < 0.5) avatar = withHead(avatar, { accessory: undefined })
	return avatar
}
