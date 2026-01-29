import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { useMeetingNotes } from "@/hooks/useMeetingNotes";
import { Label } from "@/components/ui/label";

export default function Notes() {
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

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-10 w-48 bg-gray-200 rounded" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Meeting Notes</h1>
            <p className="text-gray-500">Manage all your meeting notes in one place</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
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

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search notes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              className="border rounded-md px-3 py-2"
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
          <TabsList>
            <TabsTrigger value="all">All Notes</TabsTrigger>
            <TabsTrigger value="pinned">Pinned</TabsTrigger>
            <TabsTrigger value="bookmarked">Bookmarked</TabsTrigger>
            <TabsTrigger value="actionable">Action Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {filteredNotes.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500">No notes found</p>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="mt-4"
                >
                  Create Your First Note
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map((note) => (
                  <Card key={note.id} className="p-4 hover:shadow-lg transition-shadow">
                    <div className="space-y-3">
                      {/* Note Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg truncate">
                            {note.title || "Untitled Note"}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(note.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {note.is_pinned && (
                            <Pin className="h-4 w-4 text-yellow-500" />
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
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
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
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
                      </div>

                      {/* Content Preview */}
                      <p className="text-gray-700 line-clamp-3">
                        {note.text_note || note.ai_summary || "No content"}
                      </p>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Action Items */}
                      {note.ai_action_items && note.ai_action_items.length > 0 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">Action Items</span>
                            <span className="text-gray-500">
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
                                  <div className="h-4 w-4 rounded-full border" />
                                )}
                              </button>
                              <span className={item.completed ? "line-through text-gray-500" : ""}>
                                {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (note.bookmarks.length > 0) {
                              removeBookmark(note.id, note.bookmarks[0].id);
                            } else {
                              addBookmark(note.id, {
                                text: "Bookmarked",
                                type: "manual",
                              });
                            }
                          }}
                        >
                          {note.bookmarks.length > 0 ? (
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
                          onClick={() => navigate(`/notes/${note.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Notes</p>
                <p className="text-2xl font-bold">{notes.length}</p>
              </div>
              <Folder className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pinned</p>
                <p className="text-2xl font-bold">{getPinnedNotes().length}</p>
              </div>
              <Pin className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">With AI</p>
                <p className="text-2xl font-bold">
                  {notes.filter(n => n.ai_summary).length}
                </p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Categories</p>
                <p className="text-2xl font-bold">{categories.length}</p>
              </div>
              <Tag className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
