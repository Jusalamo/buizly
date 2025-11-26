import { useState, useRef } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PhotoUploaderProps {
  meetingId: string;
  existingPhotos?: string[];
  onPhotosChange?: (urls: string[]) => void;
}

export function PhotoUploader({ meetingId, existingPhotos = [], onPhotosChange }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Validate file
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select an image file");
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error("Image size must be less than 5MB");
      }

      const fileName = `${user.id}/${meetingId}/photo-${Date.now()}.${file.name.split(".").pop()}`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-media")
        .upload(fileName, file, {
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("meeting-media")
        .getPublicUrl(fileName);

      const newPhotos = [...photos, publicUrl];
      setPhotos(newPhotos);
      
      if (onPhotosChange) {
        onPhotosChange(newPhotos);
      }

      toast({
        title: "Photo uploaded",
        description: "Your photo has been saved successfully"
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadPhoto(file);
    }
    e.target.value = "";
  };

  const removePhoto = async (url: string) => {
    const newPhotos = photos.filter(p => p !== url);
    setPhotos(newPhotos);
    
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }

    toast({
      title: "Photo removed",
      description: "The photo has been deleted"
    });
  };

  return (
    <div className="bg-card-surface rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Photos</h4>
        {uploading && (
          <span className="text-xs text-primary animate-pulse">Uploading...</span>
        )}
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={url}
                alt={`Meeting photo ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(url)}
                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full"
              >
                <X className="h-3 w-3 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Buttons */}
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <Button
          onClick={() => cameraInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="flex-1 border-primary text-primary"
        >
          <Camera className="h-4 w-4 mr-2" />
          Camera
        </Button>
        
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          variant="outline"
          className="flex-1 border-border text-foreground"
        >
          <Upload className="h-4 w-4 mr-2" />
          Gallery
        </Button>
      </div>

      {photos.length === 0 && (
        <div className="text-center py-4 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No photos added yet</p>
        </div>
      )}
    </div>
  );
}
