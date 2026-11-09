# Convex is the only Room List

Public Rooms for both games (`run-game` and `game`) are listed in one generic Convex table, keyed by app. Hosts check in regularly, and a Room drops off the list once it stops checking in. Trystero is still used to connect to a Room by its Room Code. It is no longer used to find Rooms.

## Considered Options

- **Keep the trystero lobby room (`__scoopbus_lobby__`) in `apps/game`**, either instead of Convex or alongside it. Trystero itself has no way to list rooms; the lobby is a workaround where every browser looking for a game joins one shared room. Its one advantage is that it works when Convex is down. We rejected it because:
  - every browser looking for a game opens a connection to every other one
  - the list only exists while some Host is online in it
  - running it alongside Convex would mean merging two lists and removing duplicates

## Consequences

- If Convex is down, the Room List is empty, but joining by Room Code or QR still works.
