import { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VoiceRecorderProps {
  meetingId: string;
  existingAudioUrl?: string;
  onAudioSaved?: (url: string) => void;
}

export function VoiceRecorder({ meetingId, existingAudioUrl, onAudioSaved }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Upload to storage
        await uploadAudio(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record voice notes",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileName = `${user.id}/${meetingId}/voice-note-${Date.now()}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-media")
        .upload(fileName, blob, {
          contentType: "audio/webm"
        });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("meeting-media")
        .createSignedUrl(fileName, 31536000); // 1 year expiry

      if (urlError) throw urlError;

      const audioUrl = signedUrlData.signedUrl;

      // Save to meeting_notes table
      await supabase.from("meeting_notes").insert({
        meeting_id: meetingId,
        audio_note_url: audioUrl,
      });

      if (onAudioSaved) {
        onAudioSaved(audioUrl);
      }

      toast({
        title: "Voice note saved",
        description: "Your recording has been saved successfully"
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

  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteRecording = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setDuration(0);
    audioRef.current = null;

    if (onAudioSaved) {
      onAudioSaved("");
    }

    toast({
      title: "Recording deleted",
      description: "The voice note has been removed"
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-card-surface rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Voice Note</h4>
        {uploading && (
          <span className="text-xs text-primary animate-pulse">Saving...</span>
        )}
      </div>

      {isRecording ? (
        <div className="space-y-3">
          {/* Waveform Animation */}
          <div className="flex items-center justify-center gap-1 h-16">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 100 + 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.8s'
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-foreground font-medium">{formatTime(duration)}</span>
            </div>
            <Button
              onClick={stopRecording}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <Square className="h-4 w-4 mr-2 fill-current" />
              Stop Recording
            </Button>
          </div>
        </div>
      ) : audioUrl ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={togglePlayback}
            variant="outline"
            className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPlaying ? "Pause" : "Play Recording"}
          </Button>
          <Button
            onClick={deleteRecording}
            variant="outline"
            size="icon"
            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {formatTime(duration)}
          </span>
        </div>
      ) : (
        <Button
          onClick={startRecording}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
        >
          <Mic className="h-5 w-5 mr-2" />
          Start Recording
        </Button>
      )}
    </div>
  );
}
