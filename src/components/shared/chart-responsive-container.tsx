'use client';

import {
  ResponsiveContainer,
  type ResponsiveContainerProps
} from 'recharts';

const CHART_INITIAL_DIMENSION = {
  width: 320,
  height: 240
};

// Coalesces rapid size changes (sidebar toggles, window resizing) into one chart re-render
// instead of re-rendering the chart on every intermediate size.
const CHART_RESIZE_DEBOUNCE_MS = 120;

export function ChartResponsiveContainer({
  initialDimension = CHART_INITIAL_DIMENSION,
  minHeight = 0,
  minWidth = 0,
  debounce = CHART_RESIZE_DEBOUNCE_MS,
  ...props
}: ResponsiveContainerProps) {
  return (
    <ResponsiveContainer
      initialDimension={initialDimension}
      minHeight={minHeight}
      minWidth={minWidth}
      debounce={debounce}
      {...props}
    />
  );
}
