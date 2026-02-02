import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Pin,
  PinOff,
  Bookmark,
  BookmarkPlus,
  MoreVertical,
  Calendar,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
  StickyNote,
  Mic,
  StopCircle,
  Loader2,
  Users,
  Clock,
  FileText,
  Tag,
  CheckSquare,
  AlertCircle,
  CalendarDays,
  Link,
  Upload,
  MessageSquare,
  FolderOpen,
  Zap,
  UserCheck,
  Target,
  BarChart3,
  Download,
  Share2,
  Copy,
  Eye,
  EyeOff,
  Mail,
  Play,
  Pause,
  Volume2,
  Save,
  X,
  FilePlus,
  Settings,
  Grid,
  List,
  Columns,
  Layers,
  Star,
  StarOff,
  DownloadCloud,
  UploadCloud,
  FolderPlus,
  CopyPlus,
  Edit3,
  Trash,
  FolderTree,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  RefreshCw,
  Headphones,
  FileBox,
  FileCode,
  Palette,
} from "lucide-react";
import { useMeetingNotes } from "@/hooks/useMeetingNotes";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

// Default meeting templates
const DEFAULT_TEMPLATES = [
  {
    id: "client-call",
    name: "Client Meeting",
    description: "For client discussions and follow-ups",
    icon: "👔",
    color: "blue",
    sections: [
      { title: "Agenda", content: "", placeholder: "Meeting agenda items..." },
      { title: "Client Details", content: "", placeholder: "Client name, company, role..." },
      { title: "Discussion Points", content: "", placeholder: "Key discussion topics..." },
      { title: "Decisions Made", content: "", placeholder: "Agreements and decisions..." },
      { title: "Next Steps", content: "", placeholder: "Follow-up actions..." },
      { title: "Action Items", content: "", placeholder: "Specific tasks with owners and deadlines..." },
    ],
    tags: ["client", "external", "business"],
    defaultDuration: 60,
  },
  {
    id: "project-kickoff",
    name: "Project Kickoff",
    description: "Start new projects with clear objectives",
    icon: "🚀",
    color: "purple",
    sections: [
      { title: "Project Overview", content: "", placeholder: "Project name, goals, scope..." },
      { title: "Goals & Objectives", content: "", placeholder: "Key success metrics..." },
      { title: "Team Roles", content: "", placeholder: "Team member responsibilities..." },
      { title: "Timeline", content: "", placeholder: "Milestones and deadlines..." },
      { title: "Risks & Dependencies", content: "", placeholder: "Potential challenges..." },
      { title: "Action Items", content: "", placeholder: "Immediate next steps..." },
    ],
    tags: ["project", "internal", "planning"],
    defaultDuration: 90,
  },
  {
    id: "one-on-one",
    name: "1:1 Meeting",
    description: "Personal development and feedback sessions",
    icon: "👥",
    color: "green",
    sections: [
      { title: "Check-in", content: "", placeholder: "How are you feeling about work?" },
      { title: "Updates", content: "", placeholder: "Recent accomplishments and challenges..." },
      { title: "Feedback", content: "", placeholder: "Constructive feedback both ways..." },
      { title: "Career Growth", content: "", placeholder: "Development goals and opportunities..." },
      { title: "Blockers", content: "", placeholder: "What's preventing progress?" },
      { title: "Action Items", content: "", placeholder: "Agreed next steps..." },
    ],
    tags: ["internal", "hr", "development"],
    defaultDuration: 30,
  },
  {
    id: "brainstorm",
    name: "Brainstorming",
    description: "Creative idea generation sessions",
    icon: "💡",
    color: "yellow",
    sections: [
      { title: "Problem Statement", content: "", placeholder: "What are we trying to solve?" },
      { title: "Ideas", content: "", placeholder: "All ideas (no filtering)..." },
      { title: "Voting", content: "", placeholder: "Top ideas selection..." },
      { title: "Selected Ideas", content: "", placeholder: "Final selected concepts..." },
      { title: "Next Steps", content: "", placeholder: "Implementation plan..." },
    ],
    tags: ["creative", "planning", "innovation"],
    defaultDuration: 60,
  },
];

// Audio recording interface
interface AudioRecording {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
  transcribed: boolean;
  transcription?: string;
}

