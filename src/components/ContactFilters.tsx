import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X, Calendar, Tag, Flame } from "lucide-react";

interface Filters {
  search: string;
  priority: string;
  company: string;
  dateRange: string;
}

interface ContactFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  companies: string[];
  showPriority?: boolean;
}

export function ContactFilters({
  filters,
  onFiltersChange,
  companies,
  showPriority = true,
}: ContactFiltersProps) {
  const update = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActive = filters.search || filters.priority !== "all" || filters.company !== "all" || filters.dateRange !== "all";

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => update("search", e.target.value)}
          placeholder="Search name, company, notes..."
          className="pl-9 bg-secondary border-border"
        />
        {filters.search && (
          <button
            onClick={() => update("search", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {showPriority && (
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <Flame className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filters.priority} onValueChange={(v) => update("priority", v)}>
              <SelectTrigger className="w-[80px] h-6 border-0 bg-transparent p-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={filters.dateRange} onValueChange={(v) => update("dateRange", v)}>
            <SelectTrigger className="w-[90px] h-6 border-0 bg-transparent p-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {companies.length > 0 && (
          <div className="flex items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filters.company} onValueChange={(v) => update("company", v)}>
              <SelectTrigger className="w-[100px] h-6 border-0 bg-transparent p-0 text-xs">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFiltersChange({ search: "", priority: "all", company: "all", dateRange: "all" })}
            className="text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
