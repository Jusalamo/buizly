import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Menu, Calendar, List, LayoutGrid, Rows3 } from 'lucide-react';
import type { CalendarView } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface CalendarHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onToggleSidebar: () => void;
  showSidebar: boolean;
}

export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onToggleSidebar,
  showSidebar,
}: CalendarHeaderProps) {
  const formatDateLabel = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'MMMM d, yyyy');
      case 'week':
        return format(currentDate, 'MMMM yyyy');
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'agenda':
        return format(currentDate, 'MMMM yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  const views: { value: CalendarView; icon: React.ReactNode; label: string }[] = [
    { value: 'day', icon: <Rows3 className="h-4 w-4" />, label: 'Day' },
    { value: 'week', icon: <LayoutGrid className="h-4 w-4" />, label: 'Week' },
    { value: 'month', icon: <Calendar className="h-4 w-4" />, label: 'Month' },
    { value: 'agenda', icon: <List className="h-4 w-4" />, label: 'Agenda' },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('prev')}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('next')}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('today')}
          className="border-border"
        >
          Today
        </Button>

        <h2 className="text-lg font-semibold text-foreground ml-2">
          {formatDateLabel()}
        </h2>
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {views.map((v) => (
          <Button
            key={v.value}
            variant="ghost"
            size="sm"
            onClick={() => onViewChange(v.value)}
            className={cn(
              'gap-2',
              view === v.value && 'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {v.icon}
            <span className="hidden sm:inline">{v.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
