import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail, Phone, Briefcase, Calendar, ArrowLeft, Instagram } from "lucide-react";
import { ConnectionDetailSkeleton } from "@/components/skeletons/PageSkeletons";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"] & {
  connection_avatar_url?: string;
  connection_instagram?: string;
  connection_linkedin?: string;
  connection_gallery_photos?: string[];
};

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
      setConnection(data as Connection);
    } catch (error) {
      console.error("Error loading connection:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <ConnectionDetailSkeleton />
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
          <OptimizedAvatar
            src={connection.connection_avatar_url}
            alt={connection.connection_name}
            fallback={connection.connection_name.charAt(0)}
            size="xl"
            className="mx-auto"
          />
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

        {/* Gallery Photos - Horizontal row */}
        {connection.connection_gallery_photos && connection.connection_gallery_photos.length > 0 && (
          <Card className="bg-card border-border p-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {connection.connection_gallery_photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`Gallery photo ${index + 1}`}
                  className="h-24 w-24 object-cover rounded-lg flex-shrink-0"
                />
              ))}
            </div>
          </Card>
        )}

        {/* Social Media Links */}
        {(connection.connection_linkedin || connection.connection_instagram) && (
          <div className="flex justify-center gap-3">
            {connection.connection_linkedin && (
              <Button
                variant="outline"
                size="icon"
                className="border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5] hover:text-white"
                onClick={() => window.open(connection.connection_linkedin, '_blank')}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </Button>
            )}
            {connection.connection_instagram && (
              <Button
                variant="outline"
                size="icon"
                className="border-[#E4405F] text-[#E4405F] hover:bg-[#E4405F] hover:text-white"
                onClick={() => window.open(connection.connection_instagram, '_blank')}
              >
                <Instagram className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

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
