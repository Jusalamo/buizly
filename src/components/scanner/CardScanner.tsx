import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  Camera,
  Loader2,
  Save,
  RotateCcw,
  Flame,
  HandMetal,
  Archive,
  Download,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Priority = "hot" | "warm" | "cold";

interface ExtractedContact {
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

type ScanStep = "camera" | "extracting" | "edit" | "saved";

const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    value: "hot",
    label: "Hot",
    icon: <Flame className="h-4 w-4" />,
    color: "bg-red-500/20 text-red-400 border-red-500/40",
  },
  {
    value: "warm",
    label: "Warm",
    icon: <HandMetal className="h-4 w-4" />,
    color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  },
  {
    value: "cold",
    label: "Cold",
    icon: <Archive className="h-4 w-4" />,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
];

function generateVCard(contact: ExtractedContact): string {
  const nameParts = contact.name.split(" ");
  const lastName = nameParts.length > 1 ? nameParts.pop() : "";
  const firstName = nameParts.join(" ");
  
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${contact.name}`,
    `N:${lastName};${firstName};;;`,
    contact.company ? `ORG:${contact.company}` : "",
    contact.title ? `TITLE:${contact.title}` : "",
    contact.phone ? `TEL;TYPE=WORK:${contact.phone}` : "",
    contact.email ? `EMAIL:${contact.email}` : "",
    contact.website ? `URL:${contact.website.startsWith("http") ? contact.website : `https://${contact.website}`}` : "",
    contact.address ? `ADR;TYPE=WORK:;;${contact.address};;;;` : "",
    "END:VCARD",
  ].filter(Boolean).join("\r\n");
}

function downloadVCard(contact: ExtractedContact) {
  const vcf = generateVCard(contact);
  const blob = new Blob([vcf], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${contact.name.replace(/\s+/g, "_")}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CardScanner() {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<ScanStep>("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [contact, setContact] = useState<ExtractedContact>({
    name: "", company: "", title: "", phone: "", email: "", address: "", website: "",
  });
  const [priority, setPriority] = useState<Priority>("warm");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedConnectionId, setSavedConnectionId] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast({
        title: "Camera access required",
        description: "Please allow camera access to scan business cards",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    setStep("extracting");

    // Call OCR edge function
    try {
      const { data, error } = await supabase.functions.invoke("ocr-extract", {
        body: { image: dataUrl },
      });

      if (error) throw error;

      if (data?.fields) {
        setContact(data.fields);
      }
      setStep("edit");
    } catch (err) {
      console.error("OCR extraction failed:", err);
      toast({
        title: "Extraction failed",
        description: "Could not read the card. You can fill in the details manually.",
      });
      setStep("edit");
    }
  }, [stopCamera, toast]);

  const handleSave = async () => {
    if (!contact.name) {
      toast({ title: "Name required", description: "Please enter a contact name", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upload card image if available
      let cardImageUrl: string | null = null;
      if (capturedImage) {
        const base64 = capturedImage.replace(/^data:image\/[a-z]+;base64,/, "");
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("card-images")
          .upload(fileName, bytes, { contentType: "image/jpeg" });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("card-images").getPublicUrl(fileName);
          cardImageUrl = urlData.publicUrl;
        }
      }

      // Save connection
      const { data: conn, error } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          connection_name: contact.name,
          connection_email: contact.email || null,
          connection_phone: contact.phone || null,
          connection_title: contact.title || null,
          connection_company: contact.company || null,
          notes: [notes, contact.address, contact.website].filter(Boolean).join("\n"),
          priority,
        })
        .select("id")
        .single();

      if (error) throw error;

      setSavedConnectionId(conn.id);
      setStep("saved");
      toast({ title: "Contact saved!", description: `${contact.name} saved as ${priority} lead` });
    } catch (err: any) {
      toast({ title: "Error saving", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCapturedImage(null);
    setContact({ name: "", company: "", title: "", phone: "", email: "", address: "", website: "" });
    setNotes("");
    setPriority("warm");
    setSavedConnectionId(null);
    setStep("camera");
    startCamera();
  };

  const updateField = (field: keyof ExtractedContact, value: string) => {
    setContact((prev) => ({ ...prev, [field]: value }));
  };

  // Saved confirmation
  if (step === "saved") {
    return (
      <Card className="bg-card border-border p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center">
          <Save className="h-8 w-8 text-primary" />
        </div>
        <h3 className="font-semibold text-foreground text-lg">{contact.name} saved!</h3>
        <p className="text-muted-foreground text-sm">Contact added to your network</p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => downloadVCard(contact)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download vCard
          </Button>
          {contact.phone && (
            <Button
              onClick={() => window.open(`https://wa.me/${contact.phone.replace(/\D/g, "")}`, "_blank")}
              variant="outline"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Message on WhatsApp
            </Button>
          )}
          <Button onClick={handleReset} className="bg-primary text-primary-foreground gap-2">
            <Camera className="h-4 w-4" />
            Scan Another Card
          </Button>
        </div>
      </Card>
    );
  }

  // Camera view
  if (step === "camera") {
    return (
      <Card className="bg-card border-border p-4 relative overflow-hidden">
        {cameraActive ? (
          <>
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full rounded-lg aspect-[3/2] object-cover"
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[85%] h-[75%] border-2 border-dashed border-primary/70 rounded-xl flex items-center justify-center">
                  <span className="text-primary/80 text-sm font-medium bg-background/60 px-3 py-1 rounded-full">
                    Align card here
                  </span>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-2 mt-3">
              <Button onClick={() => { stopCamera(); setCameraActive(false); }} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button onClick={capturePhoto} className="flex-1 gap-2 bg-primary text-primary-foreground">
                <Camera className="h-4 w-4" />
                Capture
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 space-y-4">
            <CreditCard className="h-16 w-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Scan a physical business card</p>
            <Button onClick={startCamera} className="bg-primary text-primary-foreground gap-2">
              <Camera className="h-4 w-4" />
              Open Camera
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // Extracting state
  if (step === "extracting") {
    return (
      <Card className="bg-card border-border p-8 text-center space-y-4">
        {capturedImage && (
          <img src={capturedImage} alt="Captured card" className="w-full rounded-lg aspect-[3/2] object-cover opacity-60" />
        )}
        <div className="flex flex-col items-center gap-3 py-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-foreground font-medium">Extracting details...</p>
          <p className="text-muted-foreground text-sm">Reading text from the business card</p>
        </div>
      </Card>
    );
  }

  // Edit form
  return (
    <div className="space-y-4">
      {capturedImage && (
        <Card className="bg-card border-border p-2 overflow-hidden">
          <img src={capturedImage} alt="Scanned card" className="w-full rounded-lg aspect-[3/2] object-cover" />
        </Card>
      )}

      <Card className="bg-card border-border p-4 space-y-4">
        <h3 className="font-semibold text-foreground">Contact Details</h3>
        <div className="grid gap-3">
          {([
            ["name", "Name"],
            ["company", "Company"],
            ["title", "Title"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["address", "Address"],
            ["website", "Website"],
          ] as [keyof ExtractedContact, string][]).map(([field, label]) => (
            <div key={field} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input value={contact[field]} onChange={(e) => updateField(field, e.target.value)} className="h-9" />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add context about this contact..." className="min-h-[60px]" />
          </div>
        </div>
      </Card>

      {/* Priority Selector */}
      <Card className="bg-card border-border p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">How hot is this lead?</h3>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPriority(opt.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                priority === opt.value
                  ? opt.color + " border-current"
                  : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleReset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Rescan
        </Button>
        <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2 bg-primary text-primary-foreground">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save Contact"}
        </Button>
      </div>
    </div>
  );
}
