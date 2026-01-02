// ============================================================================
// 颜色工具函数库
// ============================================================================

// ----------------------------------------------------------------------------
// 类型定义
// ----------------------------------------------------------------------------

/** 直方图数据结构 */
export interface HistogramData {
  histogram: number[];
  saturationSum: number[];
  lightnessSum: number[];
}

/** 峰值信息 */
export interface HuePeak {
  startHue: number;
  endHue: number;
  peakHue: number;
  peakValue: number;
  totalWeight: number;
  avgSaturation: number;
  avgLightness: number;
}

// ----------------------------------------------------------------------------
// 颜色空间转换
// ----------------------------------------------------------------------------

/** RGB → HSL */
export function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** HSL → RGB */
export function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/** RGB → Lab (D65 illuminant) */
export function rgbToLab(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  // RGB → XYZ
  let rr = r / 255;
  let gg = g / 255;
  let bb = b / 255;

  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;

  rr *= 100;
  gg *= 100;
  bb *= 100;

  const x = rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375;
  const y = rr * 0.2126729 + gg * 0.7151522 + bb * 0.072175;
  const z = rr * 0.0193339 + gg * 0.119192 + bb * 0.9503041;

  // XYZ → Lab
  const refX = 95.047,
    refY = 100.0,
    refZ = 108.883;
  let xx = x / refX;
  let yy = y / refY;
  let zz = z / refZ;

  xx = xx > 0.008856 ? Math.pow(xx, 1 / 3) : 7.787 * xx + 16 / 116;
  yy = yy > 0.008856 ? Math.pow(yy, 1 / 3) : 7.787 * yy + 16 / 116;
  zz = zz > 0.008856 ? Math.pow(zz, 1 / 3) : 7.787 * zz + 16 / 116;

  return [116 * yy - 16, 500 * (xx - yy), 200 * (yy - zz)];
}

/** HSL → CSS 字符串 */
export function hslToString(h: number, s: number = 80, l: number = 50): string {
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// ----------------------------------------------------------------------------
// 色差计算 (CIEDE2000)
// ----------------------------------------------------------------------------

/** 计算 CIEDE2000 色差 */
export function deltaE2000(
  lab1: [number, number, number],
  lab2: [number, number, number]
): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const kL = 1,
    kC = 1,
    kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cb = (C1 + C2) / 2;
  const G =
    0.5 *
    (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p = Math.atan2(b1, a1p) * (180 / Math.PI);
  const h2p = Math.atan2(b2, a2p) * (180 / Math.PI);
  const h1pMod = h1p < 0 ? h1p + 360 : h1p;
  const h2pMod = h2p < 0 ? h2p + 360 : h2p;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2pMod - h1pMod) <= 180) {
    dhp = h2pMod - h1pMod;
  } else if (h2pMod - h1pMod > 180) {
    dhp = h2pMod - h1pMod - 360;
  } else {
    dhp = h2pMod - h1pMod + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI) / 360);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;

  let Hbp: number;
  if (C1p * C2p === 0) {
    Hbp = h1pMod + h2pMod;
  } else if (Math.abs(h1pMod - h2pMod) <= 180) {
    Hbp = (h1pMod + h2pMod) / 2;
  } else if (h1pMod + h2pMod < 360) {
    Hbp = (h1pMod + h2pMod + 360) / 2;
  } else {
    Hbp = (h1pMod + h2pMod - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(((Hbp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * Hbp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * Hbp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * Hbp - 63) * Math.PI) / 180);

  const SL =
    1 + (0.015 * Math.pow(Lbp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbp - 50, 2));
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT =
    -2 *
    Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7))) *
    Math.sin((60 * Math.exp(-Math.pow((Hbp - 275) / 25, 2)) * Math.PI) / 180);

  return Math.sqrt(
    Math.pow(dLp / (kL * SL), 2) +
      Math.pow(dCp / (kC * SC), 2) +
      Math.pow(dHp / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
  );
}

// ----------------------------------------------------------------------------
// 直方图处理
// ----------------------------------------------------------------------------

/** 循环索引（处理色相环绕） */
function circularIndex(i: number, n: number): number {
  return ((i % n) + n) % n;
}

/** 生成高斯核 */
function generateGaussianKernel(sigma: number, size: number): number[] {
  const kernel: number[] = [];
  const half = Math.floor(size / 2);
  let sum = 0;

  for (let i = -half; i <= half; i++) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(value);
    sum += value;
  }

  return kernel.map((v) => v / sum);
}

