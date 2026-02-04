import { Calendar, Clock, ChevronRight, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocationLink } from '@/components/LocationLink';
import { cn } from '@/lib/utils';
import type { MeetingStatus } from '@/types/database';
import type { CalendarEvent } from '@/types/calendar';

const statusColors: Record<string, string> = {
  pending: 'bg-status-warning/20 text-status-warning',
  confirmed: 'bg-status-success/20 text-status-success',
  declined: 'bg-status-error/20 text-status-error',
  cancelled: 'bg-muted text-muted-foreground',
  rescheduled: 'bg-status-info/20 text-status-info',
  tentative: 'bg-status-warning/20 text-status-warning',
};

interface MeetingCardProps {
  id: string;
  title: string;
  date: string;
  time: string;
  location?: string | null;
  status?: MeetingStatus | 'tentative';
  hasNotes?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export function MeetingCard({
  id,
  title,
  date,
  time,
  location,
  status = 'confirmed',
  hasNotes,
  onClick,
  className,
  variant = 'default'
}: MeetingCardProps) {
  return (
    <Card
      className={cn(
        'bg-card border-border cursor-pointer hover:bg-card/80 hover:border-primary/50 transition-all',
        variant === 'compact' ? 'p-3' : 'p-4',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className={cn(
              'font-medium text-foreground truncate',
              variant === 'compact' && 'text-sm'
            )}>
              {title || 'Meeting'}
            </p>
            <Badge className={cn(statusColors[status], 'border-0 text-xs shrink-0')}>
              {status}
            </Badge>
            {hasNotes && (
              <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            )}
          </div>
          <div className={cn(
            'flex items-center gap-4 text-muted-foreground',
            variant === 'compact' ? 'text-xs' : 'text-sm'
          )}>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{date}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{time}</span>
            </div>
            {location && (
              <LocationLink location={location} variant="inline" />
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>
    </Card>
  );
}

// Adapter for CalendarEvent type
interface CalendarEventCardProps {
  event: CalendarEvent;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export function CalendarEventCard({
  event,
  onClick,
  className,
  variant = 'default'
}: CalendarEventCardProps) {
  const startDate = new Date(event.start_time);
  const date = startDate.toLocaleDateString();
  const time = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <MeetingCard
      id={event.id}
      title={event.title}
      date={date}
      time={time}
      location={event.location || event.meeting_link}
      status={event.status === 'cancelled' ? 'cancelled' : 'confirmed'}
      hasNotes={event.has_notes || false}
      onClick={onClick}
      className={className}
      variant={variant}
    />
  );
}
