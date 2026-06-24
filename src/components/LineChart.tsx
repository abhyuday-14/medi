import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, Rect, G } from 'react-native-svg';
import { useAppStore } from '../store/appStore';
import { COLORS, getFontScale } from '../config/theme';

export interface ChartDataPoint {
  value: number;
  value2?: number; // Optional second line (e.g., Diastolic in Blood Pressure)
  label: string;  // X-axis label (e.g. "Mon", "Tue")
}

interface LineChartProps {
  data: ChartDataPoint[];
  title: string;
  unit?: string;
  yMinDefault?: number;
  yMaxDefault?: number;
  lineColor?: string;
  lineColor2?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  title,
  unit = '',
  yMinDefault = 0,
  yMaxDefault = 100,
  lineColor,
  lineColor2,
}) => {
  const { themeMode, contrastMode, fontSizeScale } = useAppStore();
  const theme = COLORS[themeMode][contrastMode];
  const fontScale = getFontScale(fontSizeScale);

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={{ color: theme.textSecondary, fontSize: 16 * fontScale }}>No data logs available for chart</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 64; // Horizontal margin padding
  const chartHeight = 200;

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const graphWidth = chartWidth - paddingLeft - paddingRight;
  const graphHeight = chartHeight - paddingTop - paddingBottom;

  // Extract all values to calculate min/max limits
  const values1 = data.map((d) => d.value);
  const values2 = data.filter((d) => d.value2 !== undefined).map((d) => d.value2 as number);
  const allValues = [...values1, ...values2];

  let minY = Math.min(...allValues);
  let maxY = Math.max(...allValues);

  // Pad min and max values to keep graph centered
  if (minY === maxY) {
    minY = Math.max(0, minY - 10);
    maxY = maxY + 10;
  } else {
    const diff = maxY - minY;
    minY = Math.max(0, Math.floor(minY - diff * 0.1));
    maxY = Math.ceil(maxY + diff * 0.1);
  }

  // Ensure default bounds are respected if data is tight
  if (minY > yMinDefault) minY = yMinDefault;
  if (maxY < yMaxDefault) maxY = yMaxDefault;

  // Function to map a data point index and value to graph coordinates
  const getCoordinates = (index: number, val: number) => {
    const x = paddingLeft + (index / (data.length - 1 || 1)) * graphWidth;
    const y = paddingTop + graphHeight - ((val - minY) / (maxY - minY)) * graphHeight;
    return { x, y };
  };

  // Generate SVG lines
  let pathD1 = '';
  let pathD2 = '';

  data.forEach((point, i) => {
    const coords1 = getCoordinates(i, point.value);
    if (i === 0) {
      pathD1 = `M ${coords1.x} ${coords1.y}`;
    } else {
      pathD1 += ` L ${coords1.x} ${coords1.y}`;
    }

    if (point.value2 !== undefined) {
      const coords2 = getCoordinates(i, point.value2);
      if (i === 0) {
        pathD2 = `M ${coords2.x} ${coords2.y}`;
      } else {
        pathD2 += ` L ${coords2.x} ${coords2.y}`;
      }
    }
  });

  const activeLineColor1 = lineColor || theme.primary;
  const activeLineColor2 = lineColor2 || theme.danger;

  // X Axis Grid / Labels
  const gridStepsY = 4;
  const yLabels = Array.from({ length: gridStepsY + 1 }, (_, i) => {
    return Math.round(minY + (i / gridStepsY) * (maxY - minY));
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: contrastMode === 'high' ? 2 : 1 }]}>
      <Text style={[styles.title, { color: theme.text, fontSize: 16 * fontScale }]}>
        {title} {unit ? `(${unit})` : ''}
      </Text>

      <Svg width={chartWidth} height={chartHeight}>
        <G>
          {/* Y Axis Grid lines */}
          {yLabels.map((yVal, i) => {
            const yPos = getCoordinates(0, yVal).y;
            return (
              <G key={`grid-y-${i}`}>
                <Line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={chartWidth - paddingRight}
                  y2={yPos}
                  stroke={theme.border}
                  strokeWidth={1}
                  strokeDasharray="4, 4"
                />
                <SvgText
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  fill={theme.textSecondary}
                  fontSize={10}
                  textAnchor="end"
                  fontWeight="bold"
                >
                  {yVal}
                </SvgText>
              </G>
            );
          })}

          {/* X Axis Labels */}
          {data.map((point, i) => {
            // Only draw label for start, middle, end to avoid clutter
            const isLabelVisible =
              data.length <= 7 ||
              i === 0 ||
              i === data.length - 1 ||
              i === Math.floor(data.length / 2);

            if (!isLabelVisible) return null;

            const xPos = getCoordinates(i, point.value).x;
            return (
              <SvgText
                key={`grid-x-${i}`}
                x={xPos}
                y={chartHeight - 12}
                fill={theme.textSecondary}
                fontSize={10}
                textAnchor="middle"
                fontWeight="bold"
              >
                {point.label}
              </SvgText>
            );
          })}

          {/* Y & X solid axes */}
          <Line
            x1={paddingLeft}
            y1={paddingTop}
            x2={paddingLeft}
            y2={chartHeight - paddingBottom}
            stroke={theme.textSecondary}
            strokeWidth={1.5}
          />
          <Line
            x1={paddingLeft}
            y1={chartHeight - paddingBottom}
            x2={chartWidth - paddingRight}
            y2={chartHeight - paddingBottom}
            stroke={theme.textSecondary}
            strokeWidth={1.5}
          />

          {/* Primary Trend Line */}
          {pathD1 ? (
            <Path
              d={pathD1}
              fill="none"
              stroke={activeLineColor1}
              strokeWidth={contrastMode === 'high' ? 4 : 3}
            />
          ) : null}

          {/* Secondary Trend Line (e.g. Diastolic) */}
          {pathD2 ? (
            <Path
              d={pathD2}
              fill="none"
              stroke={activeLineColor2}
              strokeWidth={contrastMode === 'high' ? 4 : 3}
            />
          ) : null}

          {/* Dots on points (Primary Line) */}
          {data.map((point, i) => {
            const { x, y } = getCoordinates(i, point.value);
            return (
              <Circle
                key={`circle-p1-${i}`}
                cx={x}
                cy={y}
                r={contrastMode === 'high' ? 6 : 4}
                fill={activeLineColor1}
                stroke={theme.card}
                strokeWidth={1.5}
              />
            );
          })}

          {/* Dots on points (Secondary Line) */}
          {data.map((point, i) => {
            if (point.value2 === undefined) return null;
            const { x, y } = getCoordinates(i, point.value2);
            return (
              <Circle
                key={`circle-p2-${i}`}
                cx={x}
                cy={y}
                r={contrastMode === 'high' ? 6 : 4}
                fill={activeLineColor2}
                stroke={theme.card}
                strokeWidth={1.5}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  emptyContainer: {
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
});
