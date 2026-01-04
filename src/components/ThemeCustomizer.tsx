import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Lock, Check } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface ThemeCustomizerProps {
  qrForeground: string;
  qrBackground: string;
  onQrColorsChange: (foreground: string, background: string) => void;
  onSave: () => void;
  saving?: boolean;
}

const PRESET_THEMES = [
  { name: "Default", foreground: "#00ff4d", background: "#000000" },
  { name: "Ocean", foreground: "#00d4ff", background: "#0a1628" },
  { name: "Sunset", foreground: "#ff6b35", background: "#1a0a05" },
  { name: "Purple", foreground: "#a855f7", background: "#0d0015" },
  { name: "Gold", foreground: "#fbbf24", background: "#1a1500" },
  { name: "Minimal", foreground: "#000000", background: "#ffffff" },
];

export function ThemeCustomizer({
  qrForeground,
  qrBackground,
  onQrColorsChange,
  onSave,
  saving = false,
}: ThemeCustomizerProps) {
  const { getCurrentPlan, hasFeature } = useSubscription();
  const isPro = getCurrentPlan() === "pro" || getCurrentPlan() === "business";
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (!isPro) {
    return (
      <Card className="bg-card border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">QR Code Customization</h3>
            <p className="text-sm text-muted-foreground">Customize your QR code colors and branding</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="text-center p-4">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Pro feature</p>
              <Button
                size="sm"
                onClick={() => setShowUpgrade(true)}
                className="bg-primary text-primary-foreground"
              >
                Upgrade to Pro
              </Button>
            </div>
          </div>

          {/* Preview (blurred) */}
          <div className="opacity-50 pointer-events-none">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PRESET_THEMES.slice(0, 3).map((theme) => (
                <div
                  key={theme.name}
                  className="p-3 rounded-lg border border-border"
                  style={{ backgroundColor: theme.background }}
                >
                  <div
                    className="w-full h-8 rounded"
                    style={{ backgroundColor: theme.foreground }}
                  />
                  <p className="text-xs mt-2 text-center" style={{ color: theme.foreground }}>
                    {theme.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <UpgradePrompt
          open={showUpgrade}
          onOpenChange={setShowUpgrade}
          feature="qr_customization"
        />
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Palette className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">QR Code Customization</h3>
          <p className="text-sm text-muted-foreground">Customize your QR code colors</p>
        </div>
      </div>

      {/* Preset Themes */}
      <div className="mb-6">
        <Label className="text-foreground mb-3 block">Preset Themes</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_THEMES.map((theme) => {
            const isSelected =
              theme.foreground === qrForeground && theme.background === qrBackground;
            return (
              <button
                key={theme.name}
                onClick={() => onQrColorsChange(theme.foreground, theme.background)}
                className={`p-3 rounded-lg border transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
                style={{ backgroundColor: theme.background }}
              >
                <div className="relative">
                  <div
                    className="w-full h-8 rounded"
                    style={{ backgroundColor: theme.foreground }}
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-background" />
                    </div>
                  )}
                </div>
                <p
                  className="text-xs mt-2 text-center font-medium"
                  style={{ color: theme.foreground }}
                >
                  {theme.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="space-y-4 mb-6">
        <Label className="text-foreground">Custom Colors</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              QR Code Color
            </Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={qrForeground}
                onChange={(e) => onQrColorsChange(e.target.value, qrBackground)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={qrForeground}
                onChange={(e) => onQrColorsChange(e.target.value, qrBackground)}
                className="flex-1 bg-background border-border text-foreground uppercase"
                placeholder="#00ff4d"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Background Color
            </Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={qrBackground}
                onChange={(e) => onQrColorsChange(qrForeground, e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={qrBackground}
                onChange={(e) => onQrColorsChange(qrForeground, e.target.value)}
                className="flex-1 bg-background border-border text-foreground uppercase"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-6">
        <Label className="text-foreground mb-3 block">Preview</Label>
        <div
          className="p-4 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: qrBackground }}
        >
          <div
            className="w-24 h-24 rounded grid grid-cols-5 grid-rows-5 gap-0.5 p-2"
            style={{ backgroundColor: qrBackground }}
          >
            {/* Simplified QR pattern preview */}
            {[...Array(25)].map((_, i) => {
              const isCorner =
                (i < 3 && Math.floor(i / 5) < 1) ||
                (i % 5 < 3 && Math.floor(i / 5) < 3) ||
                (i % 5 > 1 && i % 5 < 5 && Math.floor(i / 5) > 1 && Math.floor(i / 5) < 4);
              const shouldFill = Math.random() > 0.4 || isCorner;
              return (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{
                    backgroundColor: shouldFill ? qrForeground : qrBackground,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <Button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saving ? "Saving..." : "Save Theme"}
      </Button>
    </Card>
  );
}
