import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OAuth2Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      if (!code) {
        throw new Error('No authorization code received');
      }

      const redirectUri = `${window.location.origin}/oauth2callback`;

      const { error: callbackError } = await supabase.functions.invoke('google-auth-callback', {
        body: { code, redirectUri }
      });

      if (callbackError) throw callbackError;

      setStatus('success');
      setMessage('Google Calendar connected successfully!');

      // Redirect to settings after 2 seconds
      setTimeout(() => {
        navigate('/settings');
      }, 2000);
    } catch (error: any) {
      console.error('OAuth callback error:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to connect Google Calendar');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="bg-card border-border p-8 max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">{message}</h1>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">{message}</h1>
            <p className="text-muted-foreground">Redirecting to settings...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Connection Failed</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button onClick={() => navigate('/settings')} className="w-full">
              Back to Settings
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
