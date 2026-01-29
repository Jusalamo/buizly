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
} from "lucide-react";
import { useMeetingNotes } from "@/hooks/useMeetingNotes";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// Meeting template types
const MEETING_TEMPLATES = {
  "client-call": {
    name: "Client Meeting",
    sections: ["Agenda", "Client Details", "Discussion Points", "Decisions", "Next Steps", "Action Items"],
    defaultTags: ["client", "external"]
  },
  "project-kickoff": {
    name: "Project Kickoff",
    sections: ["Project Overview", "Goals & Objectives", "Team Roles", "Timeline", "Risks & Dependencies", "Action Items"],
    defaultTags: ["project", "internal"]
  },
  "one-on-one": {
    name: "1:1 Meeting",
    sections: ["Check-in", "Updates", "Feedback", "Career Growth", "Blockers", "Action Items"],
    defaultTags: ["internal", "hr"]
  },
  "board-meeting": {
    name: "Board Meeting",
    sections: ["Minutes", "Financial Review", "Strategic Decisions", "Voting Items", "Action Items"],
    defaultTags: ["board", "executive"]
  },
  "brainstorm": {
    name: "Brainstorming",
    sections: ["Problem Statement", "Ideas", "Voting", "Selected Ideas", "Next Steps"],
    defaultTags: ["creative", "planning"]
  }
};

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
    // New hooks for enhanced features
    addAttendee,
    removeAttendee,
    addAttachment,
    removeAttachment,
    addComment,
    updateComment,
    deleteComment,
    setReminder,
    addToProject,
    syncWithTaskManager,
    getMeetingAnalytics,
  } = useMeetingNotes();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Enhanced new note state with meeting-specific fields
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
    is_recurring: false,
    recurrence_pattern: "",
    linked_entities: [] as { type: string; id: string; name: string }[],
  });

  // For viewing/editing a single note
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedAgenda, setEditedAgenda] = useState("");
  const [editedAttendees, setEditedAttendees] = useState<string[]>([]);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [editedActionItems, setEditedActionItems] = useState<any[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [newAttendee, setNewAttendee] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newActionItem, setNewActionItem] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<any>(null);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<number>(Date.now());

  // Projects and contacts (would come from API)
  const [projects] = useState([
    { id: "proj-1", name: "Q4 Planning", color: "blue" },
    { id: "proj-2", name: "Acme Corp", color: "green" },
    { id: "proj-3", name: "Product Launch", color: "purple" },
  ]);

  const [contacts] = useState([
    { id: "user-1", name: "John Doe", email: "john@example.com", role: "PM" },
    { id: "user-2", name: "Jane Smith", email: "jane@example.com", role: "Design" },
    { id: "user-3", name: "Bob Johnson", email: "bob@example.com", role: "Engineering" },
  ]);

  // If we have a noteId in URL, show that note
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
        setHasUnsavedChanges(false);
        setAutoSaveStatus("saved");
      }
    } else {
      setSelectedNote(null);
      setHasUnsavedChanges(false);
      setAutoSaveStatus("idle");
    }
  }, [noteIdFromQuery, notes]);

  // Auto-save functionality with status tracking
  useEffect(() => {
    if (hasUnsavedChanges && selectedNote) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(async () => {
        await handleSaveNote();
      }, 1500); // Auto-save after 1.5 seconds of inactivity
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, editedTitle, editedContent, editedAgenda, editedAttendees, editedTags]);

  // Handle beforeunload to warn about unsaved changes
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

  // Enhanced save with proper error handling and status
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
        title: editedTitle,
        text_note: editedContent,
        agenda: editedAgenda,
        attendees: editedAttendees,
        tags: editedTags,
      };

      // Only update action items if changed
      if (JSON.stringify(editedActionItems) !== JSON.stringify(selectedNote.ai_action_items || [])) {
        updateData.ai_action_items = editedActionItems;
      }

      await updateNote(selectedNote.id, updateData);
      
      setHasUnsavedChanges(false);
      setAutoSaveStatus("saved");
      lastSaveRef.current = Date.now();
      
      toast.success("Note saved successfully");
      
      // Clear saved status after 2 seconds
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

  // Enhanced create note with validation
  const handleCreateNote = async () => {
    if (!newNote.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setIsProcessing(true);

    try {
      const created = await createNote({
        ...newNote,
        // Add timestamp
        meeting_date: new Date().toISOString(),
        // Ensure required fields
        attendees: newNote.attendees || [],
        tags: newNote.tags || [],
        ai_action_items: [],
        status: "draft",
      });

      if (created?.id) {
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
          is_recurring: false,
          recurrence_pattern: "",
          linked_entities: [],
        });

        setIsCreateDialogOpen(false);
        toast.success("Note created successfully");
        
        // Navigate to the new note
        navigate(`/notes?note=${created.id}`);
      }
    } catch (error) {
      console.error("Error creating note:", error);
      toast.error("Failed to create note");
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply template to new note
  const applyTemplate = (templateKey: keyof typeof MEETING_TEMPLATES) => {
    const template = MEETING_TEMPLATES[templateKey];
    
    const templateContent = template.sections.map(section => 
      `## ${section}\n\n`
    ).join('\n');

    setNewNote(prev => ({
      ...prev,
      meeting_type: templateKey,
      text_note: templateContent,
      tags: [...prev.tags, ...template.defaultTags],
    }));

    setIsTemplateDialogOpen(false);
    toast.success(`Applied ${template.name} template`);
  };

  // Extract action items from content
  const handleExtractActionItems = async () => {
    if (!selectedNote) return;

    try {
      const extracted = await extractActionItems(selectedNote.id, editedContent);
      if (extracted && extracted.length > 0) {
        setEditedActionItems(extracted);
        setHasUnsavedChanges(true);
        toast.success(`Extracted ${extracted.length} action items`);
      }
    } catch (error) {
      console.error("Error extracting action items:", error);
      toast.error("Failed to extract action items");
    }
  };

  // Sync with calendar
  const handleSyncCalendar = async () => {
    if (!selectedNote) return;

    try {
      await syncWithCalendar(selectedNote.id);
      toast.success("Synced with calendar");
    } catch (error) {
      console.error("Error syncing with calendar:", error);
      toast.error("Failed to sync with calendar");
    }
  };

  // Export note
  const handleExportNote = async (format: 'pdf' | 'docx' | 'markdown') => {
    if (!selectedNote) return;

    try {
      const exported = await exportNote(selectedNote.id, format);
      // In a real app, this would trigger a download
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error("Error exporting note:", error);
      toast.error("Failed to export note");
    }
  };

  // Share note
  const handleShareNote = async (method: 'link' | 'email') => {
    if (!selectedNote) return;

    try {
      await shareNote(selectedNote.id, method);
      toast.success(`Note shared via ${method}`);
    } catch (error) {
      console.error("Error sharing note:", error);
      toast.error("Failed to share note");
    }
  };

  // Voice recording functions
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      toast.info("Recording stopped, transcribing...");
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1];
        
        // Call Claude API for transcription
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please transcribe this audio recording. Provide only the transcription text, no additional commentary."
                  }
                ]
              }
            ],
          })
        });

        if (!response.ok) {
          throw new Error("Transcription failed");
        }

        const data = await response.json();
        const transcription = data.content
          .map((item: any) => (item.type === "text" ? item.text : ""))
          .join("\n");

        // Append transcription to note content
        if (selectedNote) {
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const newContent = editedContent 
            ? `${editedContent}\n\n---\n**Recording (${timestamp}):**\n${transcription}`
            : `**Recording (${timestamp}):**\n${transcription}`;
          
          setEditedContent(newContent);
          setHasUnsavedChanges(true);
          toast.success("Transcription added to note");
        } else {
          // If no note selected, open create dialog with transcription
          setNewNote(prev => ({
            ...prev,
            text_note: transcription,
            title: transcription.split('\n')[0].slice(0, 50) + (transcription.length > 50 ? '...' : '')
          }));
          setIsCreateDialogOpen(true);
        }
      };
    } catch (error) {
      console.error("Error transcribing audio:", error);
      toast.error("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Add attendee
  const handleAddAttendee = () => {
    if (newAttendee.trim() && !editedAttendees.includes(newAttendee.trim())) {
      setEditedAttendees([...editedAttendees, newAttendee.trim()]);
      setHasUnsavedChanges(true);
      setNewAttendee("");
    }
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !editedTags.includes(newTag.trim())) {
      setEditedTags([...editedTags, newTag.trim()]);
      setHasUnsavedChanges(true);
      setNewTag("");
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

  // Filter notes based on search, category, and tab
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    
    if (searchQuery.trim()) {
      filtered = searchNotes(searchQuery);
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    if (selectedProject !== "all") {
      filtered = filtered.filter(note => note.project_id === selectedProject);
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
          note.ai_action_items.some(item => !item.completed)
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
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    });
  }, [notes, searchQuery, selectedCategory, selectedProject, activeTab, searchNotes, getPinnedNotes]);

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-48 bg-secondary rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 bg-secondary rounded" />
              ))}
            </div>
          </div>
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
          <div className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  if (hasUnsavedChanges) {
                    if (confirm("You have unsaved changes. Save before leaving?")) {
                      handleSaveNote();
                    }
                  }
                  navigate("/notes");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">All Notes</span>
              </Button>
              
              <div className="hidden sm:flex items-center gap-2">
                {autoSaveStatus === "saving" && (
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Saving...
                  </Badge>
                )}
                {autoSaveStatus === "saved" && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    Saved
                  </Badge>
                )}
                {hasUnsavedChanges && autoSaveStatus === "idle" && (
                  <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                    Unsaved changes
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Quick actions */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSaveNote}
                disabled={isProcessing || !hasUnsavedChanges}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Save
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
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
                  <DropdownMenuItem onClick={handleExtractActionItems}>
                    <Zap className="h-4 w-4 mr-2" />
                    Extract Action Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSyncCalendar}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Sync to Calendar
                  </DropdownMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex items-center">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportNote('pdf')}>
                        PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportNote('docx')}>
                        Word
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportNote('markdown')}>
                        Markdown
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex items-center">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShareNote('link')}>
                        <Link className="h-4 w-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShareNote('email')}>
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenuItem onClick={handleGenerateAISummary}>
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
                      placeholder="Meeting agenda..."
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
                    onClick={handleExtractActionItems}
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

              {/* AI Summary */}
              {selectedNote.ai_summary && (
                <Card className="p-4 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">AI Summary</h3>
                  </div>
                  <p className="text-foreground">{selectedNote.ai_summary}</p>
                </Card>
              )}

              {/* Main content */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Meeting Notes</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowComments(!showComments)}
                    >
                      {showComments ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                      {showComments ? 'Hide Comments' : 'Show Comments'}
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={editedContent}
                  onChange={(e) => {
                    setEditedContent(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Start typing your meeting notes here..."
                  className="min-h-[400px] resize-none"
                />
              </Card>

              {/* Comments section */}
              {showComments && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Comments</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                      />
                      <Button onClick={() => {
                        // Add comment logic here
                        setNewComment("");
                      }}>
                        Comment
                      </Button>
                    </div>
                    {/* Comments list would go here */}
                  </div>
                </Card>
              )}
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

              {/* Linked Projects */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">Linked Projects</h3>
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  {projects.map(project => (
                    <div key={project.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="text-sm">{project.name}</span>
                      </div>
                      <Switch checked={selectedNote.project_id === project.id} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Voice recording button */}
              <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8">
                {isRecording ? (
                  <Button
                    size="lg"
                    className="rounded-full h-16 w-16 shadow-lg bg-red-500 hover:bg-red-600"
                    onClick={stopRecording}
                  >
                    <div className="flex flex-col items-center">
                      <StopCircle className="h-6 w-6" />
                      <span className="text-xs mt-1">{recordingTime}s</span>
                    </div>
                  </Button>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsTemplateDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Use Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsCreateDialogOpen(true)}>
                  <StickyNote className="h-4 w-4 mr-2" />
                  Blank Note
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
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
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <StickyNote className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No meeting notes yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Create your first meeting note or try adjusting your filters
                </p>
                <Button onClick={() => setIsTemplateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Meeting Note
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="p-4 hover:border-primary/50 transition-all cursor-pointer hover:shadow-md"
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
                            {note.agenda || note.ai_summary || "No agenda set"}
                          </p>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinNote(note.id, !note.is_pinned);
                                toast.success(note.is_pinned ? "Note unpinned" : "Note pinned");
                              }}
                            >
                              {note.is_pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-2" />
                                  Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-2" />
                                  Pin
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateNote(note.id);
                                toast.success("Note duplicated");
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Delete this note?")) {
                                  deleteNote(note.id);
                                  toast.success("Note deleted");
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                          {note.tags.slice(0, 3).map((tag, index) => (
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
                              {note.ai_action_items.filter(item => !item.completed).length}/{note.ai_action_items.length}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            {note.ai_action_items
                              .filter(item => !item.completed)
                              .slice(0, 2)
                              .map(item => (
                                <div key={item.id} className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                  <span className="text-xs truncate">{item.text}</span>
                                </div>
                              ))}
                            {note.ai_action_items.filter(item => !item.completed).length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{note.ai_action_items.filter(item => !item.completed).length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Attendees preview */}
                      {note.attendees && note.attendees.length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{note.attendees.length} attendees</span>
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
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Choose a Meeting Template</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {Object.entries(MEETING_TEMPLATES).map(([key, template]) => (
                <Card
                  key={key}
                  className="p-4 hover:border-primary cursor-pointer transition-colors"
                  onClick={() => applyTemplate(key as keyof typeof MEETING_TEMPLATES)}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{template.name}</h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Sections: {template.sections.join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {template.defaultTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Note Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create New Meeting Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                  <Label htmlFor="meeting_type">Meeting Type</Label>
                  <Select
                    value={newNote.meeting_type}
                    onValueChange={(value) => setNewNote({ ...newNote, meeting_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="client-call">Client Call</SelectItem>
                      <SelectItem value="project-kickoff">Project Kickoff</SelectItem>
                      <SelectItem value="one-on-one">1:1 Meeting</SelectItem>
                      <SelectItem value="board-meeting">Board Meeting</SelectItem>
                      <SelectItem value="brainstorm">Brainstorming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda</Label>
                <Textarea
                  id="agenda"
                  placeholder="Meeting agenda items..."
                  value={newNote.agenda}
                  onChange={(e) => setNewNote({ ...newNote, agenda: e.target.value })}
                  rows={3}
                />
              </div>

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

              {/* Voice recording for new note */}
              <div className="flex justify-center">
                {isRecording ? (
                  <Button
                    variant="destructive"
                    onClick={stopRecording}
                    className="w-full"
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    Stop Recording ({recordingTime}s)
                  </Button>
                ) : isTranscribing ? (
                  <Button disabled className="w-full">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Transcribing...
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={startRecording}
                    className="w-full"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Record Voice Note
                  </Button>
                )}
              </div>
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
