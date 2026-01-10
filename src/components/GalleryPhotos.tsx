import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryPhotosProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  editable?: boolean;
}

export function GalleryPhotos({ 
  photos, 
  onChange, 
  maxPhotos = 3, 
  editable = true 
}: GalleryPhotosProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    if (photos.length >= maxPhotos) {
      toast({
        title: "Maximum reached",
        description: `You can only add up to ${maxPhotos} gallery photos`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/gallery-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('gallery').getPublicUrl(fileName);
      const newPhotoUrl = `${data.publicUrl}?t=${Date.now()}`;
      
      onChange([...photos, newPhotoUrl]);

      toast({
        title: "Photo added",
        description: "Gallery photo uploaded successfully"
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
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      handleUpload(file);
    }
    // Reset input
    e.target.value = '';
  };

  const removePhoto = async (index: number) => {
    const photoUrl = photos[index];
    try {
      // Extract path from URL
      const urlParts = new URL(photoUrl);
      const path = urlParts.pathname.split('/gallery/')[1]?.split('?')[0];
      
      if (path) {
        await supabase.storage.from('gallery').remove([path]);
      }
    } catch (error) {
      console.error('Error removing photo from storage:', error);
    }
    
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
    
    toast({
      title: "Photo removed",
      description: "Gallery photo deleted"
    });
  };

  // View-only mode
  if (!editable) {
    if (photos.length === 0) return null;
    
    return (
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="aspect-square rounded-lg overflow-hidden bg-secondary"
          >
            <img
              src={photo}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Gallery Photos ({photos.length}/{maxPhotos})
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-lg overflow-hidden bg-secondary group"
          >
            <img
              src={photo}
              alt={`Gallery ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 p-1 bg-black/70 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-border",
              "flex flex-col items-center justify-center gap-2",
              "text-muted-foreground hover:text-foreground hover:border-primary/50",
              "transition-colors cursor-pointer",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Plus className="h-6 w-6" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-xs text-muted-foreground">
        Add photos to showcase your business or work (max 5MB each)
      </p>
    </div>
  );
}
