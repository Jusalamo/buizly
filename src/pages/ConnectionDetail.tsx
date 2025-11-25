import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Calendar, ArrowLeft } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

export default function ConnectionDetail() {
  const { id } = useParams();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadConnection();
  }, [id]);

  const loadConnection = async () => {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setConnection(data);
    } catch (error) {
      console.error("Error loading connection:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!connection) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-muted-foreground">Connection not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/network")}
          className="text-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Network
        </Button>

        {/* Profile Header */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <span className="text-primary text-4xl font-bold">
              {connection.connection_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{connection.connection_name}</h1>
            {connection.connection_title && (
              <p className="text-lg text-primary mt-1">{connection.connection_title}</p>
            )}
            {connection.connection_company && (
              <p className="text-muted-foreground">{connection.connection_company}</p>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <Card className="bg-card border-border p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">Contact Information</h2>
          
          {connection.connection_email && (
            <div className="flex items-center gap-3 text-foreground">
              <Mail className="h-5 w-5 text-primary flex-shrink-0" />
              <a href={`mailto:${connection.connection_email}`} className="hover:text-primary transition-colors">
                {connection.connection_email}
              </a>
            </div>
          )}
          
          {connection.connection_phone && (
            <div className="flex items-center gap-3 text-foreground">
              <Phone className="h-5 w-5 text-primary flex-shrink-0" />
              <a href={`tel:${connection.connection_phone}`} className="hover:text-primary transition-colors">
                {connection.connection_phone}
              </a>
            </div>
          )}
          
          {connection.connection_company && (
            <div className="flex items-center gap-3 text-foreground">
              <Briefcase className="h-5 w-5 text-primary flex-shrink-0" />
              <span>{connection.connection_company}</span>
            </div>
          )}
        </Card>

        {/* Notes */}
        {connection.notes && (
          <Card className="bg-card border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Notes</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">{connection.notes}</p>
          </Card>
        )}

        {/* Action Button */}
        <Button
          onClick={() => navigate(`/schedule?connection=${connection.id}`)}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-6 text-lg"
        >
          <Calendar className="h-5 w-5 mr-2" />
          Schedule Follow-up Meeting
        </Button>
      </div>
    </Layout>
  );
}