/** 高斯平滑（循环卷积） */
export function gaussianSmooth(
  histogram: number[],
  sigma: number = 3
): number[] {
  const n = histogram.length;
  const kernelSize = Math.min(Math.ceil(sigma * 6) | 1, n);
  const kernel = generateGaussianKernel(sigma, kernelSize);
  const half = Math.floor(kernelSize / 2);
  const result: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < kernelSize; j++) {
      const idx = (i + j - half + n) % n;
      sum += histogram[idx] * kernel[j];
    }
    result[i] = sum;
  }

  return result;
}

/** 从图片提取色相直方图 */
export function extractHueHistogram(
  imageData: ImageData,
  bins: number = 36
): HistogramData {
  const histogram = new Array(bins).fill(0);
  const saturationSum = new Array(bins).fill(0);
  const lightnessSum = new Array(bins).fill(0);
  const binSize = 360 / bins;
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2],
      a = data[i + 3];

    if (a < 200) continue; // 跳过透明像素

    const [hue, saturation, lightness] = rgbToHsl(r, g, b);

    // 跳过灰色或极端亮度
    if (saturation < 10 || lightness < 5 || lightness > 95) continue;

    // 权重：饱和度高 + 亮度接近 50% = 权重大
    const weight = (saturation / 100) * (1 - Math.abs(lightness - 50) / 50);

    const binIndex = Math.floor(hue / binSize) % bins;
    histogram[binIndex] += weight;
    saturationSum[binIndex] += saturation * weight;
    lightnessSum[binIndex] += lightness * weight;
  }

  return { histogram, saturationSum, lightnessSum };
}

// ----------------------------------------------------------------------------
// 颜色名称
// ----------------------------------------------------------------------------

/** 获取色相对应的颜色名称 */
export function getHueColorName(hue: number): string {
  if (hue < 15) return "红色";
  if (hue < 45) return "橙色";
  if (hue < 75) return "黄色";
  if (hue < 150) return "绿色";
  if (hue < 210) return "青色";
  if (hue < 270) return "蓝色";
  if (hue < 330) return "紫色";
  return "红色";
}

// ----------------------------------------------------------------------------
// 峰值提取
// ----------------------------------------------------------------------------

/** 局部波峰结构 */
interface LocalPeak {
  index: number;
  value: number;
  leftValley: number;
  rightValley: number;
}

/** 查找所有局部最大值 */
function findLocalPeaks(histogram: number[]): LocalPeak[] {
  const n = histogram.length;
  const peaks: LocalPeak[] = [];

  for (let i = 0; i < n; i++) {
    const prev = histogram[circularIndex(i - 1, n)];
    const curr = histogram[i];
    const next = histogram[circularIndex(i + 1, n)];

    if ((curr > prev && curr >= next) || (curr >= prev && curr > next)) {
      peaks.push({ index: i, value: curr, leftValley: -1, rightValley: -1 });
    }
  }

  return peaks;
}

/** 为波峰找到左右波谷 */
function findValleys(peaks: LocalPeak[], histogram: number[]): void {
  const n = histogram.length;

  // 只有一个波峰时，范围就是整个直方图
  if (peaks.length === 1) {
    peaks[0].leftValley = circularIndex(peaks[0].index + 1, n);
    peaks[0].rightValley = peaks[0].index;
    return;
  }

  for (let i = 0; i < peaks.length; i++) {
    const peak = peaks[i];
    const prevPeak = peaks[circularIndex(i - 1, peaks.length)];
    const nextPeak = peaks[circularIndex(i + 1, peaks.length)];

    // 左波谷：从波峰往左找到前一个波峰之间的最小值
    let leftValleyIdx = peak.index,
      leftValleyVal = peak.value;
    let j = circularIndex(peak.index - 1, n);
    while (j !== prevPeak.index) {
      if (histogram[j] < leftValleyVal) {
        leftValleyVal = histogram[j];
        leftValleyIdx = j;
      }
      j = circularIndex(j - 1, n);
    }
    peak.leftValley = leftValleyIdx;

    // 右波谷：从波峰往右找到下一个波峰之间的最小值
    let rightValleyIdx = peak.index,
      rightValleyVal = peak.value;
    j = circularIndex(peak.index + 1, n);
    while (j !== nextPeak.index) {
      if (histogram[j] < rightValleyVal) {
        rightValleyVal = histogram[j];
        rightValleyIdx = j;
      }
      j = circularIndex(j + 1, n);
    }
    peak.rightValley = rightValleyIdx;
  }
}

