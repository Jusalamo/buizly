import { useMemo } from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, isToday, addHours, startOfDay, eachHourOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { CalendarEvent, CalendarView, UserCalendar } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface CalendarGridProps {
  events: CalendarEvent[];
  currentDate: Date;
  view: CalendarView;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
  onEventDrop: (eventId: string, newStart: Date, newEnd: Date) => void;
  calendars: UserCalendar[];
}

export function CalendarGrid({
  events,
  currentDate,
  view,
  onEventClick,
  onDateClick,
  calendars,
}: CalendarGridProps) {
  if (view === 'month') {
    return (
      <MonthView
        events={events}
        currentDate={currentDate}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />
    );
  }

  if (view === 'week') {
    return (
      <WeekView
        events={events}
        currentDate={currentDate}
        onEventClick={onEventClick}
        onDateClick={onDateClick}
      />
    );
  }

  return (
    <DayView
      events={events}
      currentDate={currentDate}
      onEventClick={onEventClick}
      onDateClick={onDateClick}
    />
  );
}

function MonthView({
  events,
  currentDate,
  onEventClick,
  onDateClick,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.start_time), day));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={cn(
                'border-b border-r border-border p-1 min-h-[100px] cursor-pointer hover:bg-secondary/50 transition-colors',
                !isCurrentMonth && 'bg-muted/30'
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1',
                  isToday(day) && 'bg-primary text-primary-foreground font-bold',
                  !isToday(day) && isCurrentMonth && 'text-foreground',
                  !isToday(day) && !isCurrentMonth && 'text-muted-foreground'
                )}
              >
                {format(day, 'd')}
              </div>

              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  events,
  currentDate,
  onEventClick,
  onDateClick,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const hours = useMemo(() => {
    const start = startOfDay(new Date());
    return eachHourOfInterval({ start, end: addHours(start, 23) });
  }, []);

  const getEventsForDayAndHour = (day: Date, hour: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, day) && eventStart.getHours() === hour.getHours();
    });
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="flex border-b border-border sticky top-0 bg-card z-10">
        <div className="w-16 flex-shrink-0" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex-1 text-center py-2 border-l border-border"
          >
            <div className="text-sm text-muted-foreground">
              {format(day, 'EEE')}
            </div>
            <div
              className={cn(
                'w-8 h-8 mx-auto flex items-center justify-center rounded-full text-lg',
                isToday(day) && 'bg-primary text-primary-foreground font-bold'
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="flex flex-1">
        {/* Time Column */}
        <div className="w-16 flex-shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-16 border-b border-border pr-2 text-right text-xs text-muted-foreground"
            >
              {format(hour, 'h a')}
            </div>
          ))}
        </div>

        {/* Days Columns */}
        {days.map((day) => (
          <div key={day.toISOString()} className="flex-1 border-l border-border">
            {hours.map((hour) => {
              const hourEvents = getEventsForDayAndHour(day, hour);
              
              return (
                <div
                  key={hour.toISOString()}
                  onClick={() => {
                    const clickedTime = new Date(day);
                    clickedTime.setHours(hour.getHours());
                    onDateClick(clickedTime);
                  }}
                  className="h-16 border-b border-border relative cursor-pointer hover:bg-secondary/30"
                >
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      className={cn(
                        'absolute left-0 right-0 mx-1 px-2 py-1 rounded text-xs text-white truncate cursor-pointer hover:opacity-80 transition-opacity',
                        event.has_notes && 'pr-6'
                      )}
                      style={{
                        backgroundColor: event.color || event.calendar_color || '#00ff4d',
                        top: '2px',
                      }}
                    >
                      <div className="flex items-center gap-1">
                        {event.has_notes && <FileText className="h-3 w-3" />}
                        <span className="font-medium">{event.title}</span>
                      </div>
                      <div className="opacity-80">
                        {format(new Date(event.start_time), 'h:mm a')}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function DayView({
  events,
  currentDate,
  onEventClick,
  onDateClick,
}: {
  events: CalendarEvent[];
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  onDateClick: (date: Date) => void;
}) {
  const hours = useMemo(() => {
    const start = startOfDay(new Date());
    return eachHourOfInterval({ start, end: addHours(start, 23) });
  }, []);

  const getEventsForHour = (hour: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start_time);
      return isSameDay(eventStart, currentDate) && eventStart.getHours() === hour.getHours();
    });
  };

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header */}
      <div className="border-b border-border py-4 text-center sticky top-0 bg-card z-10">
        <div className="text-sm text-muted-foreground">
          {format(currentDate, 'EEEE')}
        </div>
        <div
          className={cn(
            'w-12 h-12 mx-auto flex items-center justify-center rounded-full text-2xl',
            isToday(currentDate) && 'bg-primary text-primary-foreground font-bold'
          )}
        >
          {format(currentDate, 'd')}
        </div>
      </div>

      {/* Time Grid */}
      <div className="flex flex-1">
        {/* Time Column */}
        <div className="w-20 flex-shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-20 border-b border-border pr-3 text-right text-sm text-muted-foreground"
            >
              {format(hour, 'h:mm a')}
            </div>
          ))}
        </div>

        {/* Events Column */}
        <div className="flex-1 border-l border-border">
          {hours.map((hour) => {
            const hourEvents = getEventsForHour(hour);
            
            return (
              <div
                key={hour.toISOString()}
                onClick={() => {
                  const clickedTime = new Date(currentDate);
                  clickedTime.setHours(hour.getHours());
                  onDateClick(clickedTime);
                }}
                className="h-20 border-b border-border relative cursor-pointer hover:bg-secondary/30"
              >
                {hourEvents.map((event, index) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      'absolute left-2 right-2 px-3 py-2 rounded-lg text-white cursor-pointer hover:opacity-80 transition-opacity shadow-sm'
                    )}
                    style={{
                      backgroundColor: event.color || event.calendar_color || '#00ff4d',
                      top: `${index * 4 + 4}px`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {event.has_notes && <FileText className="h-4 w-4" />}
                      <span className="font-medium">{event.title}</span>
                    </div>
                    <div className="text-sm opacity-80">
                      {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
                    </div>
                    {event.location && (
                      <div className="text-sm opacity-70 truncate">{event.location}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: `${event.color || event.calendar_color || '#00ff4d'}20`,
        borderLeft: `3px solid ${event.color || event.calendar_color || '#00ff4d'}`,
      }}
    >
      {event.has_notes && <FileText className="h-3 w-3 flex-shrink-0" />}
      <span className="truncate text-foreground">{event.title}</span>
    </div>
  );
}
