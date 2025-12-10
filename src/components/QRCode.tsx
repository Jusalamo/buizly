import { useSubscription } from "@/hooks/useSubscription";

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
  const { getCurrentPlan } = useSubscription();
  const isPro = getCurrentPlan() === "pro" || getCurrentPlan() === "business";
  
  // Use custom colors if Pro, otherwise default neon green on black
  const fgColor = isPro && customColors?.foreground 
    ? customColors.foreground.replace("#", "") 
    : "00ff4d";
  const bgColor = isPro && customColors?.background 
    ? customColors.background.replace("#", "") 
    : "000000";
  
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=${bgColor}&color=${fgColor}`;
  
  return (
    <div 
      className={`p-4 rounded-lg ${className}`}
      style={{ backgroundColor: `#${bgColor}` }}
    >
      <img 
        src={qrUrl} 
        alt="QR Code" 
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
