import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, CreditCard, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useConnectionRequests } from "@/hooks/useConnectionRequests";
import { useAppCache } from "@/hooks/useAppCache";

export default function QuickScan() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sendRequest, getRequestStatus } = useConnectionRequests();

  const [mode, setMode] = useState<"qr" | "card">("qr");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  // Auto-start scanning on mount
  useEffect(() => {
    if (initialized && isAuthenticated && mode === "qr") {
      startScanning();
    }
    return () => stopScanning();
  }, [initialized, isAuthenticated, mode]);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      setScanning(true);

      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play();
          startDetecting();
        }
      }, 100);
    } catch (error) {
      toast({
        title: "Camera access required",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setScanning(false);
  };

  const startDetecting = () => {
    if (!('BarcodeDetector' in window)) {
      toast({
        title: "QR scanning not supported",
        description: "Your browser doesn't support QR code scanning. Try Chrome on Android or Safari on iOS.",
        variant: "destructive",
      });
      stopScanning();
      return;
    }

    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const url = barcodes[0].rawValue;
          handleScannedUrl(url);
          stopScanning();
        }
      } catch (err) {
        // Detection failed, continue scanning
      }
    }, 300);
  };

  const handleScannedUrl = async (url: string) => {
    const match = url.match(/\/u\/([a-f0-9-]+)/i);
    if (!match) {
      toast({
        title: "Invalid QR code",
        description: "This doesn't appear to be a Buizly QR code",
        variant: "destructive",
      });
      return;
    }

    const targetUserId = match[1];

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === targetUserId) {
      toast({ title: "That's your own QR code!" });
      return;
    }

    const status = getRequestStatus(targetUserId);
    if (status === 'accepted') {
      toast({ title: "Already connected", description: "You're already connected with this person" });
      navigate(`/u/${targetUserId}`);
      return;
    }
    if (status === 'pending') {
      toast({ title: "Request already sent", description: "Waiting for them to accept" });
      return;
    }

    const result = await sendRequest(targetUserId);
    if (result.success) {
      toast({
        title: "Connection request sent!",
        description: "They'll be notified of your request",
      });
      navigate(`/u/${targetUserId}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quick Scan</h1>
            <p className="text-muted-foreground text-sm">Scan a QR code or business card</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "qr" ? "default" : "outline"}
            onClick={() => setMode("qr")}
            className="flex-1 gap-2"
          >
            <QrCode className="h-4 w-4" />
            QR Mode
          </Button>
          <Button
            variant={mode === "card" ? "default" : "outline"}
            onClick={() => { stopScanning(); setMode("card"); }}
            className="flex-1 gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Card Mode
          </Button>
        </div>

        {/* QR Scanner */}
        {mode === "qr" && (
          <Card className="bg-card border-border p-4 relative overflow-hidden">
            {scanning ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full rounded-lg aspect-square object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-4 border-2 border-primary/50 rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary rounded-br-lg" />
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">Point your camera at a Buizly QR code</p>
                <Button onClick={stopScanning} variant="outline" className="w-full mt-3">
                  Stop Scanning
                </Button>
              </>
            ) : (
              <div className="text-center py-12 space-y-4">
                <QrCode className="h-16 w-16 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Camera stopped</p>
                <Button onClick={startScanning} className="bg-primary text-primary-foreground">
                  Start Scanning
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Card Mode placeholder */}
        {mode === "card" && (
          <Card className="bg-card border-border p-8 text-center">
            <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">Card Scanner</h3>
            <p className="text-sm text-muted-foreground">
              Business card OCR scanning coming soon. Use QR Mode for now.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
