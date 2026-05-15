const PROGRESS_TEXT_STOPS = [
  { percent: 0, color: [76, 29, 149] },
  { percent: 14, color: [126, 34, 206] },
  { percent: 28, color: [190, 24, 93] },
  { percent: 43, color: [194, 65, 12] },
  { percent: 57, color: [161, 98, 7] },
  { percent: 70, color: [21, 128, 61] },
  { percent: 84, color: [3, 105, 161] },
  { percent: 100, color: [109, 40, 217] },
];

export function clampProgressPercent(percent) {
  return Number.isFinite(percent) ? Math.max(0, Math.min(percent, 100)) : 0;
}

export function getProgressColor(percent) {
  const safePercent = clampProgressPercent(percent);

  for (let index = 0; index < PROGRESS_TEXT_STOPS.length - 1; index += 1) {
    const start = PROGRESS_TEXT_STOPS[index];
    const end = PROGRESS_TEXT_STOPS[index + 1];

    if (safePercent <= end.percent) {
      const span = end.percent - start.percent || 1;
      const progress = (safePercent - start.percent) / span;
      const [red, green, blue] = start.color.map((startValue, channel) =>
        Math.round(startValue + (end.color[channel] - startValue) * progress)
      );

      return `rgb(${red} ${green} ${blue})`;
    }
  }

  return "rgb(109 40 217)";
}
