import { format, isSameDay, addDays, eachDayOfInterval } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { Button } from '@/components/ui/button';
import { Clock, FileText, Users } from 'lucide-react';
import { LocationLink } from '@/components/LocationLink';
import { cn } from '@/lib/utils';

interface CalendarAgendaProps {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onOpenNotes: (event: CalendarEvent) => void;
}

export function CalendarAgenda({ events, currentDate, onEventClick, onOpenNotes }: CalendarAgendaProps) {
  const days = eachDayOfInterval({ start: currentDate, end: addDays(currentDate, 30) });

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  return (
    <div className="p-4 space-y-4">
      {days.map((day) => {
        const dayEvents = getEventsForDay(day);
        if (dayEvents.length === 0) return null;

        return (
          <div key={day.toISOString()} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground sticky top-0 bg-background py-2">
              {format(day, 'EEEE, MMMM d')}
            </h3>
            <div className="space-y-2">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className="bg-card border border-border rounded-lg p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: event.color || event.calendar_color || '#00ff4d' }}
                        />
                        <h4 className="font-medium text-foreground truncate">{event.title}</h4>
                        {event.has_notes && <FileText className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                        </div>
                        {(event.location || event.meeting_link) && (
                          <LocationLink 
                            location={event.meeting_link || event.location} 
                            variant="chip"
                          />
                        )}
                        {event.attendees?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.attendees.length}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {(event.location || event.meeting_link) && (
                        <LocationLink 
                          location={event.meeting_link || event.location} 
                          variant="button"
                          className="hidden sm:flex"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onOpenNotes(event); }}
                        className={cn('text-primary', !event.has_notes && 'opacity-50')}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        {event.has_notes ? 'View Notes' : 'Add Notes'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {events.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No upcoming events
        </div>
      )}
    </div>
  );
}
