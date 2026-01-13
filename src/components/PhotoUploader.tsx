import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface PhotoUploaderProps {
  meetingId: string;
  existingPhotos?: string[];
  onPhotosChange?: (urls: string[]) => void;
}

export function PhotoUploader({ meetingId, existingPhotos = [], onPhotosChange }: PhotoUploaderProps) {
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Load existing photos on mount
  useEffect(() => {
    loadExistingPhotos();
  }, [meetingId]);

  const loadExistingPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('photo_urls')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0 && data[0].photo_urls) {
        setPhotos(data[0].photo_urls);
      }
    } catch (error) {
      console.error('Error loading existing photos:', error);
    } finally {
      setLoading(false);
    }
  };

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

      // Use signed URL for private bucket instead of public URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("meeting-media")
        .createSignedUrl(fileName, 31536000); // 1 year expiry

      if (urlError) throw urlError;

      const newPhotos = [...photos, signedUrlData.signedUrl];
      setPhotos(newPhotos);
      
      // Save to database
      await savePhotosToDatabase(newPhotos);
      
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

  const savePhotosToDatabase = async (photoUrls: string[]) => {
    try {
      // Check if a note already exists for this meeting
      const { data: existingNote } = await supabase
        .from('meeting_notes')
        .select('id')
        .eq('meeting_id', meetingId)
        .limit(1);

      if (existingNote && existingNote.length > 0) {
        // Update existing note
        await supabase
          .from('meeting_notes')
          .update({ photo_urls: photoUrls })
          .eq('id', existingNote[0].id);
      } else {
        // Create new note
        await supabase.from('meeting_notes').insert({
          meeting_id: meetingId,
          photo_urls: photoUrls,
        });
      }
    } catch (error) {
      console.error('Error saving photos to database:', error);
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
    
    // Update database
    await savePhotosToDatabase(newPhotos);
    
    if (onPhotosChange) {
      onPhotosChange(newPhotos);
    }

    toast({
      title: "Photo removed",
      description: "The photo has been deleted"
    });
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
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
