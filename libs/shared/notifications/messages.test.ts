/**
 * Run with: npx tsx --test libs/shared/notifications/messages.test.ts
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
	type ResultsSummary,
	SUMMARY_BODY_MAX,
	buildResultsSummary,
	buildResultsSummaryBody,
} from './messages'

/** A day with results and nothing else to say about them. */
const empty: ResultsSummary = {
	resultCount: 1,
	pbs: [],
	milestones: [],
	journey: [],
}

test('a count on its own', () => {
	assert.equal(
		buildResultsSummaryBody({ ...empty, resultCount: 1 }),
		'1 new result.',
	)
	assert.equal(
		buildResultsSummaryBody({ ...empty, resultCount: 12 }),
		'12 new results.',
	)
})

test('a single course PB reads as a sentence', () => {
	assert.equal(
		buildResultsSummaryBody({
			...empty,
			resultCount: 1,
			pbs: [{ name: 'Eline', time: '00:23:12', course: 'Haga' }],
		}),
		'1 new result. Eline got a new Haga PB (23:12).',
	)
})

test('a single overall PB and a milestone', () => {
	assert.equal(
		buildResultsSummaryBody({
			...empty,
			resultCount: 12,
			pbs: [{ name: 'Josh', time: '00:21:40' }],
			milestones: [{ name: 'Keith', runs: 100 }],
		}),
		'12 new results. Josh got a new PB (21:40). Keith has now completed 100 parkruns!',
	)
})

test('several PBs, milestones and a waypoint', () => {
	assert.equal(
		buildResultsSummaryBody({
			resultCount: 12,
			pbs: [
				{ name: 'Eline', time: '00:23:12', course: 'Haga' },
				{ name: 'Josh', time: '00:21:40' },
			],
			milestones: [
				{ name: 'Keith', runs: 100 },
				{ name: 'Claire', runs: 50 },
			],
			journey: [{ name: 'Tokyo' }],
		}),
		'12 new results. New PBs for Eline (Haga, 23:12) and Josh (21:40). Milestones for Keith (100) and Claire (50)! The Scoop Bus has reached Tokyo!',
	)
})

test('a waypoint with its own wording', () => {
	assert.equal(
		buildResultsSummaryBody({
			...empty,
			resultCount: 9,
			journey: [{ name: 'Halfway', reached: 'is halfway around the Earth!' }],
		}),
		'9 new results. The Scoop Bus is halfway around the Earth!',
	)
})

test('a long day drops PB names first, then milestone names', () => {
	const names = [
		'Alexandra',
		'Bartholomew',
		'Christopher',
		'Dominique',
		'Evangeline',
		'Frederick',
		'Genevieve',
		'Humphrey',
	]
	const body = buildResultsSummaryBody({
		resultCount: 14,
		pbs: names.map((name) => ({ name, time: '00:24:00', course: 'Haga' })),
		milestones: names.slice(0, 3).map((name) => ({ name, runs: 50 })),
		journey: [],
	})
	assert.ok(body !== null)
	assert.ok(body.length <= SUMMARY_BODY_MAX, `${body.length} chars: ${body}`)
	assert.match(body, /^14 new results\. /)
	assert.match(body, /and \d more\./)
	// Milestones survive intact while there are still PB names to drop.
	assert.match(
		body,
		/Milestones for Alexandra \(50\), Bartholomew \(50\) and Christopher \(50\)!/,
	)
})

test('with every name gone, PBs collapse to a count', () => {
	const pbs = Array.from({ length: 30 }, (_, i) => ({
		name: `Runner Number ${i}`,
		time: '00:24:00',
		course: 'Haga',
	}))
	const milestones = Array.from({ length: 30 }, (_, i) => ({
		name: `Runner Number ${i}`,
		runs: 50,
	}))
	const body = buildResultsSummaryBody({
		resultCount: 30,
		pbs,
		milestones,
		journey: [],
	})
	assert.ok(body !== null)
	assert.ok(body.length <= SUMMARY_BODY_MAX)
	assert.match(body, /30 new PBs\./)
})

test('the payload is tagged by day so a re-send replaces, not stacks', () => {
	const payload = buildResultsSummary('2026-09-19', {
		...empty,
		resultCount: 3,
	})
	assert.deepEqual(payload, {
		title: 'New Scoop Bus Results',
		body: '3 new results.',
		url: '/',
		tag: 'results:2026-09-19',
	})
})
