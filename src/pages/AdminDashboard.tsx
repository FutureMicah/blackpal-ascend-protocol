import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { AdminBroadcastChannel } from "@/components/AdminBroadcastChannel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, CreditCard, Trophy, TrendingUp, Search, Shield, Image, Check, X, Megaphone, Plus, Hash } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPayments: 0, totalAchievements: 0, totalRevenue: 0 });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

      setAdminUserId(user.id);

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      await loadData();
    } catch (error) {
      console.error("Admin check failed:", error);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const [profilesRes, paymentsRes, achievementsRes, proofsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_achievements").select("*", { count: "exact", head: true }),
      supabase.from("payment_proofs").select("*").order("created_at", { ascending: false }).limit(100),
    ]);

    const profilesList = profilesRes.data || [];
    const paymentsList = paymentsRes.data || [];

    setUsers(profilesList);
    setPayments(paymentsList);
    setPaymentProofs((proofsRes.data as any[]) || []);

    const totalRevenue = paymentsList
      .filter((p: any) => p.payment_status === "completed")
      .reduce((sum: number, p: any) => sum + (Number(p.amount_usd) || 0), 0);

    setStats({
      totalUsers: profilesList.length,
      totalPayments: paymentsList.length,
      totalAchievements: achievementsRes.count || 0,
      totalRevenue,
    });
  };

  const handleApprovePayment = async (userId: string) => {
    // Mark profile as paid
    await supabase.from("profiles").update({ payment_completed: true }).eq("id", userId);
    // Mark pending payment as completed
    await supabase.from("payments").update({ payment_status: "completed" as any, completed_at: new Date().toISOString() } as any).eq("user_id", userId).eq("payment_status", "pending" as any);
    toast.success("Payment approved and user activated!");
    loadData();
  };

  const handleRejectPayment = async (userId: string) => {
    await supabase.from("payments").update({ payment_status: "failed" as any } as any).eq("user_id", userId).eq("payment_status", "pending" as any);
    toast.error("Payment rejected.");
    loadData();
  };

  const handleReviewProof = async (proofId: string, status: 'approved' | 'rejected') => {
    await supabase.from("payment_proofs").update({ status, reviewed_by: adminUserId, reviewed_at: new Date().toISOString() } as any).eq("id", proofId);
    
    if (status === 'approved') {
      const proof = paymentProofs.find(p => p.id === proofId);
      if (proof) {
        await handleApprovePayment(proof.user_id);
      }
    }
    
    setSelectedProof(null);
    toast.success(`Proof ${status}!`);
    loadData();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    const { error } = await supabase.from("group_chats").insert({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
      created_by: adminUserId,
      is_public: true,
    } as any);

    if (error) {
      toast.error("Failed to create group: " + error.message);
    } else {
      toast.success("Group created!");
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
    }
  };

  const filteredUsers = users.filter((u) =>
    (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.country || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingProofs = paymentProofs.filter(p => p.status === 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="border-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalPayments}</p>
                  <p className="text-xs text-muted-foreground">Payments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalAchievements}</p>
                  <p className="text-xs text-muted-foreground">Achievements</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">₦{(stats.totalRevenue * 1000).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="proofs" className="relative">
              Proofs
              {pendingProofs.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {pendingProofs.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle>User Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.display_name || "—"}</TableCell>
                        <TableCell>{user.country || "—"}</TableCell>
                        <TableCell>{user.xp_points || 0}</TableCell>
                        <TableCell>{user.rank_level || 1}</TableCell>
                        <TableCell>
                          <Badge variant={user.payment_completed ? "default" : "secondary"} className="text-xs">
                            {user.payment_completed ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : "—"}
                        </TableCell>
                        <TableCell>
                          {!user.payment_completed && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleApprovePayment(user.id)}>
                                <Check className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const user = users.find(u => u.id === p.user_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{user?.display_name || p.user_id?.slice(0, 8)}</TableCell>
                          <TableCell className="capitalize text-sm">{p.payment_method}</TableCell>
                          <TableCell>₦{((Number(p.amount_usd) || 0) * 1000).toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={p.payment_status === "completed" ? "default" : p.payment_status === "failed" ? "destructive" : "secondary"}>
                              {p.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), 'MMM d, h:mm a')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Proofs Tab */}
          <TabsContent value="proofs">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" /> Payment Proofs
                  {pendingProofs.length > 0 && (
                    <Badge variant="destructive">{pendingProofs.length} pending</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentProofs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No payment proofs submitted yet.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paymentProofs.map((proof) => {
                      const user = users.find(u => u.id === proof.user_id);
                      return (
                        <div
                          key={proof.id}
                          className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                            proof.status === 'pending' ? 'border-yellow-500/30 bg-yellow-500/5' :
                            proof.status === 'approved' ? 'border-green-500/30 bg-green-500/5' :
                            'border-red-500/30 bg-red-500/5'
                          }`}
                          onClick={() => setSelectedProof(proof)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground">{user?.display_name || 'Unknown'}</p>
                            <Badge variant={proof.status === 'pending' ? 'secondary' : proof.status === 'approved' ? 'default' : 'destructive'} className="text-xs">
                              {proof.status}
                            </Badge>
                          </div>
                          <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            <Image className="w-8 h-8 text-muted-foreground" />
                          </div>
                          {proof.notes && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{proof.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(proof.created_at), 'MMM d, h:mm a')}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <AdminBroadcastChannel userId={adminUserId} isAdmin={true} />
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="w-5 h-5" /> Group Chats
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Create Group
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Create and manage group chats. All public groups are visible to users in the Community page.
                </p>
                <Button variant="outline" onClick={() => navigate("/community")}>
                  Open Community Page →
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Proof Review Dialog */}
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Payment Proof</DialogTitle>
            </DialogHeader>
            {selectedProof && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    From: {users.find(u => u.id === selectedProof.user_id)?.display_name || 'Unknown'}
                  </p>
                  <Badge variant="secondary">{selectedProof.status}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center min-h-[200px]">
                  <p className="text-xs text-muted-foreground">Image: {selectedProof.image_url}</p>
                </div>
                {selectedProof.notes && (
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{selectedProof.notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedProof.created_at), 'MMM d, yyyy h:mm a')}
                </p>
                {selectedProof.status === 'pending' && (
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={() => handleReviewProof(selectedProof.id, 'approved')}>
                      <Check className="w-4 h-4 mr-2" /> Approve & Activate
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleReviewProof(selectedProof.id, 'rejected')}>
                      <X className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={(e) => setNewGroupDesc(e.target.value)}
                rows={3}
              />
              <Button className="w-full" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
