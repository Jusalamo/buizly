import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Filter,
  Pin,
  PinOff,
  Bookmark,
  BookmarkPlus,
  Tag,
  Folder,
  MoreVertical,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Sparkles,
  CheckCircle,
  ArrowLeft,
  Save,
  X,
  ChevronRight,
  StickyNote, // ADD THIS IMPORT
} from "lucide-react";
import { useMeetingNotes } from "@/hooks/useMeetingNotes";
import { Label } from "@/components/ui/label";

export default function Notes() {
  const { id: noteId } = useParams();
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
    createCategory,
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");

  // If we have a noteId in URL, show that note
  useEffect(() => {
    if (noteId && notes.length > 0) {
      const foundNote = notes.find(n => n.id === noteId);
      if (foundNote) {
        setSelectedNote(foundNote);
        setEditedContent(foundNote.text_note || "");
      }
    } else {
      setSelectedNote(null);
    }
  }, [noteId, notes]);

  // Filter notes based on search, category, and tab
  const filteredNotes = useMemo(() => {
    let filtered = notes;
    
    // Apply search
    if (searchQuery.trim()) {
      filtered = searchNotes(searchQuery);
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    // Apply tab filter
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
    
    return filtered;
  }, [notes, searchQuery, selectedCategory, activeTab, searchNotes, getPinnedNotes]);

  const handleCreateNote = async () => {
    try {
      await createNote(newNote);
      setNewNote({
        title: "",
        text_note: "",
        category: "general",
        tags: [],
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const handleSaveNote = async () => {
    if (selectedNote) {
      await updateNote(selectedNote.id, { text_note: editedContent });
      setIsEditing(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 bg-secondary rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-secondary rounded" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // If we're viewing a single note, show detail view
  if (selectedNote) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Back button and actions */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/notes")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Notes
            </Button>
            
            {isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveNote}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {!selectedNote.ai_summary && (
                  <Button variant="outline" onClick={handleGenerateAISummary}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Summary
                  </Button>
                )}
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    if (confirm("Delete this note?")) {
                      deleteNote(selectedNote.id);
                      navigate("/notes");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>

          {/* Note detail */}
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-2">{selectedNote.title}</h1>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(selectedNote.created_at)}</span>
              </div>
              {selectedNote.category && (
                <Badge variant="secondary">{selectedNote.category}</Badge>
              )}
              {selectedNote.is_pinned && (
                <Badge variant="outline" className="gap-1">
                  <Pin className="h-3 w-3" />
                  Pinned
                </Badge>
              )}
            </div>

            {selectedNote.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedNote.tags.map((tag: string, index: number) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {isEditing ? (
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={15}
                className="font-mono"
              />
            ) : (
              <div className="whitespace-pre-wrap text-foreground">
                {selectedNote.text_note || "No content"}
              </div>
            )}
          </Card>

          {/* AI Summary */}
          {selectedNote.ai_summary && (
            <Card className="p-6 border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">AI Summary</h2>
              </div>
              <p className="text-foreground">{selectedNote.ai_summary}</p>
            </Card>
          )}

          {/* Action Items */}
          {selectedNote.ai_action_items && selectedNote.ai_action_items.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Action Items</h2>
                <Badge variant="outline">
                  {selectedNote.ai_action_items.filter((item: any) => item.completed).length}/
                  {selectedNote.ai_action_items.length}
                </Badge>
              </div>
              
              <div className="space-y-3">
                {selectedNote.ai_action_items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                  >
                    <button
                      onClick={() => updateActionItem(selectedNote.id, item.id, { completed: !item.completed })}
                      className="flex-shrink-0 mt-0.5"
                    >
                      {item.completed ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-border" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </Layout>
    );
  }

  // Otherwise show the notes list view
  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Meeting Notes</h1>
            <p className="text-muted-foreground">Capture, organize, and review your meeting notes</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Meeting title"
                    value={newNote.title}
                    onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    placeholder="Add your notes here..."
                    rows={8}
                    value={newNote.text_note}
                    onChange={(e) => setNewNote({ ...newNote, text_note: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateNote}>
                  Save Note
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notes by title, content, or tags..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="all">All Notes</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
            <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
            <TabsTrigger value="actionable">Action Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-6">
            {filteredNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-secondary rounded-full flex items-center justify-center mb-4">
                  <StickyNote className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No notes found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || selectedCategory !== "all" || activeTab !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first note to get started"}
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Note
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="group hover:shadow-lg transition-shadow">
                    <div className="p-5 space-y-4">
                      {/* Note Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground truncate">
                              {note.title || "Untitled Note"}
                            </h3>
                            {note.is_pinned && (
                              <Pin className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(note.created_at)}</span>
                          </div>
                        </div>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => togglePinNote(note.id, !note.is_pinned)}>
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
                            <DropdownMenuItem onClick={() => navigate(`/notes?note=${note.id}`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this note?")) {
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

                      {/* Note Preview */}
                      <div className="text-sm text-foreground line-clamp-3">
                        {note.text_note || note.ai_summary || "No content"}
                      </div>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Action Items */}
                      {note.ai_action_items && note.ai_action_items.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">Action Items</span>
                            <span className="text-muted-foreground">
                              {note.ai_action_items.filter(item => item.completed).length}/
                              {note.ai_action_items.length}
                            </span>
                          </div>
                          {note.ai_action_items.slice(0, 2).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm">
                              <button
                                onClick={() => updateActionItem(note.id, item.id, { completed: !item.completed })}
                              >
                                {item.completed ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border border-border" />
                                )}
                              </button>
                              <span className={item.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-3 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => {
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
                              <Bookmark className="h-4 w-4 mr-1 fill-current" />
                              Bookmarked
                            </>
                          ) : (
                            <>
                              <BookmarkPlus className="h-4 w-4 mr-1" />
                              Bookmark
                            </>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={() => navigate(`/notes?note=${note.id}`)}
                        >
                          View
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Notes</p>
                <p className="text-2xl font-bold text-foreground">{notes.length}</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg">
                <StickyNote className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pinned</p>
                <p className="text-2xl font-bold text-foreground">{getPinnedNotes().length}</p>
              </div>
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Pin className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With AI Summary</p>
                <p className="text-2xl font-bold text-foreground">
                  {notes.filter(n => n.ai_summary).length}
                </p>
              </div>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold text-foreground">{categories.length}</p>
              </div>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Folder className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
