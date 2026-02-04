import { Video, MapPin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseLocation, openLocation, type ParsedLocation } from '@/lib/locationUtils';
import { cn } from '@/lib/utils';

interface LocationLinkProps {
  location: string | null | undefined;
  variant?: 'button' | 'inline' | 'chip';
  className?: string;
  showIcon?: boolean;
  truncate?: boolean;
}

export function LocationLink({ 
  location, 
  variant = 'inline', 
  className,
  showIcon = true,
  truncate = true
}: LocationLinkProps) {
  const parsed = parseLocation(location);
  
  if (!parsed) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openLocation(parsed);
  };

  const Icon = parsed.icon === 'video' ? Video : MapPin;

  if (variant === 'button') {
    return (
      <Button
        size="sm"
        variant={parsed.type === 'virtual' ? 'default' : 'outline'}
        onClick={handleClick}
        className={cn(
          parsed.type === 'virtual' && 'bg-primary text-primary-foreground',
          className
        )}
      >
        {showIcon && <Icon className="h-4 w-4 mr-1" />}
        {parsed.type === 'virtual' ? parsed.displayLabel : 'Directions'}
        <ExternalLink className="h-3 w-3 ml-1" />
      </Button>
    );
  }

  if (variant === 'chip') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
          parsed.type === 'virtual' 
            ? 'bg-primary/10 text-primary hover:bg-primary/20' 
            : 'bg-muted text-muted-foreground hover:bg-muted/80',
          className
        )}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        <span className={cn(truncate && 'truncate max-w-[100px]')}>
          {parsed.type === 'virtual' ? parsed.displayLabel : parsed.displayLabel}
        </span>
      </button>
    );
  }

  // Inline variant (default)
  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1 text-primary hover:underline text-sm',
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span className={cn(truncate && 'truncate max-w-[100px]')}>
        {parsed.type === 'virtual' ? parsed.displayLabel : parsed.displayLabel}
      </span>
    </button>
  );
}
