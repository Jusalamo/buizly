import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  isFinal: boolean;
}

export interface Bookmark {
  id: string;
  timestamp: number;
  label: string;
  created_at: string;
}

export function useRealtimeTranscription() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('Speaker 1');
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const speakerColorRef = useRef<Map<string, string>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update recording duration
  useEffect(() => {
    if (isConnected && recordingStartTime) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isConnected, recordingStartTime]);

  const startTranscription = useCallback(async () => {
    setIsConnecting(true);
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        } 
      });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');

      if (error) {
        console.error('Token error:', error);
        // Fall back to local recording without real-time transcription
        toast.info('Real-time transcription unavailable, recording audio only');
      }

      // Set up MediaRecorder for audio capture
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setRecordingStartTime(Date.now());
      setTranscripts([]);
      setIsConnected(true);
      toast.success('Recording started');
      
    } catch (error: unknown) {
      console.error('Failed to start transcription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error(errorMessage || 'Failed to start recording');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const stopTranscription = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    setIsConnected(false);
    setRecordingStartTime(null);
    toast.info('Recording stopped');
  }, []);

  const addBookmark = useCallback((label: string = 'Bookmark') => {
    if (!recordingStartTime) return;

    const timestamp = (Date.now() - recordingStartTime) / 1000;
    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}`,
      timestamp,
      label,
      created_at: new Date().toISOString(),
    };

    setBookmarks(prev => [...prev, newBookmark]);
    toast.success(`Bookmark added at ${formatTimestamp(timestamp)}`);
  }, [recordingStartTime]);

  const removeBookmark = useCallback((bookmarkId: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
  }, []);

  const changeSpeaker = useCallback((speaker: string) => {
    setCurrentSpeaker(speaker);
    
    // Assign color if not already assigned
    if (!speakerColorRef.current.has(speaker)) {
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
      const colorIndex = speakerColorRef.current.size % colors.length;
      speakerColorRef.current.set(speaker, colors[colorIndex]);
    }
  }, []);

  const getSpeakerColor = useCallback((speaker: string) => {
    return speakerColorRef.current.get(speaker) || '#6B7280';
  }, []);

  const getFullTranscript = useCallback(() => {
    return transcripts
      .filter(t => t.isFinal)
      .map(t => {
        const time = formatTimestamp(t.timestamp);
        return `[${time}] ${t.speaker}: ${t.text}`;
      })
      .join('\n');
  }, [transcripts]);

  const getAudioBlob = useCallback(() => {
    if (audioChunksRef.current.length === 0) return null;
    return new Blob(audioChunksRef.current, { type: 'audio/webm' });
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
    setBookmarks([]);
    setRecordingStartTime(null);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  }, []);

  // Add a transcript segment manually (for when real-time transcription is not available)
  const addTranscript = useCallback((text: string, isFinal: boolean = true) => {
    const timestamp = recordingStartTime 
      ? (Date.now() - recordingStartTime) / 1000 
      : 0;
    
    const segment: TranscriptSegment = {
      id: `segment-${Date.now()}`,
      text,
      timestamp,
      speaker: currentSpeaker,
      isFinal,
    };
    
    if (isFinal) {
      setTranscripts(prev => [...prev, segment]);
      setPartialTranscript('');
    } else {
      setPartialTranscript(text);
    }
  }, [recordingStartTime, currentSpeaker]);

  return {
    isConnected,
    isConnecting,
    partialTranscript,
    transcripts,
    bookmarks,
    currentSpeaker,
    recordingDuration,
    startTranscription,
    stopTranscription,
    addBookmark,
    removeBookmark,
    changeSpeaker,
    getSpeakerColor,
    getFullTranscript,
    getAudioBlob,
    clearTranscripts,
    addTranscript,
  };
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
