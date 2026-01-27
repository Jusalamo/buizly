import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, addHours } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';

interface QuickEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onSave: (event: Partial<CalendarEvent>) => void;
}

export function QuickEventModal({ open, onOpenChange, selectedDate, onSave }: QuickEventModalProps) {
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (open) setTitle('');
  }, [open]);

  const handleSave = () => {
    if (!title.trim() || !selectedDate) return;

    const startTime = selectedDate;
    const endTime = addHours(selectedDate, 1);

    onSave({
      title,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Quick Add Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {selectedDate && (
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {format(selectedDate, 'h:mm a')}
            </p>
          )}

          <div className="space-y-2">
            <Label>Event Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title"
              className="bg-secondary border-border"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} className="bg-primary text-primary-foreground" disabled={!title.trim()}>
              Create Event
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
