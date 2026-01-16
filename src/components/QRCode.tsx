import { useState, useEffect } from "react";

interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
  customColors?: {
    foreground?: string;
    background?: string;
  };
}

export const QRCode = ({ url, size = 300, className = "", customColors }: QRCodeProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Use custom colors or default neon green on black - no paywall
  const fgColor = customColors?.foreground 
    ? customColors.foreground.replace("#", "") 
    : "00ff4d";
  const bgColor = customColors?.background 
    ? customColors.background.replace("#", "") 
    : "000000";
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=${bgColor}&color=${fgColor}`;
  
  // Preload image for instant display
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.onload = () => {
      setImageSrc(qrUrl);
      setImageLoaded(true);
    };
    img.onerror = () => {
      // Still show the image even if preload fails
      setImageSrc(qrUrl);
      setImageLoaded(true);
    };
    img.src = qrUrl;
  }, [qrUrl]);
  
  return (
    <div 
      className={`p-4 rounded-lg ${className}`}
      style={{ backgroundColor: `#${bgColor}` }}
    >
      {!imageLoaded ? (
        // Skeleton placeholder while loading
        <div 
          className="w-full h-full animate-pulse rounded"
          style={{ 
            aspectRatio: '1/1',
            backgroundColor: `#${fgColor}20`,
            minWidth: size > 200 ? 140 : size,
            minHeight: size > 200 ? 140 : size
          }}
        />
      ) : (
        <img 
          src={imageSrc || qrUrl} 
          alt="QR Code" 
          className="w-full h-full"
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </div>
  );
};