import { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface OptimizedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-16 w-16",
  xl: "h-28 w-28"
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-xl",
  xl: "text-4xl"
};

export function OptimizedAvatar({ 
  src, 
  alt = "Avatar", 
  fallback, 
  className,
  size = "md" 
}: OptimizedAvatarProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Intersection observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Preload image when in view
  useEffect(() => {
    if (!isInView || !src || hasError) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setHasError(true);
    img.src = src;
  }, [isInView, src, hasError]);

  const initials = fallback || alt?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <Avatar ref={containerRef} className={cn(sizeClasses[size], className)}>
      {isInView && src && !hasError && (
        <AvatarImage 
          src={src} 
          alt={alt}
          className={cn(
            "transition-opacity duration-200",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      <AvatarFallback className={cn(
        "bg-primary/20 text-primary font-semibold",
        textSizes[size]
      )}>
        {initials || <User className={cn(
          size === "sm" && "h-4 w-4",
          size === "md" && "h-5 w-5",
          size === "lg" && "h-8 w-8",
          size === "xl" && "h-12 w-12"
        )} />}
      </AvatarFallback>
    </Avatar>
  );
}