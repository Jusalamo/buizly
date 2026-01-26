import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { Trash2, Pin, BellOff, MoreHorizontal } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onDelete: () => void;
  onPin?: () => void;
  onMute?: () => void;
  isPinned?: boolean;
  isMuted?: boolean;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onDelete, 
  onPin, 
  onMute,
  isPinned = false,
  isMuted = false,
  className 
}: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const [showLeftAction, setShowLeftAction] = useState(false);
  const [showRightAction, setShowRightAction] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const DISMISS_THRESHOLD = 0.35;
  const ACTION_REVEAL_THRESHOLD = 60;
  const cardWidth = cardRef.current?.offsetWidth || 300;
  const threshold = cardWidth * DISMISS_THRESHOLD;

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setOffset(e.deltaX);
        setShowLeftAction(e.deltaX < -ACTION_REVEAL_THRESHOLD);
        setShowRightAction(e.deltaX > ACTION_REVEAL_THRESHOLD);
      }
    },
    onSwipedLeft: (e) => {
      if (Math.abs(e.deltaX) > threshold) {
        // Delete action
        handleDelete();
      } else {
        setOffset(0);
        setShowLeftAction(false);
      }
    },
    onSwipedRight: (e) => {
      if (Math.abs(e.deltaX) > threshold) {
        // Pin action
        handlePin();
        setOffset(0);
        setShowRightAction(false);
      } else {
        setOffset(0);
        setShowRightAction(false);
      }
    },
    onSwiped: () => {
      if (Math.abs(offset) < threshold) {
        setOffset(0);
        setShowLeftAction(false);
        setShowRightAction(false);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true
  });

  const handleDelete = () => {
    setIsDismissing(true);
    setOffset(-cardWidth);
    setTimeout(onDelete, 200);
  };

  const handlePin = () => {
    onPin?.();
  };

  const handleMute = () => {
    onMute?.();
  };

  const opacity = Math.max(0.3, 1 - Math.abs(offset) / cardWidth);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn("relative overflow-hidden", className)}>
          {/* Left action indicator (Pin) */}
          <div 
            className={cn(
              "absolute inset-y-0 left-0 flex items-center px-4 transition-opacity duration-150",
              showRightAction ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex items-center gap-2 text-primary">
              <Pin className="h-5 w-5" />
              <span className="text-sm font-medium">Pin</span>
            </div>
          </div>

          {/* Right action indicator (Delete) */}
          <div 
            className={cn(
              "absolute inset-y-0 right-0 flex items-center px-4 transition-opacity duration-150 bg-destructive/10",
              showLeftAction ? "opacity-100" : "opacity-0"
            )}
          >
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-sm font-medium">Delete</span>
              <Trash2 className="h-5 w-5" />
            </div>
          </div>

          {/* Main card content */}
          <div
            ref={cardRef}
            {...handlers}
            style={{
              transform: `translateX(${offset}px)`,
              opacity,
              transition: isDismissing ? 'transform 200ms ease-out, opacity 200ms ease-out' : 
                         offset === 0 ? 'transform 200ms ease-out' : 'none'
            }}
            className={cn(
              "relative bg-card transition-colors cursor-grab active:cursor-grabbing",
              isPinned && "border-l-2 border-l-primary",
              isMuted && "opacity-60"
            )}
          >
            {children}
          </div>
        </div>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="bg-card border-border">
        {onPin && (
          <ContextMenuItem onClick={handlePin} className="flex items-center gap-2">
            <Pin className="h-4 w-4" />
            {isPinned ? 'Unpin' : 'Pin to top'}
          </ContextMenuItem>
        )}
        {onMute && (
          <ContextMenuItem onClick={handleMute} className="flex items-center gap-2">
            <BellOff className="h-4 w-4" />
            {isMuted ? 'Unmute' : 'Mute similar'}
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={handleDelete} className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
