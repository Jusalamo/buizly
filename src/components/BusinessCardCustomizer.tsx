import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Palette, Check, QrCode, CreditCard, Upload, Sparkles, X, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CARD_TEMPLATES = [
  { id: "default", name: "Classic", primary: "#00ff4d", background: "#000000", style: "minimal" },
  { id: "ocean", name: "Ocean", primary: "#00d4ff", background: "#0a1628", style: "gradient" },
  { id: "sunset", name: "Sunset", primary: "#ff6b35", background: "#1a0a05", style: "warm" },
  { id: "royal", name: "Royal", primary: "#a855f7", background: "#0d0015", style: "elegant" },
  { id: "gold", name: "Executive", primary: "#fbbf24", background: "#1a1500", style: "premium" },
  { id: "minimal", name: "Minimal", primary: "#000000", background: "#ffffff", style: "clean" },
];

export interface CardCustomization {
  templateId: string;
  qrForeground: string;
  qrBackground: string;
  logoUrl?: string;
  accentColor: string;
}

interface BusinessCardCustomizerProps {
  onSave?: (customization: CardCustomization) => Promise<void>;
  initialCustomization?: Partial<CardCustomization>;
}

export function BusinessCardCustomizer({ onSave, initialCustomization }: BusinessCardCustomizerProps) {
  const [activeTab, setActiveTab] = useState<"templates" | "qr" | "branding">("templates");
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profile for preview
  const [profileData, setProfileData] = useState<{ full_name: string; job_title: string | null; company: string | null; email: string; phone: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('full_name, job_title, company, email, phone').eq('id', user.id).maybeSingle();
      if (data) setProfileData(data);
    })();
  }, []);
  
  const [customization, setCustomization] = useState<CardCustomization>({
    templateId: initialCustomization?.templateId || "default",
    qrForeground: initialCustomization?.qrForeground || "#00ff4d",
    qrBackground: initialCustomization?.qrBackground || "#000000",
    accentColor: initialCustomization?.accentColor || "#00ff4d",
    logoUrl: initialCustomization?.logoUrl,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title: 'Invalid file', description: 'Please upload an image file', variant: 'destructive' }); return; }
    if (file.size > 2 * 1024 * 1024) { toast({ title: 'File too large', description: 'Please upload an image under 2MB', variant: 'destructive' }); return; }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setCustomization(c => ({ ...c, logoUrl: publicUrl }));
      toast({ title: 'Logo uploaded' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeLogo = () => setCustomization(c => ({ ...c, logoUrl: undefined }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (onSave) {
        await onSave(customization);
      }
      toast({ title: "Customization saved", description: "Your business card has been updated" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save customization", variant: "destructive" });
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
          <TabsTrigger value="templates" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <Sparkles className="h-3 w-3 mr-1" />Templates
          </TabsTrigger>
          <TabsTrigger value="qr" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <QrCode className="h-3 w-3 mr-1" />QR Code
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs">
            <Palette className="h-3 w-3 mr-1" />Colors
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
                  className={`relative aspect-[1.6/1] rounded-lg border-2 p-4 transition-all ${isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                  style={{ backgroundColor: template.background }}
                >
                  <div className="flex items-start justify-between">
                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: template.primary }} />
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="absolute bottom-3 left-4 text-sm font-medium" style={{ color: template.primary }}>{template.name}</p>
                </button>
              );
            })}
          </div>
        </TabsContent>

        {/* QR Code Tab */}
        <TabsContent value="qr" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">QR Code Color</Label>
              <div className="flex gap-2">
                <Input type="color" value={customization.qrForeground} onChange={(e) => setCustomization(c => ({ ...c, qrForeground: e.target.value }))} className="w-12 h-10 p-1 cursor-pointer" />
                <Input type="text" value={customization.qrForeground} onChange={(e) => setCustomization(c => ({ ...c, qrForeground: e.target.value }))} className="flex-1 bg-background border-border text-foreground uppercase text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">QR Background</Label>
              <div className="flex gap-2">
                <Input type="color" value={customization.qrBackground} onChange={(e) => setCustomization(c => ({ ...c, qrBackground: e.target.value }))} className="w-12 h-10 p-1 cursor-pointer" />
                <Input type="text" value={customization.qrBackground} onChange={(e) => setCustomization(c => ({ ...c, qrBackground: e.target.value }))} className="flex-1 bg-background border-border text-foreground uppercase text-xs" />
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg flex items-center justify-center" style={{ backgroundColor: customization.qrBackground }}>
            <div className="w-24 h-24 rounded grid grid-cols-5 grid-rows-5 gap-0.5 p-2" style={{ backgroundColor: customization.qrBackground }}>
              {[...Array(25)].map((_, i) => {
                const shouldFill = [0, 1, 2, 5, 6, 10, 11, 12, 14, 18, 20, 22, 23, 24].includes(i);
                return <div key={i} className="rounded-sm" style={{ backgroundColor: shouldFill ? customization.qrForeground : customization.qrBackground }} />;
              })}
            </div>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Accent Color</Label>
            <div className="flex gap-2">
              <Input type="color" value={customization.accentColor} onChange={(e) => setCustomization(c => ({ ...c, accentColor: e.target.value }))} className="w-12 h-10 p-1 cursor-pointer" />
              <Input type="text" value={customization.accentColor} onChange={(e) => setCustomization(c => ({ ...c, accentColor: e.target.value }))} className="flex-1 bg-background border-border text-foreground uppercase" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Company Logo (optional)</Label>
            {customization.logoUrl ? (
              <div className="relative border border-border rounded-lg p-4 flex items-center gap-4">
                <img src={customization.logoUrl} alt="Company logo" className="w-16 h-16 object-contain rounded" />
                <div className="flex-1"><p className="text-sm text-foreground">Logo uploaded</p><p className="text-xs text-muted-foreground">Click to replace or remove</p></div>
                <Button variant="ghost" size="icon" onClick={removeLogo} className="absolute top-2 right-2 h-6 w-6"><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
                {uploading ? <Loader2 className="h-8 w-8 text-primary mx-auto mb-2 animate-spin" /> : <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />}
                <p className="text-sm text-muted-foreground">{uploading ? 'Uploading...' : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
          </div>
        </TabsContent>
      </Tabs>

      {/* Mini Card Preview with Real Data */}
      <div className="mt-6 pt-6 border-t border-border">
        <Label className="text-foreground mb-3 block text-xs text-muted-foreground">Card Preview</Label>
        <div
          className="aspect-[1.8/1] rounded-xl p-4 flex flex-col justify-between"
          style={{ backgroundColor: selectedTemplate.background, border: `1px solid ${selectedTemplate.primary}20` }}
        >
          <div className="flex items-start justify-between">
            {customization.logoUrl ? (
              <img src={customization.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${customization.accentColor}20` }}>
                <span className="text-lg font-bold" style={{ color: customization.accentColor }}>
                  {profileData?.full_name?.charAt(0) || 'B'}
                </span>
              </div>
            )}
            <div className="w-10 h-10 rounded bg-white flex items-center justify-center">
              <QrCode className="h-6 w-6" style={{ color: customization.qrForeground }} />
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: customization.accentColor }}>
              {profileData?.full_name || 'Your Name'}
            </p>
            <p className="text-xs opacity-70" style={{ color: customization.accentColor }}>
              {[profileData?.job_title, profileData?.company].filter(Boolean).join(' • ') || 'Job Title • Company'}
            </p>
            {profileData?.email && (
              <p className="text-[10px] opacity-50 mt-0.5" style={{ color: customization.accentColor }}>{profileData.email}</p>
            )}
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
        {saving ? "Saving..." : "Save Customization"}
      </Button>
    </Card>
  );
}
