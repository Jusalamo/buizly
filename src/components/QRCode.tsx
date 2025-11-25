interface QRCodeProps {
  url: string;
  size?: number;
  className?: string;
}

export const QRCode = ({ url, size = 300, className = "" }: QRCodeProps) => {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&bgcolor=000000&color=00ff4d`;
  
  return (
    <div className={`bg-black p-4 rounded-lg ${className}`}>
      <img 
        src={qrUrl} 
        alt="QR Code" 
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};
