import { useState, useMemo } from 'react';
import { Search, Calendar, Link2Off, Plus, Check, Loader2 } from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, startOfToday, addHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCalendar } from '@/hooks/useCalendar';
import { cn } from '@/lib/utils';

interface CalendarLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEventId?: string | null;
  onLinkEvent: (eventId: string) => void;
  onUnlinkEvent: () => void;
  noteTitle?: string;
}

export function CalendarLinkModal({
  open,
  onOpenChange,
  currentEventId,
  onLinkEvent,
  onUnlinkEvent,
  noteTitle,
}: CalendarLinkModalProps) {
  const { events, createEvent } = useCalendar();
  const [search, setSearch] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [creating, setCreating] = useState(false);

  // Get current linked event details
  const currentEvent = useMemo(() => {
    if (!currentEventId) return null;
    return events.find(e => e.id === currentEventId);
  }, [currentEventId, events]);

  // Filter events by search and only show upcoming events
  const filteredEvents = useMemo(() => {
    const today = startOfToday();
    return events
      .filter(e => {
        const eventDate = new Date(e.start_time);
        const isUpcoming = eventDate >= today;
        const matchesSearch = !search.trim() || 
          e.title.toLowerCase().includes(search.toLowerCase());
        return isUpcoming && matchesSearch && e.id !== currentEventId;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [events, search, currentEventId]);

  // Group events by time period
  const groupedEvents = useMemo(() => {
    const groups: { label: string; events: typeof filteredEvents }[] = [];
    
    const todayEvents = filteredEvents.filter(e => isToday(new Date(e.start_time)));
    const tomorrowEvents = filteredEvents.filter(e => isTomorrow(new Date(e.start_time)));
    const thisWeekEvents = filteredEvents.filter(e => {
      const date = new Date(e.start_time);
      return isThisWeek(date) && !isToday(date) && !isTomorrow(date);
    });
    const laterEvents = filteredEvents.filter(e => {
      const date = new Date(e.start_time);
      return !isThisWeek(date);
    });

    if (todayEvents.length) groups.push({ label: 'Today', events: todayEvents });
    if (tomorrowEvents.length) groups.push({ label: 'Tomorrow', events: tomorrowEvents });
    if (thisWeekEvents.length) groups.push({ label: 'This Week', events: thisWeekEvents });
    if (laterEvents.length) groups.push({ label: 'Upcoming', events: laterEvents });

    return groups;
  }, [filteredEvents]);

  const handleSelectEvent = (eventId: string) => {
    onLinkEvent(eventId);
    onOpenChange(false);
  };

  const handleUnlink = () => {
    onUnlinkEvent();
    onOpenChange(false);
  };

  const handleShowCreateForm = () => {
    const now = new Date();
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMinutes, 0, 0);
    
    setNewEventTitle(noteTitle || '');
    setNewEventDate(format(now, 'yyyy-MM-dd'));
    setNewEventTime(format(now, 'HH:mm'));
    setShowCreateForm(true);
  };

  const handleCreateAndLink = async () => {
    if (!newEventTitle.trim() || !newEventDate || !newEventTime) return;
    
    setCreating(true);
    try {
      const startTime = new Date(`${newEventDate}T${newEventTime}`);
      const endTime = addHours(startTime, 1);

      const newEvent = await createEvent({
        title: newEventTitle,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
      });

      if (newEvent?.id) {
        onLinkEvent(newEvent.id);
        onOpenChange(false);
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error('Error creating event:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setShowCreateForm(false);
    }}>
      <DialogContent className="sm:max-w-[400px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Link to Calendar Event
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Currently Linked */}
          {currentEvent && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Currently linked</p>
                  <p className="font-medium text-foreground truncate">{currentEvent.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(currentEvent.start_time), 'MMM d, h:mm a')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleUnlink}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Link2Off className="h-4 w-4 mr-1" />
                  Unlink
                </Button>
              </div>
            </div>
          )}

          {showCreateForm ? (
            /* Inline Create Event Form */
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Create New Event</p>
              <Input
                placeholder="Event title..."
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="time"
                  value={newEventTime}
                  onChange={(e) => setNewEventTime(e.target.value)}
                  className="w-[120px]"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateAndLink}
                  disabled={!newEventTitle.trim() || !newEventDate || !newEventTime || creating}
                  className="flex-1 gap-2"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create & Link
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Events List */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                {groupedEvents.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No upcoming events found</p>
                  </div>
                ) : (
                  <div className="space-y-4 pb-4">
                    {groupedEvents.map(group => (
                      <div key={group.label}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {group.label}
                        </h4>
                        <div className="space-y-1">
                          {group.events.map(event => (
                            <button
                              key={event.id}
                              onClick={() => handleSelectEvent(event.id)}
                              className={cn(
                                'w-full p-3 rounded-lg text-left transition-colors',
                                'hover:bg-accent/50 border border-transparent hover:border-border',
                                'flex items-center gap-3'
                              )}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: event.color || event.calendar_color || 'hsl(var(--primary))' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate text-sm">
                                  {event.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(event.start_time), 'h:mm a')}
                                  {event.location && ` • ${event.location}`}
                                </p>
                              </div>
                              <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Create New Event Button */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleShowCreateForm}
                >
                  <Plus className="h-4 w-4" />
                  Create New Event & Link
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