export default function Notes() {
  const [searchParams] = useSearchParams();
  const noteIdFromQuery = searchParams.get("note");
  const navigate = useNavigate();
  const {
    notes,
    categories,
    loading,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    addBookmark,
    removeBookmark,
    updateActionItem,
    searchNotes,
    getPinnedNotes,
    generateAISummary,
    extractActionItems,
    syncWithCalendar,
    exportNote,
    shareNote,
    duplicateNote,
    templates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  } = useMeetingNotes();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isCreateTemplateDialogOpen, setIsCreateTemplateDialogOpen] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioRecordings, setAudioRecordings] = useState<AudioRecording[]>([]);
  const [currentPlayingAudio, setCurrentPlayingAudio] = useState<string | null>(null);
  const [audioPlaybackRate, setAudioPlaybackRate] = useState(1);
  const [audioVolume, setAudioVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Enhanced new note state
  const [newNote, setNewNote] = useState({
    title: "",
    text_note: "",
    category: "general",
    meeting_type: "general",
    project_id: "",
    agenda: "",
    attendees: [] as string[],
    duration: 60,
    location: "",
    tags: [] as string[],
    attachments: [] as any[],
    sections: [] as Array<{ title: string; content: string }>,
    template_id: "",
  });

  // For viewing/editing a single note
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedAgenda, setEditedAgenda] = useState("");
  const [editedAttendees, setEditedAttendees] = useState<string[]>([]);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedActionItems, setEditedActionItems] = useState<any[]>([]);
  const [editedSections, setEditedSections] = useState<Array<{ title: string; content: string }>>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newAttendee, setNewAttendee] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newActionItem, setNewActionItem] = useState("");
  const [newSectionTitle, setNewSectionTitle] = useState("");
  
  // Template creation state
  const [customTemplate, setCustomTemplate] = useState({
    name: "",
    description: "",
    icon: "📝",
    color: "blue",
    sections: [{ title: "Notes", content: "", placeholder: "Start typing..." }],
    tags: [] as string[],
    defaultDuration: 60,
  });

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  // All templates (default + custom)
  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...(templates || [])];
  }, [templates]);

  // Load note from URL
  useEffect(() => {
    if (noteIdFromQuery && notes.length > 0) {
      const foundNote = notes.find(n => n.id === noteIdFromQuery);
      if (foundNote) {
        setSelectedNote(foundNote);
        setEditedTitle(foundNote.title || "");
        setEditedContent(foundNote.text_note || "");
        setEditedAgenda(foundNote.agenda || "");
        setEditedAttendees(foundNote.attendees || []);
        setEditedTags(foundNote.tags || []);
        setEditedActionItems(foundNote.ai_action_items || []);
        setEditedSections(foundNote.sections || []);
        
        // Load audio recordings
        loadAudioRecordings(foundNote.id);
        setHasUnsavedChanges(false);
        setAutoSaveStatus("saved");
      }
    } else {
      setSelectedNote(null);
      setAudioRecordings([]);
      setHasUnsavedChanges(false);
      setAutoSaveStatus("idle");
    }
  }, [noteIdFromQuery, notes]);

  // Load audio recordings from localStorage
  const loadAudioRecordings = async (noteId: string) => {
    try {
      const stored = localStorage.getItem(`audio_recordings_${noteId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const loadedRecordings = await Promise.all(
          parsed.map(async (rec: any) => {
            const uint8Array = new Uint8Array(rec.blobData);
            const blob = new Blob([uint8Array], { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            
            return {
              id: rec.id,
              blob,
              url,
              duration: rec.duration,
              timestamp: new Date(rec.timestamp),
              transcribed: rec.transcribed || false,
              transcription: rec.transcription || "",
            };
          })
        );
        setAudioRecordings(loadedRecordings);
      }
    } catch (error) {
      console.error("Error loading audio recordings:", error);
      toast.error("Failed to load audio recordings");
    }
  };

  // Save audio recordings to localStorage
  const saveAudioRecordings = async (noteId: string, recordings: AudioRecording[]) => {
    try {
      const saveData = await Promise.all(
        recordings.map(async (rec) => {
          const arrayBuffer = await rec.blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          return {
            id: rec.id,
            blobData: Array.from(uint8Array),
            duration: rec.duration,
            timestamp: rec.timestamp.toISOString(),
            transcribed: rec.transcribed,
            transcription: rec.transcription,
          };
        })
      );
      
      localStorage.setItem(`audio_recordings_${noteId}`, JSON.stringify(saveData));
    } catch (error) {
      console.error("Error saving audio recordings:", error);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && selectedNote) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(async () => {
        await handleSaveNote();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, editedTitle, editedContent, editedAgenda, editedAttendees, editedTags, editedSections, editedActionItems]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save note with proper error handling
  const handleSaveNote = async () => {
    if (!selectedNote) return;
    
    if (!editedTitle.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsProcessing(true);
    setAutoSaveStatus("saving");

    try {
      const updateData: any = {
        title: editedTitle.trim(),
        text_note: editedContent,
        agenda: editedAgenda,
        attendees: editedAttendees,
        tags: editedTags,
        sections: editedSections,
        ai_action_items: editedActionItems,
        updated_at: new Date().toISOString(),
      };

      await updateNote(selectedNote.id, updateData);
      
      // Also save audio recordings
      if (audioRecordings.length > 0) {
        await saveAudioRecordings(selectedNote.id, audioRecordings);
      }
      
      setHasUnsavedChanges(false);
      setAutoSaveStatus("saved");
      lastSaveRef.current = Date.now();
      
      toast.success("Note saved successfully");
      
      // Reset status after 2 seconds
      setTimeout(() => {
        if (autoSaveStatus === "saved" && !hasUnsavedChanges) {
          setAutoSaveStatus("idle");
        }
      }, 2000);

    } catch (error) {
      console.error("Error saving note:", error);
      setAutoSaveStatus("idle");
      toast.error("Failed to save note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Create new note with validation
  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsProcessing(true);

    try {
      // Compile content from sections if they exist
      let finalContent = newNote.text_note;
      if (newNote.sections.length > 0) {
        finalContent = newNote.sections
          .map(section => `## ${section.title}\n\n${section.content || ''}`)
          .join('\n\n');
      }

      const noteData = {
        title: newNote.title.trim(),
        text_note: finalContent,
        category: newNote.category,
        meeting_type: newNote.meeting_type,
        project_id: newNote.project_id || null,
        agenda: newNote.agenda,
        attendees: newNote.attendees,
        duration: newNote.duration,
        location: newNote.location,
        tags: newNote.tags,
        attachments: [],
        sections: newNote.sections,
        template_id: newNote.template_id,
        meeting_date: new Date().toISOString(),
        ai_action_items: [],
        status: "draft",
        is_pinned: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const created = await createNote(noteData);

      if (created?.id) {
        toast.success("Note created successfully");
        
        // Reset form
        setNewNote({
          title: "",
          text_note: "",
          category: "general",
          meeting_type: "general",
          project_id: "",
          agenda: "",
          attendees: [],
          duration: 60,
          location: "",
          tags: [],
          attachments: [],
          sections: [],
          template_id: "",
        });

        setIsCreateDialogOpen(false);
        
        // Navigate to the new note
        navigate(`/notes?note=${created.id}`);
      }
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply template to new note
  const applyTemplate = (template: any) => {
    const today = new Date();
    const dateStr = today.toLocaleDateString();
    
    setNewNote({
      ...newNote,
      title: `${template.name} - ${dateStr}`,
      meeting_type: template.id,
      duration: template.defaultDuration || 60,
      tags: [...template.tags],
      sections: template.sections.map((section: any) => ({
        title: section.title,
        content: "",
        placeholder: section.placeholder,
      })),
      template_id: template.id,
    });

    setIsTemplateDialogOpen(false);
    setIsCreateDialogOpen(true);
    toast.success(`Applied "${template.name}" template`);
  };

  // Create custom template
  const handleCreateTemplate = async () => {
    if (!customTemplate.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    if (customTemplate.sections.length === 0) {
      toast.error("Add at least one section");
      return;
    }

    setIsProcessing(true);

    try {
      const templateData = {
        id: `custom-${Date.now()}`,
        name: customTemplate.name.trim(),
        description: customTemplate.description.trim(),
        icon: customTemplate.icon,
        color: customTemplate.color,
        sections: customTemplate.sections.map(s => ({
          title: s.title.trim(),
          content: "",
          placeholder: s.placeholder || `Add content for ${s.title.toLowerCase()}...`,
        })),
        tags: customTemplate.tags,
        defaultDuration: customTemplate.defaultDuration,
        created_at: new Date().toISOString(),
      };

      await createTemplate(templateData);
      
      toast.success("Template created successfully");
      
      // Reset form
      setCustomTemplate({
        name: "",
        description: "",
        icon: "📝",
        color: "blue",
        sections: [{ title: "Notes", content: "", placeholder: "Start typing..." }],
        tags: [],
        defaultDuration: 60,
      });
      
      setIsCreateTemplateDialogOpen(false);
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Failed to create template. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Add section to template
  const addTemplateSection = () => {
    if (newSectionTitle.trim()) {
      setCustomTemplate(prev => ({
        ...prev,
        sections: [
          ...prev.sections,
          { 
            title: newSectionTitle.trim(), 
            content: "",
            placeholder: `Add content for ${newSectionTitle.trim().toLowerCase()}...`
          }
        ]
      }));
      setNewSectionTitle("");
      toast.success("Section added");
    }
  };

  // Add attendee
  const handleAddAttendee = () => {
    if (newAttendee.trim() && !editedAttendees.includes(newAttendee.trim())) {
      setEditedAttendees([...editedAttendees, newAttendee.trim()]);
      setHasUnsavedChanges(true);
      setNewAttendee("");
      toast.success("Attendee added");
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()]);
      setHasUnsavedChanges(true);
      setNewTag("");
      toast.success("Tag added");
    }
  };

  // Add action item
  const handleAddActionItem = () => {
    if (newActionItem.trim()) {
      const newItem = {
        id: `action-${Date.now()}`,
        text: newActionItem.trim(),
        completed: false,
        assignee: "",
        due_date: "",
        priority: "medium",
      };
      
      setEditedActionItems([...editedActionItems, newItem]);
      setHasUnsavedChanges(true);
      setNewActionItem("");
      toast.success("Action item added");
    }
  };

  // Toggle action item completion
  const toggleActionItem = (id: string) => {
    setEditedActionItems(items =>
      items.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    setHasUnsavedChanges(true);
  };

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
        }
      });
      
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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Get duration
        const audio = new Audio(audioUrl);
        await new Promise((resolve) => {
          audio.onloadedmetadata = resolve;
        });
        
        const duration = audio.duration;
        
        const newRecording: AudioRecording = {
          id: `rec_${Date.now()}`,
          blob: audioBlob,
          url: audioUrl,
          duration,
          timestamp: new Date(),
          transcribed: false,
        };

        const updatedRecordings = [newRecording, ...audioRecordings];
        setAudioRecordings(updatedRecordings);
        
        // Save to localStorage if we have a selected note
        if (selectedNote) {
          await saveAudioRecordings(selectedNote.id, updatedRecordings);
        }

        toast.success("Recording saved successfully");
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.info("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  // Stop voice recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      toast.info("Processing recording...");
    }
  };

  // Play/pause audio
  const playAudio = (recordingId: string) => {
    if (currentPlayingAudio === recordingId) {
      if (audioRef.current) {
        audioRef.current.pause();
        setCurrentPlayingAudio(null);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const recording = audioRecordings.find(r => r.id === recordingId);
      if (recording) {
        const audio = new Audio(recording.url);
        audio.playbackRate = audioPlaybackRate;
        audio.volume = audioVolume;
        
        audio.onended = () => {
          setCurrentPlayingAudio(null);
        };
        
        audio.play();
        setCurrentPlayingAudio(recordingId);
        audioRef.current = audio;
      }
    }
  };

  // Transcribe recording using Web Speech API or send to backend
  const transcribeRecording = async (recordingId: string) => {
    const recording = audioRecordings.find(r => r.id === recordingId);
    if (!recording) return;

    setIsTranscribing(true);
    
    try {
      // Convert blob to base64 for sending to API
      const arrayBuffer = await recording.blob.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Send to your backend API for transcription
      // This is a placeholder - you'll need to implement your actual transcription API
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio: base64Audio,
          noteId: selectedNote?.id,
          recordingId,
        }),
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const { transcription } = await response.json();
      
      // Update recording with transcription
      const updatedRecordings = audioRecordings.map(rec =>
        rec.id === recordingId
          ? { ...rec, transcribed: true, transcription }
          : rec
      );
      
      setAudioRecordings(updatedRecordings);

      // Save updated recordings
      if (selectedNote) {
        await saveAudioRecordings(selectedNote.id, updatedRecordings);
      }

      // Add transcription to note content
      if (selectedNote && transcription) {
        const timestamp = recording.timestamp.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const transcriptionBlock = `\n\n---\n**Voice Note (${timestamp}):**\n${transcription}\n`;
        
        setEditedContent(prev => prev + transcriptionBlock);
        setHasUnsavedChanges(true);
      }

      toast.success("Transcription completed and added to note");
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast.error("Transcription failed. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Format recording time
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    
    if (searchQuery.trim()) {
      filtered = searchNotes(searchQuery);
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    if (selectedProject !== "all") {
      filtered = filtered.filter(note => note.linked_project === selectedProject);
    }
    
    switch (activeTab) {
      case "pinned":
        filtered = getPinnedNotes();
        break;
      case "bookmarked":
        filtered = filtered.filter(note => note.bookmarks && note.bookmarks.length > 0);
        break;
      case "actionable":
        filtered = filtered.filter(note => 
          note.ai_action_items && 
          note.ai_action_items.some((item: any) => !item.completed)
        );
        break;
      case "recent":
        filtered = filtered.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 20);
        break;
    }
    
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at || b.created_at).getTime() - 
             new Date(a.updated_at || a.created_at).getTime();
    });
  }, [notes, searchQuery, selectedCategory, selectedProject, activeTab, searchNotes, getPinnedNotes]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Single note detail view
  if (selectedNote) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm("You have unsaved changes. Save before leaving?")) {
                      handleSaveNote().then(() => navigate("/notes"));
                    } else {
                      navigate("/notes");
                    }
                  } else {
                    navigate("/notes");
                  }
                }}
                className="hover:bg-accent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">All Notes</span>
              </Button>
              
              <div className="hidden sm:flex items-center gap-2">
                {autoSaveStatus === "saving" && (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </Badge>
                )}
                {autoSaveStatus === "saved" && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
                {hasUnsavedChanges && autoSaveStatus === "idle" && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSaveNote}
                disabled={isProcessing || !hasUnsavedChanges}
                className="gap-1"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Save</span>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => togglePinNote(selectedNote.id, !selectedNote.is_pinned)}>
                    {selectedNote.is_pinned ? (
                      <>
                        <PinOff className="h-4 w-4 mr-2" />
                        Unpin Note
                      </>
                    ) : (
                      <>
                        <Pin className="h-4 w-4 mr-2" />
                        Pin Note
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => extractActionItems(selectedNote.id)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Extract Action Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => generateAISummary(selectedNote.id)}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Summary
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
                        deleteNote(selectedNote.id);
                        navigate("/notes");
                        toast.success("Note deleted");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
            {/* Left column - Note content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <Input
                value={editedTitle}
                onChange={(e) => {
                  setEditedTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Meeting Title"
                className="text-2xl md:text-3xl font-bold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              {/* Meeting metadata */}
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2">Agenda</Label>
                    <Textarea
                      value={editedAgenda}
                      onChange={(e) => {
                        setEditedAgenda(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Meeting agenda items..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-2">Attendees</Label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={newAttendee}
                          onChange={(e) => setNewAttendee(e.target.value)}
                          placeholder="Add attendee"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddAttendee()}
                        />
                        <Button onClick={handleAddAttendee} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {editedAttendees.map((attendee, index) => (
                          <Badge key={index} variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" />
                            {attendee}
                            <button
                              onClick={() => {
                                setEditedAttendees(editedAttendees.filter((_, i) => i !== index));
                                setHasUnsavedChanges(true);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Action Items */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Action Items</h3>
                    <Badge variant="outline">
                      {editedActionItems.filter(item => !item.completed).length} pending
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => extractActionItems(selectedNote.id)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Auto-extract
                  </Button>
                </div>

                {/* Add new action item */}
                <div className="flex gap-2 mb-4">
                  <Input
                    value={newActionItem}
                    onChange={(e) => setNewActionItem(e.target.value)}
                    placeholder="New action item..."
                    onKeyPress={(e) => e.key === 'Enter' && handleAddActionItem()}
                  />
                  <Button onClick={handleAddActionItem}>
                    Add
                  </Button>
                </div>

                {/* Action items list */}
                <div className="space-y-2">
                  {editedActionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50"
                    >
                      <button
                        onClick={() => toggleActionItem(item.id)}
                        className="flex-shrink-0 mt-1"
                      >
                        {item.completed ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-border" />
                        )}
                      </button>
                      <div className="flex-1">
                        <p className={`${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.text}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {item.assignee && (
                            <span className="flex items-center gap-1">
                              <UserCheck className="h-3 w-3" />
                              {item.assignee}
                            </span>
                          )}
                          {item.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {item.due_date}
                            </span>
                          )}
                          {item.priority && (
                            <Badge variant={
                              item.priority === 'high' ? 'destructive' :
                              item.priority === 'medium' ? 'default' : 'outline'
                            }>
                              {item.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditedActionItems(editedActionItems.filter(i => i.id !== item.id));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Audio Recordings */}
              {audioRecordings.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Headphones className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Voice Recordings</h3>
                      <Badge variant="outline">
                        {audioRecordings.length}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {audioRecordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playAudio(recording.id)}
                            className="h-10 w-10 rounded-full"
                          >
                            {currentPlayingAudio === recording.id ? (
                              <Pause className="h-5 w-5" />
                            ) : (
                              <Play className="h-5 w-5" />
                            )}
                          </Button>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              Recording {formatRecordingTime(Math.floor(recording.duration))}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recording.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!recording.transcribed ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => transcribeRecording(recording.id)}
                              disabled={isTranscribing}
                            >
                              {isTranscribing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Transcribe</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Transcribed
                            </Badge>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {recording.transcription && (
                                <DropdownMenuItem onClick={() => {
                                  const newContent = editedContent 
                                    ? `${editedContent}\n\n${recording.transcription}`
                                    : recording.transcription;
                                  setEditedContent(newContent);
                                  setHasUnsavedChanges(true);
                                  toast.success("Transcription added to note");
                                }}>
                                  <CopyPlus className="h-4 w-4 mr-2" />
                                  Add to Note
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  const updated = audioRecordings.filter(r => r.id !== recording.id);
                                  setAudioRecordings(updated);
                                  if (selectedNote) {
                                    saveAudioRecordings(selectedNote.id, updated);
                                  }
                                  toast.success("Recording deleted");
                                }}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Main content sections */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Meeting Notes</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newSection = {
                          title: "New Section",
                          content: "",
                        };
                        setEditedSections([...editedSections, newSection]);
                        setHasUnsavedChanges(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </div>

                {/* Sections */}
                {editedSections.length > 0 ? (
                  <div className="space-y-6">
                    {editedSections.map((section, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={section.title}
                            onChange={(e) => {
                              const newSections = [...editedSections];
                              newSections[index].title = e.target.value;
                              setEditedSections(newSections);
                              setHasUnsavedChanges(true);
                            }}
                            placeholder="Section Title"
                            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newSections = editedSections.filter((_, i) => i !== index);
                              setEditedSections(newSections);
                              setHasUnsavedChanges(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(e) => {
                            const newSections = [...editedSections];
                            newSections[index].content = e.target.value;
                            setEditedSections(newSections);
                            setHasUnsavedChanges(true);
                          }}
                          placeholder="Start typing..."
                          className="min-h-[100px]"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    value={editedContent}
                    onChange={(e) => {
                      setEditedContent(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Start typing your meeting notes here..."
                    className="min-h-[400px] resize-none"
                  />
                )}
              </Card>

              {/* Voice recording button */}
              <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50">
                {isRecording ? (
                  <div className="flex flex-col items-end gap-2">
                    <Card className="px-4 py-2 bg-red-50 border-red-200">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-medium">Recording</span>
                        <span className="text-sm text-muted-foreground">
                          {formatRecordingTime(recordingTime)}
                        </span>
                      </div>
                    </Card>
                    <Button
                      size="lg"
                      className="rounded-full h-16 w-16 shadow-lg bg-red-500 hover:bg-red-600"
                      onClick={stopRecording}
                    >
                      <StopCircle className="h-6 w-6" />
                    </Button>
                  </div>
                ) : isTranscribing ? (
                  <Button
                    size="lg"
                    className="rounded-full h-16 w-16 shadow-lg"
                    disabled
                  >
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="rounded-full h-16 w-16 shadow-lg"
                    onClick={startRecording}
                  >
                    <Mic className="h-6 w-6" />
                  </Button>
                )}
              </div>
            </div>

            {/* Right column - Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="font-medium">Tags</Label>
                  <Tag className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <Button onClick={handleAddTag} size="sm">
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editedTags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="gap-1">
                        {tag}
                        <button
                          onClick={() => {
                            setEditedTags(editedTags.filter((_, i) => i !== index));
                            setHasUnsavedChanges(true);
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Meeting Details */}
              <Card className="p-4">
                <h3 className="font-medium mb-3">Meeting Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Date</span>
                    <span className="text-sm font-medium">
                      {new Date(selectedNote.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="text-sm font-medium">{selectedNote.duration || 60} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <Badge variant="outline">
                      {selectedNote.meeting_type || 'General'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={
                      selectedNote.status === 'completed' ? 'default' :
                      selectedNote.status === 'scheduled' ? 'outline' : 'secondary'
                    }>
                      {selectedNote.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Notes list view
  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meeting Notes</h1>
            <p className="text-sm text-muted-foreground">
              {filteredNotes.length} of {notes.length} meetings
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsTemplateDialogOpen(true)}
              className="gap-2"
            >
              <FileBox className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Note</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes, attendees, or action items..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              <SelectItem value="proj-1">Q4 Planning</SelectItem>
              <SelectItem value="proj-2">Acme Corp</SelectItem>
              <SelectItem value="proj-3">Product Launch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pinned">
              <Pin className="h-3 w-3 mr-2" />
              Pinned
            </TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="actionable">
              <Target className="h-3 w-3 mr-2" />
              Actionable
            </TabsTrigger>
            <TabsTrigger value="bookmarked">
              <Bookmark className="h-3 w-3 mr-2" />
              Saved
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {filteredNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <StickyNote className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No meeting notes yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  {searchQuery ? "No notes match your search" : "Create your first meeting note"}
                </p>
                <Button onClick={() => setIsTemplateDialogOpen(true)} className="gap-2">
                  <FileBox className="h-4 w-4" />
                  Start with Template
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="p-4 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md group"
                    onClick={() => navigate(`/notes?note=${note.id}`)}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {note.is_pinned && (
                              <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            )}
                            <h3 className="font-semibold text-foreground line-clamp-1">
                              {note.title || "Untitled Meeting"}
                            </h3>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {note.ai_summary || note.text_note?.substring(0, 100) || "No content"}
                          </p>
                        </div>
                        
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinNote(note.id, !note.is_pinned);
                          }}
                        >
                          {note.is_pinned ? (
                            <PinOff className="h-4 w-4" />
                          ) : (
                            <Pin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Metadata */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        {note.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {note.duration}m
                          </span>
                        )}
                      </div>
                      
                      {/* Tags */}
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.slice(0, 3).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {note.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{note.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                      
                      {/* Action items preview */}
                      {note.ai_action_items && note.ai_action_items.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">Action Items</span>
                            <Badge variant="outline" className="text-xs">
                              {note.ai_action_items.filter((item: any) => !item.completed).length}/{note.ai_action_items.length}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {note.ai_action_items
                              .filter((item: any) => !item.completed)
                              .slice(0, 2)
                              .map((item: any) => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                  <span className="text-xs truncate">{item.text}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Template Selection Dialog */}
        <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Choose a Template</DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsTemplateDialogOpen(false);
                    setIsCreateTemplateDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
              <DialogDescription>
                Select a template to start your meeting notes with a structured format
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <h3 className="font-medium mb-3">Default Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEFAULT_TEMPLATES.map((template) => (
                  <Card
                    key={template.id}
                    className="p-4 hover:border-primary cursor-pointer transition-colors hover:shadow-sm"
                    onClick={() => applyTemplate(template)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{template.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{template.name}</h4>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {template.sections.length} sections
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {template.defaultDuration} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Custom Templates */}
              {templates && templates.length > 0 && (
                <>
                  <h3 className="font-medium mb-3 mt-6">Your Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map((template: any) => (
                      <Card
                        key={template.id}
                        className="p-4 hover:border-primary cursor-pointer transition-colors hover:shadow-sm group"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{template.icon || "📝"}</div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium">{template.name}</h4>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Delete this template?")) {
                                      deleteTemplate(template.id);
                                      toast.success("Template deleted");
                                    }
                                  }}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="outline" className="text-xs">
                                {template.sections.length} sections
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Custom Template Dialog */}
        <Dialog open={isCreateTemplateDialogOpen} onOpenChange={setIsCreateTemplateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Template</DialogTitle>
              <DialogDescription>
                Design your own meeting note template with custom sections
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    placeholder="Team Retrospective"
                    value={customTemplate.name}
                    onChange={(e) => setCustomTemplate({...customTemplate, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-icon">Icon</Label>
                  <Select
                    value={customTemplate.icon}
                    onValueChange={(value) => setCustomTemplate({...customTemplate, icon: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select icon" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="📝">📝 Notes</SelectItem>
                      <SelectItem value="👔">👔 Business</SelectItem>
                      <SelectItem value="🚀">🚀 Project</SelectItem>
                      <SelectItem value="💡">💡 Idea</SelectItem>
                      <SelectItem value="👥">👥 Team</SelectItem>
                      <SelectItem value="🎯">🎯 Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  placeholder="Template for team retrospective meetings"
                  value={customTemplate.description}
                  onChange={(e) => setCustomTemplate({...customTemplate, description: e.target.value})}
                />
              </div>

              {/* Sections management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Sections</Label>
                </div>
                
                <div className="flex gap-2">
                  <Input
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="New section title"
                    onKeyPress={(e) => e.key === 'Enter' && addTemplateSection()}
                  />
                  <Button onClick={addTemplateSection} type="button">Add</Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-lg">
                  {customTemplate.sections.map((section, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 hover:bg-accent rounded">
                      <div className="flex-1">
                        <Input
                          value={section.title}
                          onChange={(e) => {
                            const newSections = [...customTemplate.sections];
                            newSections[index].title = e.target.value;
                            setCustomTemplate({...customTemplate, sections: newSections});
                          }}
                          placeholder="Section title"
                        />
                        <Textarea
                          value={section.placeholder}
                          onChange={(e) => {
                            const newSections = [...customTemplate.sections];
                            newSections[index].placeholder = e.target.value;
                            setCustomTemplate({...customTemplate, sections: newSections});
                          }}
                          placeholder="Placeholder text"
                          className="mt-1 text-sm"
                          rows={2}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => {
                          const newSections = customTemplate.sections.filter((_, i) => i !== index);
                          setCustomTemplate({...customTemplate, sections: newSections});
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateTemplateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTemplate} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Note Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Meeting Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title *</Label>
                  <Input
                    id="title"
                    placeholder="Weekly team sync"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="meeting_type">Template</Label>
                  <Select
                    value={newNote.template_id}
                    onValueChange={(value) => {
                      if (value) {
                        const template = allTemplates.find(t => t.id === value);
                        if (template) applyTemplate(template);
                      } else {
                        setNewNote({
                          ...newNote,
                          template_id: "",
                          sections: [],
                          text_note: "",
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Blank Note</SelectItem>
                      {allTemplates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Template sections */}
              {newNote.sections.length > 0 ? (
                <div className="space-y-4">
                  {newNote.sections.map((section, index) => (
                    <div key={index} className="space-y-2">
                      <Label>{section.title}</Label>
                      <Textarea
                        value={section.content}
                        onChange={(e) => {
                          const newSections = [...newNote.sections];
                          newSections[index].content = e.target.value;
                          setNewNote({ ...newNote, sections: newSections });
                        }}
                        placeholder="Start typing..."
                        rows={4}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="content">Notes</Label>
                  <Textarea
                    id="content"
                    placeholder="Start typing your meeting notes here..."
                    value={newNote.text_note}
                    onChange={(e) => setNewNote({ ...newNote, text_note: e.target.value })}
                    rows={8}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateNote} disabled={isProcessing || !newNote.title.trim()}>
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Create Meeting Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
