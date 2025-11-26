import { useState, useEffect } from "react";
import { Search, X, Calendar, User, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearch } from "@/hooks/useSearch";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    name: "",
    location: ""
  });
  
  const { results, loading, search, clearResults } = useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (query.trim() || Object.values(filters).some(v => v)) {
        search(query, filters);
      } else {
        clearResults();
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, filters, search, clearResults]);

  const handleConnectionClick = (id: string) => {
    setOpen(false);
    navigate(`/connection/${id}`);
  };

  const handleMeetingClick = (id: string) => {
    setOpen(false);
    navigate(`/meeting/${id}`);
  };

  const clearAll = () => {
    setQuery("");
    setFilters({ dateFrom: "", dateTo: "", name: "", location: "" });
    clearResults();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-foreground hover:bg-card-surface"
        >
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Search</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connections, meetings, notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 bg-secondary border-border text-foreground"
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filters */}
          <Collapsible open={showFilters} onOpenChange={setShowFilters}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </span>
                <span className="text-xs">
                  {showFilters ? "Hide" : "Show"}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground text-sm">Date To</Label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Name</Label>
                <Input
                  placeholder="Filter by name"
                  value={filters.name}
                  onChange={(e) => setFilters(f => ({ ...f, name: e.target.value }))}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-sm">Location</Label>
                <Input
                  placeholder="Filter by location"
                  value={filters.location}
                  onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={clearAll}
                className="w-full border-border text-foreground"
              >
                Clear All Filters
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Results */}
          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connections Results */}
                {results.connections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Connections ({results.connections.length})
                    </h4>
                    <div className="space-y-2">
                      {results.connections.map((connection) => (
                        <button
                          key={connection.id}
                          onClick={() => handleConnectionClick(connection.id)}
                          className="w-full text-left p-3 rounded-lg bg-card-surface hover:bg-border transition-colors"
                        >
                          <p className="font-medium text-foreground">
                            {connection.connection_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {connection.connection_title} 
                            {connection.connection_company && ` at ${connection.connection_company}`}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meetings Results */}
                {results.meetings.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Meetings ({results.meetings.length})
                    </h4>
                    <div className="space-y-2">
                      {results.meetings.map((meeting) => (
                        <button
                          key={meeting.id}
                          onClick={() => handleMeetingClick(meeting.id)}
                          className="w-full text-left p-3 rounded-lg bg-card-surface hover:bg-border transition-colors"
                        >
                          <p className="font-medium text-foreground">
                            {meeting.title || "Untitled Meeting"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(meeting.meeting_date), "MMM d, yyyy")} at {meeting.meeting_time}
                          </p>
                          {meeting.location && (
                            <p className="text-xs text-muted-foreground">
                              📍 {meeting.location}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!loading && 
                 results.connections.length === 0 && 
                 results.meetings.length === 0 && 
                 (query || Object.values(filters).some(v => v)) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No results found</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