/** 合并相邻波峰（基于谷值比例和色相距离） */
function mergeAdjacentPeaks(
  peaks: LocalPeak[],
  histogram: number[],
  maxPeaks: number
): void {
  const n = histogram.length;

  const hueDistance = (idx1: number, idx2: number): number => {
    const diff = Math.abs(idx2 - idx1);
    return Math.min(diff, n - diff);
  };

  while (peaks.length > maxPeaks) {
    let bestIdx = -1,
      bestScore = -1;

    for (let i = 0; i < peaks.length; i++) {
      const curr = peaks[i];
      const next = peaks[(i + 1) % peaks.length];

      const valleyValue = histogram[curr.rightValley];
      const minPeakValue = Math.min(curr.value, next.value);

      if (minPeakValue > 0) {
        const valleyRatio = valleyValue / minPeakValue;
        const distance = hueDistance(curr.index, next.index);
        const distanceFactor = 1 - distance / (n / 2);
        const score = valleyRatio * (0.5 + 0.5 * distanceFactor);

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }
    }

    if (bestIdx >= 0) {
      const curr = peaks[bestIdx];
      const nextIdx = (bestIdx + 1) % peaks.length;
      const next = peaks[nextIdx];

      if (curr.value >= next.value) {
        curr.rightValley = next.rightValley;
        peaks.splice(nextIdx, 1);
      } else {
        next.leftValley = curr.leftValley;
        peaks.splice(bestIdx, 1);
      }
    } else {
      break;
    }
  }
}

/** 将 LocalPeak 转换为 HuePeak */
function convertToHuePeaks(
  localPeaks: LocalPeak[],
  histogram: number[],
  saturationSum: number[],
  lightnessSum: number[]
): HuePeak[] {
  const n = histogram.length;

  return localPeaks.map((peak) => {
    const startHue = circularIndex(peak.leftValley, n);
    const endHue = circularIndex(peak.rightValley, n);

    let totalWeight = 0,
      totalSat = 0,
      totalLight = 0;
    let j = startHue;
    while (true) {
      totalWeight += histogram[j];
      totalSat += saturationSum[j];
      totalLight += lightnessSum[j];
      if (j === endHue) break;
      j = circularIndex(j + 1, n);
    }

    return {
      startHue,
      endHue,
      peakHue: peak.index,
      peakValue: peak.value,
      totalWeight,
      avgSaturation: totalWeight > 0 ? totalSat / totalWeight : 50,
      avgLightness: totalWeight > 0 ? totalLight / totalWeight : 50,
    };
  });
}

