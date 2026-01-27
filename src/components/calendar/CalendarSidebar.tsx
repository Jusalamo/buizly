import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { UserCalendar } from '@/types/calendar';

interface CalendarSidebarProps {
  calendars: UserCalendar[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onToggleCalendar: (calendarId: string, isVisible: boolean) => void;
  onClose: () => void;
}

export function CalendarSidebar({ calendars, currentDate, onDateSelect, onToggleCalendar, onClose }: CalendarSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-card flex-shrink-0 hidden lg:flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Calendar</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2">
        <Calendar
          mode="single"
          selected={currentDate}
          onSelect={(date) => date && onDateSelect(date)}
          className="w-full"
        />
      </div>

      {calendars.length > 0 && (
        <div className="p-4 border-t border-border flex-1 overflow-auto">
          <h4 className="text-sm font-medium text-foreground mb-3">My Calendars</h4>
          <div className="space-y-2">
            {calendars.map((cal) => (
              <div key={cal.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="text-sm text-foreground truncate">{cal.name}</span>
                </div>
                <Switch
                  checked={cal.is_visible}
                  onCheckedChange={(checked) => onToggleCalendar(cal.id, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
