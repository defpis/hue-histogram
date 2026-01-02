import { useRef, useCallback } from 'react';
import './ImageUploader.css';

interface ImageUploaderProps {
  imageUrl: string | null;
  onImageChange: (url: string) => void;
}

export function ImageUploader({ imageUrl, onImageChange }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onImageChange(url);
      }
    },
    [onImageChange]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        onImageChange(url);
      }
    },
    [onImageChange]
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="uploader-container">
      <div
        className={`upload-zone ${imageUrl ? 'has-image' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        {imageUrl ? (
          <div className="image-preview-wrapper">
            <img src={imageUrl} alt="Preview" className="image-preview" />
            <div className="image-overlay">
              <span className="overlay-text">点击或拖拽更换图片</span>
            </div>
          </div>
        ) : (
          <div className="upload-placeholder">
            <div className="upload-icon">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="upload-text">点击或拖拽上传图片</p>
            <p className="upload-hint">支持 JPG、PNG、GIF、WebP 格式</p>
          </div>
        )}
      </div>
    </div>
  );
}

