import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Trash2,
  Shield,
  Download,
  Loader2,
  BarChart3,
  Crown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/useTeam";
import { useAppCache } from "@/hooks/useAppCache";

export default function TeamAdmin() {
  const { isAuthenticated, initialized } = useAppCache();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { team, teamMembers, loading, isAdmin, createTeam, inviteMember, removeMember, updateMemberRole, refetch } = useTeam();

  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [handoffStats, setHandoffStats] = useState<{
    total: number;
    closed: number;
    topGivers: { name: string; count: number }[];
    topReceivers: { name: string; count: number }[];
  }>({ total: 0, closed: 0, topGivers: [], topReceivers: [] });

  useEffect(() => {
    if (initialized && !isAuthenticated) navigate("/auth", { replace: true });
  }, [initialized, isAuthenticated, navigate]);

  useEffect(() => {
    if (team) loadStats();
  }, [team]);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: handoffs } = await supabase
        .from("handoffs")
        .select("*");

      if (!handoffs) return;

      const total = handoffs.length;
      const closed = handoffs.filter((h) => h.status === "deal_closed").length;

      // Top givers/receivers
      const giverCounts: Record<string, number> = {};
      const receiverCounts: Record<string, number> = {};
      handoffs.forEach((h) => {
        giverCounts[h.from_user] = (giverCounts[h.from_user] || 0) + 1;
        receiverCounts[h.to_user] = (receiverCounts[h.to_user] || 0) + 1;
      });

      const userIds = [...new Set([...Object.keys(giverCounts), ...Object.keys(receiverCounts)])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p) => { nameMap[p.id] = p.full_name; });

      const topGivers = Object.entries(giverCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ name: nameMap[id] || "Unknown", count }));

      const topReceivers = Object.entries(receiverCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([id, count]) => ({ name: nameMap[id] || "Unknown", count }));

      setHandoffStats({ total, closed, topGivers, topReceivers });
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      await createTeam(teamName.trim());
      toast({ title: "Team created!" });
      setTeamName("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      await inviteMember(inviteEmail.trim());
      toast({ title: "Member added!" });
      setInviteEmail("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async () => {
    if (!deleteTarget) return;
    try {
      await removeMember(deleteTarget);
      toast({ title: "Member removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeleteTarget(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Name", "Role", "Joined"];
    const rows = teamMembers.map((m) => [
      m.profile?.full_name || "Unknown",
      m.role,
      new Date(m.joined_at).toLocaleDateString(),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${team?.name || "team"}_members.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team Admin</h1>
            <p className="text-muted-foreground text-sm">Manage your team</p>
          </div>
        </div>

        {/* No team yet */}
        {!team ? (
          <Card className="bg-card border-border p-6 space-y-4">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Create Your Team</h3>
              <p className="text-sm text-muted-foreground">Set up a team to start handing off contacts</p>
            </div>
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
              />
              <Button onClick={handleCreateTeam} disabled={creating || !teamName.trim()} className="bg-primary text-primary-foreground">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {/* Team Info */}
            <Card className="bg-card border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{team.name}</h3>
                    <p className="text-xs text-muted-foreground">{teamMembers.length + 1} members</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </div>
            </Card>

            {/* Invite */}
            {isAdmin && (
              <Card className="bg-card border-border p-4 space-y-3">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Invite Member
                </h3>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@email.com"
                  />
                  <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-primary text-primary-foreground">
                    {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Members */}
            <Card className="bg-card border-border p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">Members</h3>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No team members yet. Invite colleagues above.</p>
              ) : (
                <div className="space-y-2">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <p className="text-foreground font-medium text-sm">{m.profile?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{m.profile?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <Select
                            value={m.role}
                            onValueChange={(v) => updateMemberRole(m.id, v)}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {!isAdmin ? (
                          <Badge variant="outline" className="text-xs">
                            {m.role === "admin" ? <Crown className="h-3 w-3 mr-1" /> : null}
                            {m.role}
                          </Badge>
                        ) : (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Analytics */}
            <Card className="bg-card border-border p-4 space-y-3">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Handoff Analytics
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{handoffStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{handoffStats.closed}</p>
                  <p className="text-xs text-muted-foreground">Closed</p>
                </div>
                <div className="text-center p-3 bg-muted/20 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">
                    {handoffStats.total > 0 ? Math.round((handoffStats.closed / handoffStats.total) * 100) : 0}%
                  </p>
                  <p className="text-xs text-muted-foreground">Rate</p>
                </div>
              </div>

              {handoffStats.topGivers.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Top Givers</p>
                  {handoffStats.topGivers.map((g, i) => (
                    <div key={i} className="flex justify-between text-sm py-1">
                      <span className="text-foreground">{g.name}</span>
                      <span className="text-muted-foreground">{g.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Delete confirm */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member</AlertDialogTitle>
              <AlertDialogDescription>Remove this member from the team?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
