import React from 'react';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

interface CircularProgressProps {
  size?: number;
  strokeWidth?: number;
  progress: number; // 0 to 100
  color?: string; // Color of the progress arc
  backgroundColor?: string; // Color of the background circle
  textColor?: string; // Color of the central text
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  size = 72,
  strokeWidth = 6,
  progress,
  color = '#FFFFFF',
  backgroundColor = 'rgba(255, 255, 255, 0.2)',
  textColor = '#FFFFFF',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Bound progress between 0 and 100
  const boundedProgress = Math.max(0, Math.min(100, progress));
  const strokeDashoffset = circumference - (boundedProgress / 100) * circumference;

  return (
    <Svg width={size} height={size}>
      {/* Background circle */}
      <Circle
        stroke={backgroundColor}
        fill="transparent"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <Circle
        stroke={color}
        fill="transparent"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Percentage Value */}
      <SvgText
        x="50%"
        y="42%"
        fontSize="18"
        fontWeight="900"
        textAnchor="middle"
        alignmentBaseline="middle"
        fill={textColor}
      >
        {Math.round(boundedProgress)}
      </SvgText>
      {/* Label */}
      <SvgText
        x="50%"
        y="68%"
        fontSize="8"
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
        fill={textColor}
        opacity={0.8}
      >
        SCORE
      </SvgText>
    </Svg>
  );
};
