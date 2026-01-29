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
} from "lucide-react";
import { useMeetingNotes } from "@/hooks/useMeetingNotes";
import { Label } from "@/components/ui/label";

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
  } = useMeetingNotes();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    title: "",
    text_note: "",
    category: "general",
    tags: [] as string[],
  });
  
  // For viewing/editing a single note
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save timer
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // If we have a noteId in URL, show that note
  useEffect(() => {
    if (noteIdFromQuery && notes.length > 0) {
      const foundNote = notes.find(n => n.id === noteIdFromQuery);
      if (foundNote) {
        setSelectedNote(foundNote);
        setEditedTitle(foundNote.title || "");
        setEditedContent(foundNote.text_note || "");
        setHasUnsavedChanges(false);
      }
    } else {
      setSelectedNote(null);
      setHasUnsavedChanges(false);
    }
  }, [noteIdFromQuery, notes]);

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
  }, [hasUnsavedChanges, editedTitle, editedContent]);

  // Filter notes based on search, category, and tab
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    
    if (searchQuery.trim()) {
      filtered = searchNotes(searchQuery);
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(note => note.category === selectedCategory);
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
    }
    
    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [notes, searchQuery, selectedCategory, activeTab, searchNotes, getPinnedNotes]);

  const handleCreateNote = async () => {
    try {
      const created = await createNote(newNote);
      setNewNote({
        title: "",
        text_note: "",
        category: "general",
        tags: [],
      });
      setIsCreateDialogOpen(false);
      
      // Navigate to the new note
      if (created?.id) {
        navigate(`/notes?note=${created.id}`);
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleSaveNote = async () => {
    if (selectedNote && hasUnsavedChanges) {
      try {
        await updateNote(selectedNote.id, { 
          title: editedTitle,
          text_note: editedContent 
        });
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error saving note:", error);
      }
    }
  };

  const handleGenerateAISummary = async () => {
    if (selectedNote) {
      try {
        await generateAISummary(selectedNote.id);
      } catch (error) {
        console.error("Error generating AI summary:", error);
      }
    }
  };

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
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
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

        const data = await response.json();
        const transcription = data.content
          .map((item: any) => (item.type === "text" ? item.text : ""))
          .join("\n");

        // Append transcription to note content
        if (selectedNote) {
          const newContent = editedContent 
            ? `${editedContent}\n\n${transcription}`
            : transcription;
          setEditedContent(newContent);
          setHasUnsavedChanges(true);
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
      alert("Failed to transcribe audio. Please try again.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

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
        <div className="max-w-4xl mx-auto">
          {/* Mobile header */}
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between md:hidden">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                if (hasUnsavedChanges) {
                  handleSaveNote();
                }
                navigate("/notes");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Notes
            </Button>
            
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-xs text-muted-foreground">Saving...</span>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => togglePinNote(selectedNote.id, !selectedNote.is_pinned)}>
                    {selectedNote.is_pinned ? (
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
                  {!selectedNote.ai_summary && (
                    <DropdownMenuItem onClick={handleGenerateAISummary}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      AI Summary
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this note?")) {
                        deleteNote(selectedNote.id);
                        navigate("/notes");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Desktop header */}
          <div className="hidden md:flex items-center justify-between p-6 border-b">
            <Button 
              variant="ghost" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  handleSaveNote();
                }
                navigate("/notes");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
            
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => togglePinNote(selectedNote.id, !selectedNote.is_pinned)}
              >
                {selectedNote.is_pinned ? (
                  <PinOff className="h-4 w-4" />
                ) : (
                  <Pin className="h-4 w-4" />
                )}
              </Button>
              
              {!selectedNote.ai_summary && (
                <Button variant="outline" size="sm" onClick={handleGenerateAISummary}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Summary
                </Button>
              )}
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => {
                  if (confirm("Delete this note?")) {
                    deleteNote(selectedNote.id);
                    navigate("/notes");
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Note content */}
          <div className="p-4 md:p-6 space-y-6">
            {/* Title input */}
            <Input
              value={editedTitle}
              onChange={(e) => {
                setEditedTitle(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Untitled"
              className="text-2xl md:text-3xl font-bold border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(selectedNote.created_at)}</span>
              </div>
              {selectedNote.category && (
                <Badge variant="secondary" className="text-xs">
                  {selectedNote.category}
                </Badge>
              )}
              {selectedNote.tags.map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* AI Summary */}
            {selectedNote.ai_summary && (
              <Card className="p-4 border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">AI Summary</h3>
                </div>
                <p className="text-sm text-foreground">{selectedNote.ai_summary}</p>
              </Card>
            )}

            {/* Action Items */}
            {selectedNote.ai_action_items && selectedNote.ai_action_items.length > 0 && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Action Items</h3>
                  <Badge variant="outline" className="text-xs">
                    {selectedNote.ai_action_items.filter((item: any) => item.completed).length}/
                    {selectedNote.ai_action_items.length}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {selectedNote.ai_action_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-secondary/50"
                    >
                      <button
                        onClick={() => updateActionItem(selectedNote.id, item.id, { completed: !item.completed })}
                        className="flex-shrink-0 mt-0.5"
                      >
                        {item.completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <div className="h-4 w-4 rounded-full border-2 border-border" />
                        )}
                      </button>
                      <p className={`text-sm flex-1 ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Content textarea */}
            <Textarea
              value={editedContent}
              onChange={(e) => {
                setEditedContent(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Start typing or record a voice note..."
              className="min-h-[400px] border-0 px-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />

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
                    <span className="text-xs mt-1">{formatRecordingTime(recordingTime)}</span>
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
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Notes</h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </p>
          </div>
          
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="rounded-full h-12 w-12 md:h-auto md:w-auto md:rounded-md"
          >
            <Plus className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">New Note</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
            <TabsTrigger value="pinned" className="text-xs md:text-sm">Pinned</TabsTrigger>
            <TabsTrigger value="bookmarked" className="text-xs md:text-sm">Saved</TabsTrigger>
            <TabsTrigger value="actionable" className="text-xs md:text-sm">Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <StickyNote className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No notes yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {searchQuery || activeTab !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first note to get started"}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className="p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/notes?note=${note.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {note.is_pinned && (
                            <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-foreground truncate">
                            {note.title || "Untitled Note"}
                          </h3>
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {note.text_note || note.ai_summary || "No content"}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatDate(note.created_at)}</span>
                          {note.ai_action_items && note.ai_action_items.length > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                {note.ai_action_items.filter(item => !item.completed).length} tasks
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePinNote(note.id, !note.is_pinned);
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
                              if (note.bookmarks?.length > 0) {
                                removeBookmark(note.id, note.bookmarks[0].id);
                              } else {
                                addBookmark(note.id, {
                                  text: "Bookmarked",
                                  type: "manual",
                                });
                              }
                            }}
                          >
                            {note.bookmarks?.length > 0 ? (
                              <>
                                <Bookmark className="h-4 w-4 mr-2 fill-current" />
                                Remove Bookmark
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="h-4 w-4 mr-2" />
                                Bookmark
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this note?")) {
                                deleteNote(note.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Note Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Note title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  placeholder="Start typing or record a voice note..."
                  rows={8}
                  value={newNote.text_note}
                  onChange={(e) => setNewNote({ ...newNote, text_note: e.target.value })}
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
                    Stop Recording ({formatRecordingTime(recordingTime)})
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
              <Button onClick={handleCreateNote} disabled={!newNote.title.trim()}>
                Create Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
