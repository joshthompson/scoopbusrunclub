import re
import sys

filepath = '/Users/josh/Projects/scoopbusrunclub/apps/game/src/game/Game.ts'
with open(filepath, 'r') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Methods to remove (method name -> line number from grep, 1-indexed)
methods_to_remove = [
    ('placeKmSigns', 980),
    ('buildGates', 1048),
    ('checkGates', 1084),
    ('placeEventLandmarks', 1252),
    ('createWaterWake', 1360),
    ('setWaterWakeActive', 1451),
    ('updateWakeIntensity', 1461),
    ('createExhaustFlames', 1483),
    ('createExhaustFlamesForBus', 1536),
    ('launchRunnerOntoLocalBus', 1584),
    ('packRemoteRiders', 1659),
    ('buildLocalRunner', 1684),
    ('updateLocalRunnerVisual', 1693),
    ('spawnRunners', 1741),
    ('spawnMarshals', 1813),
    ('updateMarshals', 1889),
    ('updateRunners', 1896),
    ('assignRoofSeat', 2220),
    ('updateElasticObjects', 2474),
]

def find_method_range(lines, method_name, expected_line_1indexed):
    """Find the full range of a method including its leading comments/section headers."""
    idx = expected_line_1indexed - 1  # 0-indexed
    line = lines[idx]
    if method_name + '(' not in line:
        found = False
        for offset in range(-5, 6):
            check = idx + offset
            if 0 <= check < len(lines) and method_name + '(' in lines[check]:
                idx = check
                found = True
                break
        if not found:
            print(f"  WARNING: Could not find {method_name} near line {expected_line_1indexed}")
            return None

    method_line = idx
    print(f"  {method_name}: method def at line {idx+1}")

    # Look backward to find the start (comments, section headers, blank lines)
    i = method_line - 1
    while i >= 0:
        stripped = lines[i].strip()
        if stripped == '':
            i -= 1
        elif stripped.startswith('/**') or stripped.startswith('*') or stripped.startswith('*/'):
            i -= 1
        elif stripped.startswith('//'):
            i -= 1
        else:
            break

    # i is now pointing at the last non-comment/non-blank line before our method
    range_start = i + 1

    # Skip leading blank lines but keep one as separator
    first_non_blank = range_start
    while first_non_blank < method_line and lines[first_non_blank].strip() == '':
        first_non_blank += 1
    # Keep one blank line before content if there were any
    if first_non_blank > range_start:
        range_start = first_non_blank - 1

    # Find the end: closing `}` matching the method's opening brace
    brace_count = 0
    found_open = False
    end_line = method_line
    for j in range(method_line, len(lines)):
        for ch in lines[j]:
            if ch == '{':
                brace_count += 1
                found_open = True
            elif ch == '}':
                brace_count -= 1
        if found_open and brace_count == 0:
            end_line = j
            break

    range_end = end_line + 1  # exclusive

    print(f"    range: lines {range_start+1}-{end_line+1} ({end_line - range_start + 1} lines)")
    print(f"    first: {lines[range_start].rstrip()}")
    print(f"    last:  {lines[end_line].rstrip()}")
    return (range_start, range_end)

# Collect all ranges
ranges = []
for name, line_num in methods_to_remove:
    result = find_method_range(lines, name, line_num)
    if result:
        ranges.append((result, name))

# Sort ranges in reverse order (bottom to top) to avoid index shifting
ranges.sort(key=lambda r: r[0][0], reverse=True)

# Check for overlaps
for i in range(len(ranges) - 1):
    if ranges[i+1][0][1] > ranges[i][0][0]:
        print(f"WARNING: Overlapping ranges: {ranges[i+1][1]} ends at {ranges[i+1][0][1]} but {ranges[i][1]} starts at {ranges[i][0][0]}")

# Remove ranges (bottom-up to preserve indices)
total_removed = 0
for (start, end), name in ranges:
    count = end - start
    total_removed += count
    lines[start:end] = ['\n']
    print(f"  Removed {name}: {count} lines (replaced with blank line)")

print(f"\nTotal lines removed: {total_removed}")
print(f"New total lines: {len(lines)}")

with open(filepath, 'w') as f:
    f.writelines(lines)

print("File written successfully.")
