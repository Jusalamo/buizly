import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useCalendar } from '@/hooks/useCalendar';
import { useAppCache } from '@/hooks/useAppCache';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { CalendarAgenda } from '@/components/calendar/CalendarAgenda';
import { CalendarSidebar } from '@/components/calendar/CalendarSidebar';
import { EventModal } from '@/components/calendar/EventModal';
import { QuickEventModal } from '@/components/calendar/QuickEventModal';
import { Skeleton } from '@/components/ui/skeleton';
import type { CalendarEvent, CalendarView } from '@/types/calendar';
import { Plus, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';

export default function CalendarPage() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const {
    events,
    calendars,
    loading,
    syncing,
    currentDate,
    setCurrentDate,
    view,
    setView,
    createEvent,
    updateEvent,
    deleteEvent,
    navigateDate,
    getEventsForDate,
    syncGoogleCalendar,
    toggleCalendarVisibility,
  } = useCalendar();

  const [showEventModal, setShowEventModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    if (initialized && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [initialized, isAuthenticated, navigate]);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowQuickAdd(true);
  };

  const handleEventDrop = async (eventId: string, newStart: Date, newEnd: Date) => {
    await updateEvent(eventId, {
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
    });
  };

  const handleCreateEvent = async (eventData: Partial<CalendarEvent>) => {
    await createEvent(eventData);
    setShowEventModal(false);
    setShowQuickAdd(false);
    setSelectedEvent(null);
    setSelectedDate(null);
  };

  const handleUpdateEvent = async (eventData: Partial<CalendarEvent>) => {
    if (selectedEvent) {
      await updateEvent(selectedEvent.id, eventData);
      setShowEventModal(false);
      setSelectedEvent(null);
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      await deleteEvent(selectedEvent.id);
      setShowEventModal(false);
      setSelectedEvent(null);
    }
  };

  const openNotes = (event: CalendarEvent) => {
    if (event.meeting_notes_id) {
      navigate(`/notes/${event.meeting_notes_id}`);
    } else {
      navigate(`/notes/new?event=${event.id}&title=${encodeURIComponent(event.title)}&date=${event.start_time}`);
    }
  };

  if (loading) {
    return (
      <Layout title="Calendar">
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
          <Skeleton className="h-full w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Calendar">
      <div className="flex h-[calc(100vh-8rem)] overflow-hidden">
        {/* Sidebar */}
        {showSidebar && (
          <CalendarSidebar
            calendars={calendars}
            currentDate={currentDate}
            onDateSelect={setCurrentDate}
            onToggleCalendar={toggleCalendarVisibility}
            onClose={() => setShowSidebar(false)}
          />
        )}

        {/* Main Calendar Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <CalendarHeader
            currentDate={currentDate}
            view={view}
            onViewChange={setView}
            onNavigate={navigateDate}
            onToggleSidebar={() => setShowSidebar(!showSidebar)}
            showSidebar={showSidebar}
          />

          {/* Action Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setSelectedEvent(null);
                  setShowEventModal(true);
                }}
                className="bg-primary text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Event
              </Button>
              <Button
                variant="outline"
                onClick={syncGoogleCalendar}
                disabled={syncing}
                className="border-border"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarIcon className="h-4 w-4" />
              <span>{events.length} events</span>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="flex-1 overflow-auto">
            {view === 'agenda' ? (
              <CalendarAgenda
                events={events}
                currentDate={currentDate}
                onEventClick={handleEventClick}
                onOpenNotes={openNotes}
              />
            ) : (
              <CalendarGrid
                events={events}
                currentDate={currentDate}
                view={view}
                onEventClick={handleEventClick}
                onDateClick={handleDateClick}
                onEventDrop={handleEventDrop}
                calendars={calendars}
              />
            )}
          </div>
        </div>
      </div>

      {/* Event Modal */}
      <EventModal
        open={showEventModal}
        onOpenChange={setShowEventModal}
        event={selectedEvent}
        onSave={selectedEvent ? handleUpdateEvent : handleCreateEvent}
        onDelete={selectedEvent ? handleDeleteEvent : undefined}
        onOpenNotes={selectedEvent ? () => openNotes(selectedEvent) : undefined}
      />

      {/* Quick Add Modal */}
      <QuickEventModal
        open={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        selectedDate={selectedDate}
        onSave={handleCreateEvent}
      />
    </Layout>
  );
}
