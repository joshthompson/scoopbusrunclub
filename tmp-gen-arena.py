#!/usr/bin/env python3
"""Generate arena level data files (400m running track)."""
import json, math, os

center_lat = 59.35
center_lon = 18.04
R_earth = 6_371_000
to_rad = math.pi / 180
cos_lat = math.cos(center_lat * to_rad)

straight_length = 100  # metres
bend_radius = 100 / math.pi  # ~31.831m so each semicircle arc = 100m
half_straight = straight_length / 2

N_STRAIGHT = 20
N_BEND = 30

def metres_to_gps(dx_m, dz_m):
    dlon = dx_m / (R_earth * cos_lat * to_rad)
    dlat = dz_m / (R_earth * to_rad)
    return [round(center_lon + dlon, 7), round(center_lat + dlat, 7), 0]

coords = []

# Bottom straight: left to right
for i in range(N_STRAIGHT):
    t = i / N_STRAIGHT
    x = -half_straight + t * straight_length
    z = -bend_radius
    coords.append(metres_to_gps(x, z))

# Right semicircle: center at (half_straight, 0), angle -pi/2 to pi/2
for i in range(N_BEND + 1):
    t = i / N_BEND
    angle = -math.pi / 2 + t * math.pi
    x = half_straight + bend_radius * math.cos(angle)
    z = bend_radius * math.sin(angle)
    coords.append(metres_to_gps(x, z))

# Top straight: right to left
for i in range(1, N_STRAIGHT):
    t = i / N_STRAIGHT
    x = half_straight - t * straight_length
    z = bend_radius
    coords.append(metres_to_gps(x, z))

# Left semicircle: center at (-half_straight, 0), angle pi/2 to 3pi/2
for i in range(N_BEND + 1):
    t = i / N_BEND
    angle = math.pi / 2 + t * math.pi
    x = -half_straight + bend_radius * math.cos(angle)
    z = bend_radius * math.sin(angle)
    coords.append(metres_to_gps(x, z))

# Close the loop
if coords[-1] != coords[0]:
    coords.append(list(coords[0]))

# Verify distance
total = 0
for i in range(len(coords) - 1):
    dx = (coords[i+1][0] - coords[i][0]) * R_earth * cos_lat * to_rad
    dz = (coords[i+1][1] - coords[i][1]) * R_earth * to_rad
    total += math.sqrt(dx * dx + dz * dz)
print(f"Track distance: {total:.1f}m ({len(coords)} points)")

# Output directory
out_dir = "apps/game/src/levels/arena"
os.makedirs(out_dir, exist_ok=True)

# course.json
course = {
    "eventId": "arena",
    "coordinates": coords,
    "points": [
        {"name": "Start", "coordinates": coords[0]},
        {"name": "Finish", "coordinates": coords[0]},
    ],
}
with open(os.path.join(out_dir, "course.json"), "w") as f:
    json.dump(course, f, indent=2)
print("Wrote course.json")

# altitude.json — flat track, all zeros
altitude = [0.0] * len(coords)
with open(os.path.join(out_dir, "altitude.json"), "w") as f:
    json.dump(altitude, f)
print("Wrote altitude.json")

# water.json — no water
with open(os.path.join(out_dir, "water.json"), "w") as f:
    json.dump([], f)
print("Wrote water.json")

# buildings.json — no buildings
with open(os.path.join(out_dir, "buildings.json"), "w") as f:
    json.dump([], f)
print("Wrote buildings.json")

# paths.json — no extra paths
with open(os.path.join(out_dir, "paths.json"), "w") as f:
    json.dump([], f)
print("Wrote paths.json")

print("Done!")
