import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mic } from "lucide-react";

export default function Capture() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");

  const handleStepOne = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Create connection
      const { data: connectionData, error: connectionError } = await supabase
        .from("connections")
        .insert({
          user_id: user.id,
          connection_name: name,
          connection_title: title,
          connection_email: email,
          connection_phone: phone,
          connection_company: company,
          notes: notes,
        })
        .select()
        .single();

      if (connectionError) throw connectionError;

      toast({
        title: "Connection saved!",
        description: "Your new connection has been added to your network.",
      });

      navigate("/network");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Capture Meeting Info</h1>
          <p className="text-muted-foreground">
            {step === 1 ? "Enter basic details" : "Add additional information"}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleStepOne} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-secondary border-border text-foreground"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-foreground">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-secondary border-border text-foreground"
                placeholder="Product Manager"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border text-foreground"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-secondary border-border text-foreground"
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg"
            >
              Next
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company" className="text-foreground">Company</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="bg-secondary border-border text-foreground"
                placeholder="Acme Inc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-foreground">Meeting Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-border text-foreground min-h-[150px]"
                placeholder="Key discussion points, follow-up items..."
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
            >
              <Mic className="h-4 w-4 mr-2" />
              Record Voice Note
            </Button>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 border-border text-foreground hover:bg-secondary"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save Connection"
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