/** 使用 CIEDE2000 合并感知相似的颜色 */
function mergeSimilarColors(
  peaks: HuePeak[],
  deltaEThreshold: number = 10
): HuePeak[] {
  const merged: HuePeak[] = [];

  // 计算色相差（考虑循环）
  const hueDiff = (h1: number, h2: number): number => {
    const diff = Math.abs(h1 - h2);
    return Math.min(diff, 360 - diff);
  };

  for (const peak of peaks) {
    const [r, g, b] = hslToRgb(
      peak.peakHue,
      peak.avgSaturation,
      peak.avgLightness
    );
    const lab = rgbToLab(r, g, b);

    // 查找相似的已有波峰
    let target: HuePeak | null = null;
    for (const existing of merged) {
      // 色相差异太大则不合并（超过 30° 不合并）
      if (hueDiff(peak.peakHue, existing.peakHue) > 30) continue;

      const [er, eg, eb] = hslToRgb(
        existing.peakHue,
        existing.avgSaturation,
        existing.avgLightness
      );
      if (deltaE2000(lab, rgbToLab(er, eg, eb)) < deltaEThreshold) {
        target = existing;
        break;
      }
    }

    if (target) {
      // 合并到已有波峰
      const w1 = target.totalWeight,
        w2 = peak.totalWeight;
      const totalW = w1 + w2;

      // 扩展色相范围（正确处理跨越 0° 的情况）
      const mergeHueRanges = (
        s1: number,
        e1: number,
        s2: number,
        e2: number
      ): [number, number] => {
        // 将范围转换为点集合，考虑循环
        const inRange = (h: number, s: number, e: number): boolean => {
          if (s <= e) return h >= s && h <= e;
          return h >= s || h <= e;
        };

        // 检查两个范围是否已经包含对方
        const range1Contains2 = inRange(s2, s1, e1) && inRange(e2, s1, e1);
        const range2Contains1 = inRange(s1, s2, e2) && inRange(e1, s2, e2);

        if (range1Contains2) return [s1, e1];
        if (range2Contains1) return [s2, e2];

        // 尝试两种连接方式，选择范围更小的
        // 方式1: s1 -> e2 (s1 在左，e2 在右)
        // 方式2: s2 -> e1 (s2 在左，e1 在右)
        const span1 = s1 <= e2 ? e2 - s1 : 360 - s1 + e2;
        const span2 = s2 <= e1 ? e1 - s2 : 360 - s2 + e1;

        if (span1 <= span2) {
          return [s1, e2];
        } else {
          return [s2, e1];
        }
      };

      const [newStart, newEnd] = mergeHueRanges(
        target.startHue,
        target.endHue,
        peak.startHue,
        peak.endHue
      );
      target.startHue = newStart;
      target.endHue = newEnd;

      target.totalWeight = totalW;
      target.avgSaturation =
        (target.avgSaturation * w1 + peak.avgSaturation * w2) / totalW;
      target.avgLightness =
        (target.avgLightness * w1 + peak.avgLightness * w2) / totalW;

      if (peak.peakValue > target.peakValue) {
        target.peakValue = peak.peakValue;
        target.peakHue = peak.peakHue;
      }
    } else {
      merged.push({ ...peak });
    }
  }

  return merged;
}

/** 过滤权重过低的颜色 */
function filterByWeight(peaks: HuePeak[], minRatio: number = 0.01): HuePeak[] {
  const total = peaks.reduce((sum, p) => sum + p.totalWeight, 0);
  return peaks.filter((p) => p.totalWeight >= total * minRatio);
}

// ----------------------------------------------------------------------------
// 主函数：提取峰值
// ----------------------------------------------------------------------------

/**
 * 从直方图数据中提取主色调
 *
 * 流程：
 * 1. 查找局部最大值（波峰）
 * 2. 确定每个波峰的左右波谷
 * 3. 基于谷值比例和色相距离合并相邻波峰
 * 4. 转换为 HuePeak 格式，计算平均饱和度/亮度
 * 5. 使用 CIEDE2000 合并感知相似的颜色
 * 6. 过滤权重过低的颜色
 */
export function extractPeaks(
  histogramData: HistogramData,
  maxPeaks: number = 5
): HuePeak[] {
  const { histogram, saturationSum, lightnessSum } = histogramData;
  const n = histogram.length;
  if (n === 0) return [];

  // 1. 查找局部最大值
  const localPeaks = findLocalPeaks(histogram);

  if (localPeaks.length === 0) {
    const maxIdx = histogram.indexOf(Math.max(...histogram));
    const totalWeight = histogram.reduce((a, b) => a + b, 0);
    const totalSat = saturationSum.reduce((a, b) => a + b, 0);
    const totalLight = lightnessSum.reduce((a, b) => a + b, 0);
    return [
      {
        startHue: 0,
        endHue: 0,
        peakHue: maxIdx,
        peakValue: histogram[maxIdx],
        totalWeight,
        avgSaturation: totalWeight > 0 ? totalSat / totalWeight : 50,
        avgLightness: totalWeight > 0 ? totalLight / totalWeight : 50,
      },
    ];
  }

  // 2. 确定波谷
  findValleys(localPeaks, histogram);

  // 3. 合并相邻波峰
  mergeAdjacentPeaks(localPeaks, histogram, maxPeaks);

  // 4. 转换格式
  let peaks = convertToHuePeaks(
    localPeaks,
    histogram,
    saturationSum,
    lightnessSum
  );
  peaks.sort((a, b) => b.peakValue - a.peakValue);

  // 5. CIEDE2000 合并相似颜色
  peaks = mergeSimilarColors(peaks, 10);

  // 6. 过滤低权重
  peaks = filterByWeight(peaks, 0.01);
  peaks.sort((a, b) => b.totalWeight - a.totalWeight);

  return peaks;
}
