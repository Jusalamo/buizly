import { useState } from 'react';
import { Sparkles, FileText, ListTodo, Quote, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AIActionsMenuProps {
  noteContent: string;
  meetingTitle?: string;
  attendees?: string[];
  onSummaryGenerated: (summary: string) => void;
  onActionItemsExtracted: (items: Array<{ task: string; assignee?: string; deadline?: string }>) => void;
  disabled?: boolean;
}

export function AIActionsMenu({
  noteContent,
  meetingTitle,
  attendees,
  onSummaryGenerated,
  onActionItemsExtracted,
  disabled,
}: AIActionsMenuProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSummary = async () => {
    if (!noteContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'No content',
        description: 'Add some notes before generating a summary',
      });
      return;
    }

    setIsGenerating(true);
    setActiveAction('summary');

    try {
      const { data, error } = await supabase.functions.invoke('generate-note-summary', {
        body: { content: noteContent, meetingTitle, attendees },
      });

      if (error) throw error;

      if (data.requiresSetup) {
        toast({
          title: 'AI Setup Required',
          description: 'AI summary generation is not configured for this project.',
        });
        return;
      }

      onSummaryGenerated(data.summary);
      
      if (data.actionItems?.length > 0) {
        onActionItemsExtracted(data.actionItems);
      }

      toast({
        title: 'Summary generated',
        description: 'AI has analyzed your notes',
      });
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        variant: 'destructive',
        title: 'Generation failed',
        description: error.message || 'Could not generate summary',
      });
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  const extractActionItems = async () => {
    if (!noteContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'No content',
        description: 'Add some notes before extracting action items',
      });
      return;
    }

    setIsGenerating(true);
    setActiveAction('actions');

    try {
      const { data, error } = await supabase.functions.invoke('generate-note-summary', {
        body: { content: noteContent, meetingTitle, attendees },
      });

      if (error) throw error;

      if (data.actionItems?.length > 0) {
        onActionItemsExtracted(data.actionItems);
        toast({
          title: 'Action items extracted',
          description: `Found ${data.actionItems.length} action items`,
        });
      } else {
        toast({
          title: 'No action items found',
          description: 'AI could not identify action items in your notes',
        });
      }
    } catch (error: any) {
      console.error('Error extracting action items:', error);
      toast({
        variant: 'destructive',
        title: 'Extraction failed',
        description: error.message || 'Could not extract action items',
      });
    } finally {
      setIsGenerating(false);
      setActiveAction(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Magic
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={generateSummary} disabled={isGenerating}>
          <FileText className="h-4 w-4 mr-2" />
          Generate Summary
          {activeAction === 'summary' && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={extractActionItems} disabled={isGenerating}>
          <ListTodo className="h-4 w-4 mr-2" />
          Extract Action Items
          {activeAction === 'actions' && <Loader2 className="h-4 w-4 ml-auto animate-spin" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <Quote className="h-4 w-4 mr-2" />
          Extract Key Quotes
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Send className="h-4 w-4 mr-2" />
          Send to Attendees
          <span className="ml-auto text-xs text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
