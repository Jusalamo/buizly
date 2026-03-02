import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { QrCode, CreditCard, ArrowLeft } from "lucide-react";
import { useAppCache } from "@/hooks/useAppCache";
import { QRScanner } from "@/components/scanner/QRScanner";
import { CardScanner } from "@/components/scanner/CardScanner";

export default function QuickScan() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"qr" | "card">("qr");

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate("/auth", { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quick Scan</h1>
            <p className="text-muted-foreground text-sm">
              Scan a QR code or business card
            </p>
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
            onClick={() => setMode("card")}
            className="flex-1 gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Card Mode
          </Button>
        </div>

        {mode === "qr" && <QRScanner />}
        {mode === "card" && <CardScanner />}
      </div>
    </Layout>
  );
}
