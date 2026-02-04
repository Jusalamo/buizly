import { useState, useCallback, useRef } from 'react';
import { useScribe } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
}

export function useRealtimeTranscription() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [partialText, setPartialText] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const { toast } = useToast();
  const segmentIdRef = useRef(0);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      setPartialText(data.text);
    },
    onCommittedTranscript: (data) => {
      const newSegment: TranscriptionSegment = {
        id: `segment-${segmentIdRef.current++}`,
        text: data.text,
        timestamp: Date.now(),
      };
      setSegments(prev => [...prev, newSegment]);
      setFullTranscript(prev => prev + (prev ? ' ' : '') + data.text);
      setPartialText('');
    },
  });

  const startTranscription = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get token from edge function
      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error) throw error;
      if (!data?.token) {
        throw new Error('No transcription token received');
      }

      // Start the transcription session
      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setIsConnected(true);
      toast({
        title: 'Transcription started',
        description: 'Speak clearly into your microphone',
      });
    } catch (error: any) {
      console.error('Failed to start transcription:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription failed',
        description: error.message || 'Could not start transcription',
      });
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, toast]);

  const stopTranscription = useCallback(async () => {
    try {
      await scribe.disconnect();
      setIsConnected(false);
      setPartialText('');
      toast({
        title: 'Transcription stopped',
        description: `Captured ${segments.length} segments`,
      });
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }, [scribe, segments.length, toast]);

  const clearTranscription = useCallback(() => {
    setSegments([]);
    setFullTranscript('');
    setPartialText('');
    segmentIdRef.current = 0;
  }, []);

  const addBookmark = useCallback((segmentId: string, label?: string) => {
    setSegments(prev => 
      prev.map(seg => 
        seg.id === segmentId 
          ? { ...seg, bookmark: label || 'Important' } 
          : seg
      )
    );
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    segments,
    partialText,
    fullTranscript,
    
    // Actions
    startTranscription,
    stopTranscription,
    clearTranscription,
    addBookmark,
    
    // Raw scribe access if needed
    scribe,
  };
}
