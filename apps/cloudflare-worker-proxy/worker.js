/**
 * mcp.scoopbus.run → the club's MCP server on Convex.
 *
 * scoopbus.run itself is GitHub Pages, which can't forward a POST, so this
 * Cloudflare Worker sits on the subdomain and passes every request through to
 * the Convex route untouched: method, headers, body and query string. The
 * response comes straight back, so the MCP client never knows it was proxied.
 * See docs/mcp.md for what's on the other end.
 *
 * Paste this into the Worker's editor in the Cloudflare dashboard and attach
 * mcp.scoopbus.run under Settings → Domains & Routes → Custom Domain.
 */

const TARGET = 'https://effervescent-jellyfish-751.eu-west-1.convex.site/api/mcp'

export default {
	async fetch(request) {
		const { search } = new URL(request.url)
		return fetch(new Request(`${TARGET}${search}`, request))
	},
}
