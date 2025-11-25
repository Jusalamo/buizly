import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Connection = Database["public"]["Tables"]["connections"]["Row"];

export default function Network() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error("Error loading connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = connections.filter((connection) =>
    connection.connection_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.connection_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.connection_company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Network</h1>
          <p className="text-muted-foreground">Manage your professional connections</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground"
          />
        </div>

        {/* Connections List */}
        <div className="space-y-3">
          {filteredConnections.length === 0 ? (
            <Card className="bg-card border-border p-8 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "No connections found" : "No connections yet. Start by capturing a new meeting!"}
              </p>
            </Card>
          ) : (
            filteredConnections.map((connection) => (
              <Card
                key={connection.id}
                className="bg-card border-border p-4 cursor-pointer hover:bg-card/80 transition-all hover:border-primary/50"
                onClick={() => navigate(`/connection/${connection.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-lg font-bold">
                      {connection.connection_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{connection.connection_name}</p>
                    {connection.connection_title && (
                      <p className="text-sm text-primary">{connection.connection_title}</p>
                    )}
                    {connection.connection_company && (
                      <p className="text-sm text-muted-foreground">{connection.connection_company}</p>
                    )}
                  </div>
                  <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0"></div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
