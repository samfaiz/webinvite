/**
 * Where the heart is in the opening film (00-opening.mp4), measured frame by
 * frame at 12 fps: [film time in s, centre y, width] as fractions of the
 * plate. The heart stays inside the envelope until ~5.0 s, rises highest at
 * ~6.0 s and settles by ~7.5 s, centred where the cover's own heart is but
 * smaller. The names ride on it by following this path.
 *
 * Re-measure (see the commit that added this) if the film is ever replaced.
 */

/** the cover plate's own heart, measured the same way */
export const COVER_HEART = { cy: 0.7008, w: 0.3833 };

export const HEART_TRACK: [number, number, number][] = [
  [5.000, 0.7258, 0.3111],
  [5.083, 0.7148, 0.3111],
  [5.167, 0.6977, 0.3111],
  [5.250, 0.6805, 0.3111],
  [5.333, 0.6617, 0.3111],
  [5.417, 0.6461, 0.3111],
  [5.500, 0.6313, 0.3111],
  [5.583, 0.6180, 0.3111],
  [5.667, 0.6086, 0.3111],
  [5.750, 0.6000, 0.3111],
  [5.833, 0.5953, 0.3111],
  [5.917, 0.5938, 0.3111],
  [6.000, 0.5945, 0.3111],
  [6.083, 0.5953, 0.3111],
  [6.167, 0.5977, 0.3111],
  [6.250, 0.6016, 0.3111],
  [6.333, 0.6055, 0.3111],
  [6.417, 0.6117, 0.3111],
  [6.500, 0.6180, 0.3111],
  [6.583, 0.6258, 0.3111],
  [6.667, 0.6336, 0.3111],
  [6.750, 0.6414, 0.3111],
  [6.833, 0.6508, 0.3111],
  [6.917, 0.6594, 0.3111],
  [7.000, 0.6672, 0.3111],
  [7.083, 0.6750, 0.3111],
  [7.167, 0.6820, 0.3111],
  [7.250, 0.6883, 0.3111],
  [7.333, 0.6922, 0.3111],
  [7.417, 0.6961, 0.3111],
  [7.500, 0.6984, 0.3111],
  [7.583, 0.6984, 0.3111],
  [7.667, 0.6984, 0.3111],
  [7.750, 0.6984, 0.3111],
];

/** The heart at film time `t`: how far to move the cover's writing and how
 *  much to scale it so it sits on the film's heart. */
export function heartAt(t: number): { dy: number; s: number } {
  const tr = HEART_TRACK;
  let a = tr[0];
  let b = tr[tr.length - 1];
  if (t <= a[0]) b = a;
  else if (t >= b[0]) a = b;
  else
    for (let i = 1; i < tr.length; i++)
      if (tr[i][0] >= t) {
        a = tr[i - 1];
        b = tr[i];
        break;
      }
  const k = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
  const cy = a[1] + (b[1] - a[1]) * k;
  const w = a[2] + (b[2] - a[2]) * k;
  return { dy: cy - COVER_HEART.cy, s: w / COVER_HEART.w };
}
