import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 w-full pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col w-full",
        month: "space-y-3 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-2",
        caption_label: "text-sm font-semibold text-foreground",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex w-full",
        head_cell: "text-muted-foreground rounded-md flex-1 font-medium text-xs text-center py-1",
        row: "flex w-full",
        cell: "flex-1 text-center text-sm p-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-primary/10 [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-full p-0 font-medium text-sm aria-selected:opacity-100 hover:bg-primary/20 rounded-md"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground font-bold",
        day_today: "bg-primary/20 text-primary font-bold border border-primary",
        day_outside:
          "day-outside text-muted-foreground/50 opacity-50 aria-selected:bg-primary/10 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
        day_range_middle: "aria-selected:bg-primary/10 aria-selected:text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
