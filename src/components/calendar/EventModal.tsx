import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addHours } from 'date-fns';
import { CalendarIcon, Clock, MapPin, Trash2, FileText, Link, Video, ExternalLink, Loader2 } from 'lucide-react';
import type { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';
import { parseLocation } from '@/lib/locationUtils';

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent | null;
  onSave: (event: Partial<CalendarEvent>) => void;
  onDelete?: () => void;
  onOpenNotes?: () => void;
}

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  const ampm = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${min} ${ampm}`;
});

export function EventModal({ open, onOpenChange, event, onSave, onDelete, onOpenNotes }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('09:00 AM');
  const [endTime, setEndTime] = useState('10:00 AM');
  const [color, setColor] = useState('#00ff4d');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setLocation(event.location || '');
      setMeetingLink(event.meeting_link || '');
      setDate(new Date(event.start_time));
      setStartTime(format(new Date(event.start_time), 'h:mm a').toUpperCase());
      setEndTime(format(new Date(event.end_time), 'h:mm a').toUpperCase());
      setColor(event.color || '#00ff4d');
    } else {
      setTitle('');
      setDescription('');
      setLocation('');
      setMeetingLink('');
      setDate(new Date());
      setStartTime('09:00 AM');
      setEndTime('10:00 AM');
      setColor('#00ff4d');
    }
    setSaving(false);
  }, [event, open]);

  const handleSave = async () => {
    setSaving(true);
    const [startHour, startMin, startAmPm] = parseTime(startTime);
    const [endHour, endMin, endAmPm] = parseTime(endTime);

    const startDate = new Date(date);
    startDate.setHours(startAmPm === 'PM' && startHour !== 12 ? startHour + 12 : startHour === 12 && startAmPm === 'AM' ? 0 : startHour, startMin);

    const endDate = new Date(date);
    endDate.setHours(endAmPm === 'PM' && endHour !== 12 ? endHour + 12 : endHour === 12 && endAmPm === 'AM' ? 0 : endHour, endMin);

    try {
      await onSave({
        title,
        description,
        location,
        meeting_link: meetingLink,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        color,
      });
    } finally {
      setSaving(false);
    }
  };

  const parseTime = (time: string): [number, number, string] => {
    const [timePart, ampm] = time.split(' ');
    const [hour, min] = timePart.split(':').map(Number);
    return [hour, min, ampm];
  };

  // Detect location type for preview
  const locationInfo = location ? parseLocation(location) : null;
  const meetingLinkInfo = meetingLink ? parseLocation(meetingLink) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{event ? 'Edit Event' : 'New Event'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="bg-secondary border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left bg-secondary border-border")}>
                    {format(date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 bg-secondary border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="flex items-center gap-1"><Clock className="h-3 w-3" />Start</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[200px]">
                  {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border max-h-[200px]">
                  {timeSlots.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" />Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="bg-secondary border-border" />
            {/* Location preview */}
            {locationInfo && location.trim() && (
              <div className="flex items-center gap-2">
                {locationInfo.type === 'virtual' ? (
                  <a
                    href={locationInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Video className="h-3.5 w-3.5" />
                    Join {locationInfo.platform}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Get directions
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Link className="h-3 w-3" />Meeting Link</Label>
            <Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="Zoom, Google Meet, Teams link" className="bg-secondary border-border" />
            {/* Meeting link preview */}
            {meetingLinkInfo && meetingLink.trim() && meetingLinkInfo.type === 'virtual' && (
              <a
                href={meetingLinkInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <Video className="h-3.5 w-3.5" />
                Join {meetingLinkInfo.platform}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add details" className="bg-secondary border-border min-h-[80px]" />
          </div>

          <div className="flex gap-2 pt-4">
            {event && onDelete && (
              <Button variant="outline" onClick={onDelete} className="text-destructive border-destructive hover:bg-destructive/10 h-10 min-w-[44px]">
                <Trash2 className="h-4 w-4 mr-2" />Delete
              </Button>
            )}
            {event && onOpenNotes && (
              <Button variant="outline" onClick={onOpenNotes} className="text-primary border-primary h-10 min-w-[44px]">
                <FileText className="h-4 w-4 mr-2" />{event.has_notes ? 'View Notes' : 'Add Notes'}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-10">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="bg-primary text-primary-foreground h-10 min-w-[80px]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
