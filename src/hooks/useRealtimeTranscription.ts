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
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [partialText, setPartialText] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [numSpeakers, setNumSpeakers] = useState(1);
  const { toast } = useToast();
  const segmentIdRef = useRef(0);
  const partialTextRef = useRef('');
  const fullTranscriptRef = useRef('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    onPartialTranscript: (data) => {
      partialTextRef.current = data.text;
      setPartialText(data.text);
    },
    onCommittedTranscript: (data) => {
      const newSegment: TranscriptionSegment = {
        id: `segment-${segmentIdRef.current++}`,
        text: data.text,
        timestamp: Date.now(),
      };
      setSegments(prev => [...prev, newSegment]);
      setFullTranscript(prev => {
        const updated = prev + (prev ? ' ' : '') + data.text;
        fullTranscriptRef.current = updated;
        return updated;
      });
      partialTextRef.current = '';
      setPartialText('');
    },
  });

  const startTranscription = useCallback(async () => {
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // If diarization needed, also record audio for batch processing
      if (numSpeakers > 1) {
        audioChunksRef.current = [];
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorder.start(1000); // Collect chunks every second
        mediaRecorderRef.current = mediaRecorder;
      }

      const { data, error } = await supabase.functions.invoke('elevenlabs-scribe-token');
      
      if (error) throw error;
      if (!data?.token) throw new Error('No transcription token received');

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
        description: numSpeakers > 1 
          ? `Recording with ${numSpeakers}-speaker diarization`
          : 'Speak clearly into your microphone',
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
  }, [scribe, toast, numSpeakers]);

  const stopTranscription = useCallback(async () => {
    try {
      const remainingPartial = partialTextRef.current.trim();
      
      await scribe.disconnect();
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }

      if (remainingPartial) {
        setFullTranscript(prev => {
          const updated = prev + (prev ? ' ' : '') + remainingPartial;
          fullTranscriptRef.current = updated;
          return updated;
        });
        const newSegment: TranscriptionSegment = {
          id: `segment-${segmentIdRef.current++}`,
          text: remainingPartial,
          timestamp: Date.now(),
        };
        setSegments(prev => [...prev, newSegment]);
      }
      
      setIsConnected(false);
      partialTextRef.current = '';
      setPartialText('');

      // If diarization is enabled, send audio for batch processing
      if (numSpeakers > 1 && audioChunksRef.current.length > 0) {
        setIsDiarizing(true);
        toast({
          title: 'Processing speaker diarization...',
          description: 'Identifying speakers in your recording',
        });

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('num_speakers', String(numSpeakers));

          const { data, error } = await supabase.functions.invoke('elevenlabs-transcribe', {
            body: formData,
          });

          if (error) throw error;

          if (data?.words && data.words.length > 0) {
            // Normalize speaker labels - ElevenLabs may return numeric IDs or "speaker_0" format
            const normalizeSpeaker = (speaker: any): string => {
              if (speaker == null) return 'Speaker 1';
              const s = String(speaker);
              // Handle "speaker_0", "speaker_1" format
              const labelMatch = s.match(/speaker[_\s]?(\d+)/i);
              if (labelMatch) return `Speaker ${parseInt(labelMatch[1]) + 1}`;
              // Handle plain numeric: 0, 1, 2
              if (/^\d+$/.test(s)) return `Speaker ${parseInt(s) + 1}`;
              return s;
            };

            // Group words by speaker into segments
            const diarizedSegments: TranscriptionSegment[] = [];
            let currentSpeaker = normalizeSpeaker(data.words[0].speaker);
            let currentText = '';
            let segIdx = 0;

            for (const word of data.words) {
              const speaker = normalizeSpeaker(word.speaker);
              if (speaker !== currentSpeaker) {
                if (currentText.trim()) {
                  diarizedSegments.push({
                    id: `diarized-${segIdx++}`,
                    text: currentText.trim(),
                    timestamp: Date.now(),
                    speaker: currentSpeaker,
                  });
                }
                currentSpeaker = speaker;
                currentText = word.text;
              } else {
                currentText += word.text;
              }
            }
            // Last segment
            if (currentText.trim()) {
              diarizedSegments.push({
                id: `diarized-${segIdx++}`,
                text: currentText.trim(),
                timestamp: Date.now(),
                speaker: currentSpeaker,
              });
            }

            // Replace segments with diarized ones
            setSegments(diarizedSegments);
            
            // Rebuild full transcript with speaker labels
            const diarizedTranscript = diarizedSegments
              .map(s => `[${s.speaker}] ${s.text}`)
              .join('\n');
            setFullTranscript(diarizedTranscript);
            fullTranscriptRef.current = diarizedTranscript;

            toast({
              title: 'Diarization complete',
              description: `Identified speakers in your recording`,
            });
          } else if (data?.text) {
            // Fallback: use plain text
            toast({
              title: 'Transcription complete',
              description: 'Speaker identification was not available',
            });
          }
        } catch (diarizeError: any) {
          console.error('Diarization error:', diarizeError);
          toast({
            variant: 'destructive',
            title: 'Diarization failed',
            description: 'Using real-time transcript instead',
          });
        } finally {
          setIsDiarizing(false);
        }
      } else {
        toast({
          title: 'Transcription stopped',
          description: 'Transcript added to your note',
        });
      }

      // Cleanup stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
    } catch (error) {
      console.error('Error stopping transcription:', error);
    }
  }, [scribe, toast, numSpeakers]);

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
    isConnected,
    isConnecting,
    isDiarizing,
    segments,
    partialText,
    fullTranscript,
    numSpeakers,
    setNumSpeakers,
    startTranscription,
    stopTranscription,
    clearTranscription,
    addBookmark,
    scribe,
  };
}
