import { useState, useEffect } from "react";
import { ImageUploader } from "./components/ImageUploader";
import { HueHistogram } from "./components/HueHistogram";
import {
  extractHueHistogram,
  gaussianSmooth,
  extractPeaks,
} from "./utils/colorUtils";
import type { HuePeak, HistogramData } from "./utils/colorUtils";
import "./App.css";

const DEFAULT_IMAGE = "/default-image.jpg";
const HISTOGRAM_BINS = 360;

function App() {
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_IMAGE);
  const [downsampledUrl, setDownsampledUrl] = useState<string>("");
  const [histogram, setHistogram] = useState<number[]>([]);
  const [histogramData, setHistogramData] = useState<HistogramData | null>(
    null
  );
  const [peaks, setPeaks] = useState<HuePeak[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [imageSize, setImageSize] = useState({ original: "", downsampled: "" });

  useEffect(() => {
    setIsLoading(true);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsLoading(false);
        return;
      }

      const originalWidth = img.width;
      const originalHeight = img.height;

      // 降采样限制为 256
      const maxSize = 256;
      let width = originalWidth;
      let height = originalHeight;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // 禁止平滑，使用最近邻插值
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);

      // 生成降采样图片的 URL
      const downsampledDataUrl = canvas.toDataURL("image/png");
      setDownsampledUrl(downsampledDataUrl);

      // 更新尺寸信息
      setImageSize({
        original: `${originalWidth} × ${originalHeight}`,
        downsampled: `${width} × ${height}`,
      });

      const imageData = ctx.getImageData(0, 0, width, height);
      const rawData = extractHueHistogram(imageData, HISTOGRAM_BINS);
      const smoothedHistogram = gaussianSmooth(rawData.histogram, 3);

      // 保存平滑后的直方图用于显示
      setHistogram(smoothedHistogram);
      // 保存完整数据用于峰值提取（使用平滑后的 histogram）
      setHistogramData({
        histogram: smoothedHistogram,
        saturationSum: rawData.saturationSum,
        lightnessSum: rawData.lightnessSum,
      });
      setIsLoading(false);
    };

    img.onerror = () => {
      console.error("Failed to load image");
      setIsLoading(false);
    };

    img.src = imageUrl;
  }, [imageUrl]);

  // 当 histogramData 变化时计算峰值（最多 5 个）
  useEffect(() => {
    if (histogramData) {
      const detectedPeaks = extractPeaks(histogramData, 5);
      setPeaks(detectedPeaks);
    }
  }, [histogramData]);

  const handleImageChange = (url: string) => {
    setImageUrl(url);
  };

  return (
    <div className="app">
      <div className="background-gradient" />
      <div className="background-noise" />

      <header className="header">
        <h1 className="title">
          <span className="title-icon">◐</span>
          色相直方图分析器
        </h1>
        <p className="subtitle">上传图片，探索其色彩分布</p>
      </header>

      <main className="main">
        <div className="left-panel">
          <div className="image-card">
            <h3 className="image-label">原始图片</h3>
            <div className="image-wrapper">
              <ImageUploader
                imageUrl={imageUrl}
                onImageChange={handleImageChange}
              />
            </div>
            <span className="image-size">{imageSize.original}</span>
          </div>
        </div>

        <div className="right-panel">
          <section className="histogram-section">
            {isLoading ? (
              <div className="loading">
                <div className="loading-spinner" />
                <span>分析中...</span>
              </div>
            ) : histogram.length > 0 ? (
              <HueHistogram
                histogram={histogram}
                bins={HISTOGRAM_BINS}
                peaks={peaks}
              />
            ) : null}
          </section>

          <div className="image-card">
            <h3 className="image-label">降采样图片</h3>
            <div className="image-wrapper">
              {downsampledUrl ? (
                <img
                  src={downsampledUrl}
                  alt="Downsampled"
                  className="downsampled-image"
                />
              ) : (
                <div className="placeholder">处理中...</div>
              )}
            </div>
            <span className="image-size">{imageSize.downsampled}</span>
          </div>

          {/* {peaks.length > 0 && (
            <div className="peaks-colors">
              <h3 className="image-label">提取的主色调</h3>
              <div className="color-swatches">
                {peaks.slice(0, 8).map((peak, index) => (
                  <div
                    key={index}
                    className="color-swatch"
                    style={{
                      backgroundColor: `hsl(${peak.peakHue}, 70%, 50%)`,
                    }}
                    title={`${peak.peakHue}° (${peak.startHue}°-${peak.endHue}°)`}
                  />
                ))}
              </div>
            </div>
          )} */}
        </div>
      </main>

      <footer className="footer">
        <p>拖拽或点击上传区域更换图片</p>
      </footer>
    </div>
  );
}

export default App;
