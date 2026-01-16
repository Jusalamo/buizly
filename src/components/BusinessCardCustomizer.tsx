import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, Check, QrCode, CreditCard, Upload, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CARD_TEMPLATES = [
  { 
    id: "default", 
    name: "Classic", 
    primary: "#00ff4d", 
    background: "#000000", 
    style: "minimal"
  },
  { 
    id: "ocean", 
    name: "Ocean", 
    primary: "#00d4ff", 
    background: "#0a1628", 
    style: "gradient"
  },
  { 
    id: "sunset", 
    name: "Sunset", 
    primary: "#ff6b35", 
    background: "#1a0a05", 
    style: "warm"
  },
  { 
    id: "royal", 
    name: "Royal", 
    primary: "#a855f7", 
    background: "#0d0015", 
    style: "elegant"
  },
  { 
    id: "gold", 
    name: "Executive", 
    primary: "#fbbf24", 
    background: "#1a1500", 
    style: "premium"
  },
  { 
    id: "minimal", 
    name: "Minimal", 
    primary: "#000000", 
    background: "#ffffff", 
    style: "clean"
  },
];

interface CardCustomization {
  templateId: string;
  qrForeground: string;
  qrBackground: string;
  logoUrl?: string;
  accentColor: string;
}

interface BusinessCardCustomizerProps {
  onSave?: (customization: CardCustomization) => Promise<void>;
}

export function BusinessCardCustomizer({ onSave }: BusinessCardCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "qr" | "branding">("templates");
  const { toast } = useToast();
  
  const [customization, setCustomization] = useState<CardCustomization>({
    templateId: "default",
    qrForeground: "#00ff4d",
    qrBackground: "#000000",
    accentColor: "#00ff4d",
  });
  const [saving, setSaving] = useState(false);

  const selectedTemplate = CARD_TEMPLATES.find(t => t.id === customization.templateId) || CARD_TEMPLATES[0];

  const handleTemplateSelect = (template: typeof CARD_TEMPLATES[0]) => {
    setCustomization({
      ...customization,
      templateId: template.id,
      qrForeground: template.primary,
      qrBackground: template.background,
      accentColor: template.primary,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(customization);
      }
      toast({
        title: "Customization saved",
        description: "Your business card has been updated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save customization",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Business Card Customization</h3>
          <p className="text-sm text-muted-foreground">Personalize your digital business card</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3 bg-secondary mb-6">
          <TabsTrigger 
            value="templates" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger 
            value="qr"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
          >
            <QrCode className="h-3 w-3 mr-1" />
            QR Code
          </TabsTrigger>
          <TabsTrigger 
            value="branding"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
          >
            <Palette className="h-3 w-3 mr-1" />
            Colors
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {CARD_TEMPLATES.map((template) => {
              const isSelected = template.id === customization.templateId;
              return (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`relative aspect-[1.6/1] rounded-lg border-2 p-4 transition-all ${
                    isSelected
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                  style={{ backgroundColor: template.background }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-8 h-8 rounded-lg"
                      style={{ backgroundColor: template.primary }}
                    />
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p
                    className="absolute bottom-3 left-4 text-sm font-medium"
                    style={{ color: template.primary }}
                  >
                    {template.name}
                  </p>
                </button>
              );
            })}
          </div>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                QR Code Color
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customization.qrForeground}
                  onChange={(e) => setCustomization(c => ({ ...c, qrForeground: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={customization.qrForeground}
                  onChange={(e) => setCustomization(c => ({ ...c, qrForeground: e.target.value }))}
                  className="flex-1 bg-background border-border text-foreground uppercase text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                QR Background
              </Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={customization.qrBackground}
                  onChange={(e) => setCustomization(c => ({ ...c, qrBackground: e.target.value }))}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  value={customization.qrBackground}
                  onChange={(e) => setCustomization(c => ({ ...c, qrBackground: e.target.value }))}
                  className="flex-1 bg-background border-border text-foreground uppercase text-xs"
                />
              </div>
            </div>
          </div>

          {/* QR Preview */}
          <div
            className="p-4 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: customization.qrBackground }}
          >
            <div
              className="w-24 h-24 rounded grid grid-cols-5 grid-rows-5 gap-0.5 p-2"
              style={{ backgroundColor: customization.qrBackground }}
            >
              {[...Array(25)].map((_, i) => {
                const shouldFill = [0, 1, 2, 5, 6, 10, 11, 12, 14, 18, 20, 22, 23, 24].includes(i);
                return (
                  <div
                    key={i}
                    className="rounded-sm"
                    style={{
                      backgroundColor: shouldFill ? customization.qrForeground : customization.qrBackground,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Accent Color
            </Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customization.accentColor}
                onChange={(e) => setCustomization(c => ({ ...c, accentColor: e.target.value }))}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={customization.accentColor}
                onChange={(e) => setCustomization(c => ({ ...c, accentColor: e.target.value }))}
                className="flex-1 bg-background border-border text-foreground uppercase"
              />
            </div>
          </div>

          {/* Logo Upload */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Company Logo (optional)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG up to 2MB
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Card Preview */}
      <div className="mt-6 pt-6 border-t border-border">
        <Label className="text-foreground mb-3 block">Preview</Label>
        <div
          className="aspect-[1.6/1] rounded-xl p-4 flex flex-col justify-between"
          style={{ 
            backgroundColor: selectedTemplate.background,
            border: `1px solid ${selectedTemplate.primary}20`
          }}
        >
          <div className="flex items-start justify-between">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${customization.accentColor}20` }}
            >
              <span 
                className="text-lg font-bold"
                style={{ color: customization.accentColor }}
              >
                B
              </span>
            </div>
            <div
              className="w-12 h-12 rounded grid grid-cols-4 grid-rows-4 gap-0.5"
              style={{ backgroundColor: customization.qrBackground }}
            >
              {[...Array(16)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{
                    backgroundColor: [0, 1, 4, 5, 10, 11, 14, 15].includes(i) 
                      ? customization.qrForeground 
                      : customization.qrBackground,
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <p 
              className="font-semibold text-sm"
              style={{ color: customization.accentColor }}
            >
              Your Name
            </p>
            <p 
              className="text-xs opacity-70"
              style={{ color: customization.accentColor }}
            >
              Job Title • Company
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saving ? "Saving..." : "Save Customization"}
      </Button>
    </Card>
  );
}