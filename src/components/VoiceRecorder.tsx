import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/LoadingSpinner";

const MAX_DURATION = 30; // 30 seconds max per PRD
const MAX_RECORDINGS = 5; // 5 recordings max per meeting per PRD

interface VoiceRecorderProps {
  meetingId: string;
  existingAudioUrl?: string;
  onAudioSaved?: (url: string) => void;
}

interface VoiceNote {
  id: string;
  audio_url: string;
  created_at: string;
  creator_id?: string;
}

export function VoiceRecorder({ meetingId, existingAudioUrl, onAudioSaved }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(Array(20).fill(20));
  const [loading, setLoading] = useState(true);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const waveformRef = useRef<number | null>(null);

  const { toast } = useToast();

  // Load existing audio notes on mount
  useEffect(() => {
    loadExistingNotes();
  }, [meetingId]);

  const loadExistingNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('meeting_notes')
        .select('id, audio_note_url, created_at')
        .eq('meeting_id', meetingId)
        .not('audio_note_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes = (data || [])
        .filter(d => d.audio_note_url)
        .map(d => ({
          id: d.id,
          audio_url: d.audio_note_url!,
          created_at: d.created_at
        }));
      
      setVoiceNotes(notes);
      
      // Set first note as current if exists
      if (notes.length > 0) {
        setAudioUrl(notes[0].audio_url);
      }
    } catch (error) {
      console.error('Error loading existing notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const canRecord = voiceNotes.length < MAX_RECORDINGS;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Animate waveform during recording
  useEffect(() => {
    if (isRecording) {
      const animateWaveform = () => {
        setWaveformHeights(prev => 
          prev.map(() => 20 + Math.random() * 60)
        );
        waveformRef.current = requestAnimationFrame(animateWaveform);
      };
      waveformRef.current = requestAnimationFrame(animateWaveform);
    } else {
      if (waveformRef.current) {
        cancelAnimationFrame(waveformRef.current);
      }
    }
    return () => {
      if (waveformRef.current) {
        cancelAnimationFrame(waveformRef.current);
      }
    };
  }, [isRecording]);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
      setPlaybackProgress(0);
      setTotalDuration(0);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;

      // Try to use a more compatible MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        setAudioBlob(blob);
        setAudioUrl(url);
        setTotalDuration(duration);

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Upload to storage
        await uploadAudio(blob);
      };

      // Request data every second for smoother recording
      mediaRecorder.start(1000);
      setIsRecording(true);
      setDuration(0);

      // Start timer with auto-stop at max duration
      timerRef.current = window.setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          if (newDuration >= MAX_DURATION) {
            stopRecording();
            return MAX_DURATION;
          }
          return newDuration;
        });
      }, 1000);
    } catch (error: any) {
      console.error("Recording error:", error);
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
        timerRef.current = null;
      }
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExtension = blob.type.includes('webm') ? 'webm' : 'm4a';
      const fileName = `${user.id}/${meetingId}/voice-note-${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-media")
        .upload(fileName, blob, {
          contentType: blob.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get signed URL for private bucket access
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("meeting-media")
        .createSignedUrl(fileName, 31536000); // 1 year expiry

      if (urlError) throw urlError;

      const savedAudioUrl = signedUrlData.signedUrl;
      setAudioUrl(savedAudioUrl);

      // Save to meeting_notes table
      await supabase.from("meeting_notes").insert({
        meeting_id: meetingId,
        audio_note_url: savedAudioUrl,
      });

      // Add to voice notes list
      setVoiceNotes(prev => [{
        id: Date.now().toString(),
        audio_url: savedAudioUrl,
        created_at: new Date().toISOString()
      }, ...prev]);

      if (onAudioSaved) {
        onAudioSaved(savedAudioUrl);
      }

      toast({
        title: "Voice note saved",
        description: `Recording saved (${voiceNotes.length + 1}/${MAX_RECORDINGS})`
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current && isFinite(audioRef.current.duration)) {
          setTotalDuration(Math.floor(audioRef.current.duration));
        }
      };

      audioRef.current.ontimeupdate = () => {
        if (audioRef.current && isFinite(audioRef.current.duration)) {
          const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
          setPlaybackProgress(progress);
        }
      };

      audioRef.current.onended = () => {
        setIsPlaying(false);
        setPlaybackProgress(0);
      };

      audioRef.current.onerror = (e) => {
        console.error("Audio playback error:", e);
        toast({
          title: "Playback error",
          description: "Unable to play the recording",
          variant: "destructive"
        });
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error("Play error:", err);
        toast({
          title: "Playback error",
          description: "Unable to play the recording",
          variant: "destructive"
        });
      });
      setIsPlaying(true);
    }
  }, [audioUrl, isPlaying, toast]);

  const deleteRecording = async () => {
    cleanup();
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPlaying(false);
    setDuration(0);
    setPlaybackProgress(0);
    setTotalDuration(0);
    audioRef.current = null;

    // Delete from database
    try {
      await supabase
        .from('meeting_notes')
        .delete()
        .eq('meeting_id', meetingId)
        .not('audio_note_url', 'is', null);
    } catch (error) {
      console.error('Error deleting from database:', error);
    }

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
        <h4 className="text-sm font-medium text-foreground">Voice Notes</h4>
        <div className="flex items-center gap-2">
          {uploading && (
            <span className="text-xs text-primary animate-pulse">Saving...</span>
          )}
          <span className="text-xs text-muted-foreground">
            {voiceNotes.length}/{MAX_RECORDINGS}
          </span>
        </div>
      </div>

      {isRecording ? (
        <div className="space-y-4">
          {/* Waveform Animation */}
          <div className="flex items-center justify-center gap-1 h-16 bg-secondary rounded-lg p-2">
            {waveformHeights.map((height, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full transition-all duration-75"
                style={{
                  height: `${height}%`,
                  minHeight: '8px'
                }}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm text-foreground font-mono font-medium">
                {formatTime(duration)}
              </span>
            </div>
            <Button
              onClick={stopRecording}
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <Square className="h-4 w-4 mr-2 fill-current" />
              Stop Recording
            </Button>
          </div>
        </div>
      ) : audioUrl ? (
        <div className="space-y-3">
          {/* Playback Progress */}
          <div className="space-y-2">
            <Progress value={playbackProgress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{formatTime(Math.floor((playbackProgress / 100) * totalDuration))}</span>
              <span>{formatTime(totalDuration || duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlayback}
              variant="outline"
              className="flex-1 border-primary text-primary hover:bg-primary/10"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Play Recording
                </>
              )}
            </Button>
            <Button
              onClick={deleteRecording}
              variant="outline"
              size="icon"
              className="border-red-500 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : !canRecord ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Maximum of {MAX_RECORDINGS} voice notes reached
          </p>
          <p className="text-xs text-muted-foreground">
            Delete a note to record a new one
          </p>
        </div>
      ) : (
        <Button
          onClick={startRecording}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6"
        >
          <Mic className="h-5 w-5 mr-2" />
          Record (max {MAX_DURATION}s)
        </Button>
      )}

      {/* List of saved voice notes */}
      {voiceNotes.length > 1 && (
        <div className="space-y-2 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">Previous recordings:</p>
          {voiceNotes.slice(1).map((note, index) => (
            <div 
              key={note.id}
              className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2"
            >
              <span className="text-sm text-foreground">
                Recording {voiceNotes.length - index - 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAudioUrl(note.audio_url);
                  setPlaybackProgress(0);
                  audioRef.current = null;
                }}
                className="text-primary"
              >
                <Play className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
