import { useMemo, useState } from "react";
import { hslToString, getHueColorName } from "../utils/colorUtils";
import type { HuePeak } from "../utils/colorUtils";
import "./HueHistogram.css";

interface HueHistogramProps {
  histogram: number[];
  bins?: number;
  peaks?: HuePeak[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  hue: number;
  value: number;
  colorName: string;
}

export function HueHistogram({
  histogram,
  bins = 360,
  peaks = [],
}: HueHistogramProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    hue: 0,
    value: 0,
    colorName: "",
  });

  const maxValue = useMemo(() => Math.max(...histogram, 1), [histogram]);

  // SVG 尺寸
  const width = 900;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 20 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const barWidth = chartWidth / bins;

  const handleMouseMove = (
    e: React.MouseEvent<SVGSVGElement>,
    index: number
  ) => {
    const hue = index;
    const value = histogram[index];
    const colorName = getHueColorName(hue);
    const rect = e.currentTarget.getBoundingClientRect();

    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 10,
      hue,
      value,
      colorName,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  // 计算峰值区域的路径（处理跨越 0° 的情况）
  const getPeakRegions = (peak: HuePeak) => {
    const regions: { start: number; end: number }[] = [];

    if (peak.endHue < peak.startHue) {
      // 跨越 0° 的情况，分成两个区域
      regions.push({ start: peak.startHue, end: bins });
      regions.push({ start: 0, end: peak.endHue });
    } else {
      regions.push({ start: peak.startHue, end: peak.endHue });
    }

    return regions;
  };

  return (
    <div className="histogram-container">
      <div className="histogram-header">
        <h2 className="histogram-title">色相分布直方图</h2>
        <span className="peak-count">检测到 {peaks.length} 个主色调</span>
      </div>

      <div className="histogram-svg-wrapper">
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="histogram-svg"
          onMouseLeave={handleMouseLeave}
        >
          {/* 背景 */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="rgba(0, 0, 0, 0.3)"
            rx="8"
          />

          {/* 峰值高亮区域 */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {peaks.map((peak, peakIndex) => {
              const regions = getPeakRegions(peak);
              return regions.map((region, regionIndex) => (
                <rect
                  key={`${peakIndex}-${regionIndex}`}
                  x={region.start * barWidth}
                  y={0}
                  width={(region.end - region.start) * barWidth}
                  height={chartHeight}
                  fill={`hsla(${peak.peakHue}, 70%, 50%, 0.15)`}
                  stroke={`hsla(${peak.peakHue}, 70%, 60%, 0.5)`}
                  strokeWidth="1"
                  strokeDasharray="4 2"
                />
              ));
            })}
          </g>

          {/* 直方图柱状 */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {histogram.map((value, index) => {
              const barHeight = (value / maxValue) * chartHeight;
              const x = index * barWidth;
              const y = chartHeight - barHeight;
              const color = hslToString(index, 85, 55);

              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  onMouseMove={(e) => handleMouseMove(e, index)}
                  style={{ cursor: "crosshair" }}
                />
              );
            })}
          </g>

          {/* 峰值标记 */}
          <g transform={`translate(${padding.left}, ${padding.top})`}>
            {peaks.slice(0, 8).map((peak, index) => {
              const x = peak.peakHue * barWidth + barWidth / 2;
              const y = chartHeight - (peak.peakValue / maxValue) * chartHeight;
              // 使用还原的真实颜色
              const peakColor = hslToString(
                peak.peakHue,
                peak.avgSaturation,
                peak.avgLightness
              );
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y - 8}
                    r="4"
                    fill={peakColor}
                    stroke="white"
                    strokeWidth="1.5"
                  />
                  <text
                    x={x}
                    y={y - 18}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, SF Mono, monospace"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </g>

          {/* X 轴刻度 */}
          <g
            transform={`translate(${padding.left}, ${padding.top + chartHeight + 5})`}
          >
            {[0, 60, 120, 180, 240, 300, 360].map((hue) => {
              const x = (hue / 360) * chartWidth;
              const color =
                hue === 360 ? hslToString(0, 85, 55) : hslToString(hue, 85, 55);
              return (
                <g key={hue} transform={`translate(${x}, 0)`}>
                  <line y1="0" y2="5" stroke="rgba(255,255,255,0.3)" />
                  <text
                    y="20"
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.5)"
                    fontSize="11"
                    fontFamily="JetBrains Mono, SF Mono, monospace"
                  >
                    {hue}°
                  </text>
                  <circle cy="30" r="4" fill={color} />
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip */}
        {tooltip.visible && (
          <div
            className="histogram-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div
              className="tooltip-color"
              style={{ backgroundColor: hslToString(tooltip.hue, 85, 55) }}
            />
            <div className="tooltip-content">
              <span className="tooltip-hue">{tooltip.hue}°</span>
              <span className="tooltip-name">{tooltip.colorName}</span>
              <span className="tooltip-value">
                {tooltip.value.toLocaleString()} px
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 峰值信息和主色调色块 */}
      {peaks.length > 0 && (
        <div className="peaks-info">
          <span className="peaks-count">检测到 {peaks.length} 个主色调</span>
          <div className="peaks-colors">
            {peaks.slice(0, 8).map((peak, index) => {
              const color = hslToString(
                peak.peakHue,
                peak.avgSaturation,
                peak.avgLightness
              );
              return (
                <div
                  key={index}
                  className="peak-color-swatch"
                  style={{ backgroundColor: color }}
                  title={`H:${peak.peakHue}° S:${Math.round(peak.avgSaturation)}% L:${Math.round(peak.avgLightness)}%`}
                >
                  <span className="swatch-index">{index + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
