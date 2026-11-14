// Commit messages follow Conventional Commits (https://www.conventionalcommits.org),
// with a scope that's required and must name what changed:
//
//   feat(web): add date bingo
//   docs(run-game): explain level files
//   fix(api, web): handle a cancelled parkrun
//
// Scopes are the Nx projects (so a new app is a valid scope as soon as Nx sees
// it), plus the parts of the repo Nx doesn't know about. Checked on every commit
// by .husky/commit-msg, and on PR titles (the squash-merge message) in CI.
import nxScopes from '@commitlint/config-nx-scopes'

const {
	utils: { getProjects },
} = nxScopes

// Not Nx projects, but places a commit can be about.
const extraScopes = [
	'shared', // libs/shared
	'cloudflare-worker-proxy', // apps/cloudflare-worker-proxy
	'repo', // the root: tooling, config, CI, docs that span the repo
]

// Commits are credited to whoever made them, never shared with a co-author
// (human or AI), so any Co-authored-by trailer fails, whatever its case.
const coAuthorTrailer = /^co-authored-by:/im

export default {
	extends: ['@commitlint/config-conventional'],
	plugins: [
		{
			rules: {
				'no-co-authors': ({ raw }) => [
					!coAuthorTrailer.test(raw ?? ''),
					'commits may not have a Co-authored-by trailer',
				],
			},
		},
	],
	rules: {
		'no-co-authors': [2, 'always'],
		'scope-empty': [2, 'never'],
		'scope-enum': async (ctx) => [
			2,
			'always',
			[...(await getProjects(ctx)), ...extraScopes],
		],
		// "feat(web): Improved animation cycles" and "feat(web): improved…" are both fine.
		'subject-case': [0],
	},
}
