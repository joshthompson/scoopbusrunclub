export interface CourseOverride {
  sections?: number[][]
  laps?: number
  reverse?: boolean
}

export const COURSE_OVERRIDES: Record<string, CourseOverride> = {
  haga: {
    sections: [
      [0, 5], // Start to turnaround
      [6, 42], // Lap 1
      [6, 42], // Lap 2
      [5, 0], // Final stretch to the finish
    ],
  },
  somerdalepavilion: {
    sections: [
      [240, 3], // Lap 1
      [240, 3], // Lap 2
      [240, 159], // Final stretch to the finish
    ],
  },
  huddinge: {
    sections: [
      [0, 55], // Lap 1 - half lap including cut through
      [6, 55], // Lap 2
      [6, 29], // Lap 3
      [1, 0], // Final stretch to the finish
    ],
  },
  lillsjon: {
    sections: [
      [0, 18], // Start
      [18, 768], // Lap 1
      [18, 768], // Lap 2
      [769, 800], // Final stretch to the finish
    ],
  },
  uppsala: {
    sections: [
      [7, 41], [0, 6], // Lap 1
      [7, 41], [0, 3], // Lap 2
    ],
  },
  judarskogen: {}, // Course data good - no overrides needed
  orebro: {
    sections: [
      [42, 27], // Start to loop point
      [0, 26], // Loop
      [27, 41], // Loop point to finish
    ],
  }
}

/**
 * Given raw coordinate indices and a CourseOverride, produce the ordered list
 * of coordinate indices that represents the full 5 km course.
 *
 * If no override exists or has no sections, returns all indices [0 .. length-1].
 */
export function buildCourseIndices(
  coordinateCount: number,
  override?: CourseOverride,
): number[] {
  if (!override?.sections || override.sections.length === 0) {
    return Array.from({ length: coordinateCount }, (_, i) => i);
  }

  const indices: number[] = [];
  for (const [from, to] of override.sections) {
    if (from <= to) {
      for (let i = from; i <= to; i++) indices.push(i);
    } else {
      for (let i = from; i >= to; i--) indices.push(i);
    }
  }
  return indices;
}
