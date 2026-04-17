/**
 * Parse KML content to extract course coordinates and named points.
 *
 * KML coordinates are stored as "longitude,latitude,altitude" per the KML spec.
 * We preserve this order in the output arrays.
 */

// --- Types ---

export interface CoursePoint {
  name: string;
  coordinates: number[];
}

export interface CourseData {
  /** Course path coordinates: [[lon, lat, alt], ...] */
  coordinates: number[][];
  /** Named points */
  points: CoursePoint[];
}

// --- Parsing helpers ---

/**
 * Parse a single KML coordinate string (e.g. "17.642468,59.853419,0")
 * into [longitude, latitude, altitude].
 */
function parseCoordinate(coordStr: string): number[] {
  const parts = coordStr.trim().split(",").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) {
    throw new Error(`Invalid coordinate: "${coordStr}"`);
  }
  return parts;
}

/**
 * Parse a multi-line coordinates block from KML.
 * Each whitespace-separated token contains "longitude,latitude,altitude".
 */
function parseCoordinatesBlock(block: string): number[][] {
  return block
    .trim()
    .split(/\s+/)
    .filter((token) => token.includes(","))
    .map(parseCoordinate);
}

// --- Main parser ---

/**
 * Extract course data from KML content.
 *
 * Finds:
 * - LineString coordinates → the course path
 * - Point placemarks → named locations (Start, Finish, Turnaround point, etc.)
 */
export function parseKml(kmlContent: string): CourseData {
  const coordinates: number[][] = [];
  const points: CoursePoint[] = [];

  // Match all <Placemark>…</Placemark> blocks
  const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
  let match;

  while ((match = placemarkRegex.exec(kmlContent)) !== null) {
    const placemark = match[1];

    // Extract the <name> element
    const nameMatch = placemark.match(/<name>(.*?)<\/name>/);
    const name = nameMatch ? nameMatch[1].trim() : "";

    // Check for LineString (course path)
    const lineStringMatch = placemark.match(
      /<LineString>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/,
    );
    if (lineStringMatch) {
      const parsed = parseCoordinatesBlock(lineStringMatch[1]);
      coordinates.push(...parsed);
      continue;
    }

    // Check for Polygon boundaries (some maps use this instead of LineString).
    // Extract outer + all inner boundaries for the most complete path.
    const polygonMatch = placemark.match(/<Polygon>([\s\S]*?)<\/Polygon>/);
    if (polygonMatch) {
      const polygonContent = polygonMatch[1];
      // Outer boundary
      const outerMatch = polygonContent.match(
        /<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/outerBoundaryIs>/,
      );
      if (outerMatch) {
        coordinates.push(...parseCoordinatesBlock(outerMatch[1]));
      }
      // Inner boundaries (connecting segments, out-and-back paths, etc.)
      const innerRegex =
        /<innerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/innerBoundaryIs>/g;
      let innerMatch;
      while ((innerMatch = innerRegex.exec(polygonContent)) !== null) {
        coordinates.push(...parseCoordinatesBlock(innerMatch[1]));
      }
      continue;
    }

    // Check for Point (named location)
    const pointMatch = placemark.match(
      /<Point>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/Point>/,
    );
    if (pointMatch && name) {
      const coord = parseCoordinate(pointMatch[1].trim());
      points.push({ name, coordinates: coord });
    }
  }

  return { coordinates, points };
}
