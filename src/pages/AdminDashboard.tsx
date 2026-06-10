import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Users, CreditCard, Trophy, TrendingUp, Search, Shield, Image, Check, X,
  Megaphone, Plus, Hash, Settings, UserCog, LogOut, BarChart3, Eye, Ban, Mail,
  DollarSign, Activity, Globe, Bell, FileText, Lock, Crown, Pencil, Headphones, Wallet, Coins, Package, Inbox
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AdminBroadcastChannel } from "@/components/AdminBroadcastChannel";
import { AdminPropManager } from "@/components/AdminPropManager";
import { AdminPackageManager } from "@/components/AdminPackageManager";
import { AdminAccountRequests } from "@/components/AdminAccountRequests";
import { GatePassSettings } from "@/components/admin/GatePassSettings";
import { AdminCredentialsPanel } from "@/components/admin/AdminCredentialsPanel";
import { AdminApprovalsPanel } from "@/components/admin/AdminApprovalsPanel";
import { WebhookEventsPanel } from "@/components/admin/WebhookEventsPanel";
import { AdminSupportTickets } from "@/components/AdminSupportTickets";
import { AdminTopupReview } from "@/components/admin/AdminTopupReview";
import { AdminAnnouncements } from "@/components/admin/AdminAnnouncements";
import { AdminErrorBoundary } from "@/components/admin/AdminErrorBoundary";
import { AdminDiagnosticsPanel } from "@/components/admin/AdminDiagnosticsPanel";
import { AdminSettingsPanelShell } from "@/components/admin/AdminSettingsPanelShell";
import { CurrencyConverter } from "@/components/CurrencyConverter";
import logo from "@/assets/blackpal-logo.jpg";

type AdminRole = "super_admin" | "admin" | "editor" | "customer_support" | "finance";

interface StaffMember {
  user_id: string;
  role: AdminRole;
  display_name?: string;
  email?: string;
}

function AdminDashboardInner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
  const [adminUserId, setAdminUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentProofs, setPaymentProofs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0, totalPayments: 0, totalAchievements: 0, totalRevenue: 0,
    activeUsers: 0, pendingPayments: 0, paidUsers: 0, unpaidUsers: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Staff management
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<AdminRole>("editor");

  // Group management
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");

  // Settings
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      setLoading(true);
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const user = userData.user;
      if (!user) { navigate("/admin-login", { replace: true }); return; }

      setAdminUserId(user.id);

      const { data: role, error: roleError } = await (supabase as any).rpc("get_my_admin_role");
      if (roleError) throw roleError;

      if (!role || !["super_admin", "admin", "editor", "customer_support", "finance"].includes(role)) {
        await supabase.auth.signOut();
        toast.error("Access denied. Please use an approved admin account.");
        navigate("/admin-login", { replace: true });
        return;
      }

      setAdminRole(role as AdminRole);
      setLoading(false);
      void loadAllData().catch((error: any) => {
        toast.error(error?.message || "Some admin data failed to load.");
      });
    } catch (error: any) {
      toast.error(error?.message || "Admin panel failed to load.");
      navigate("/admin-login", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    const [profilesRes, paymentsRes, achievementsRes, proofsRes, staffRes, settingsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("user_achievements").select("*", { count: "exact", head: true }),
      supabase.from("payment_proofs").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("app_settings").select("*"),
    ]);

    const profilesList = profilesRes.data || [];
    const paymentsList = paymentsRes.data || [];

    setUsers(profilesList);
    setPayments(paymentsList);
    setPaymentProofs((proofsRes.data as any[]) || []);

    // Build staff list
    const adminStaff = (staffRes.data || []).filter((r: any) =>
      ["super_admin", "admin", "editor", "customer_support", "finance"].includes(r.role)
    );
    const staffWithProfiles = adminStaff.map((s: any) => {
      const profile = profilesList.find(p => p.id === s.user_id);
      return { ...s, display_name: profile?.display_name, email: profile?.display_name };
    });
    setStaffMembers(staffWithProfiles);

    // Settings
    const settingsMap: Record<string, any> = {};
    (settingsRes.data || []).forEach((s: any) => { settingsMap[s.setting_key] = s.setting_value; });
    setAppSettings(settingsMap);

    const totalRevenue = paymentsList
      .filter((p: any) => p.payment_status === "completed")
      .reduce((sum: number, p: any) => sum + (Number(p.amount_usd) || 0), 0);

    const paidUsers = profilesList.filter((u: any) => u.payment_completed).length;

    setStats({
      totalUsers: profilesList.length,
      totalPayments: paymentsList.length,
      totalAchievements: achievementsRes.count || 0,
      totalRevenue,
      activeUsers: profilesList.filter((u: any) => u.payment_completed).length,
      pendingPayments: paymentsList.filter((p: any) => p.payment_status === "pending").length,
      paidUsers,
      unpaidUsers: profilesList.length - paidUsers,
    });
  };

  const handleApprovePayment = async (userId: string) => {
    await supabase.from("profiles").update({ payment_completed: true }).eq("id", userId);
    await supabase.from("payments").update({ payment_status: "completed" as any, completed_at: new Date().toISOString() } as any).eq("user_id", userId).eq("payment_status", "pending" as any);
    toast.success("Payment approved!");
    loadAllData();
  };

  const handleRejectPayment = async (userId: string) => {
    await supabase.from("payments").update({ payment_status: "failed" as any } as any).eq("user_id", userId).eq("payment_status", "pending" as any);
    toast.error("Payment rejected.");
    loadAllData();
  };

  const handleReviewProof = async (proofId: string, status: "approved" | "rejected") => {
    await supabase.from("payment_proofs").update({ status, reviewed_by: adminUserId, reviewed_at: new Date().toISOString() } as any).eq("id", proofId);
    if (status === "approved") {
      const proof = paymentProofs.find(p => p.id === proofId);
      if (proof) await handleApprovePayment(proof.user_id);
    }
    setSelectedProof(null);
    toast.success(`Proof ${status}!`);
    loadAllData();
  };

  const handleBanUser = async (userId: string) => {
    await supabase.from("profiles").update({ payment_completed: false } as any).eq("id", userId);
    toast.success("User access revoked.");
    loadAllData();
  };

  const handleAddStaff = async () => {
    if (!newStaffEmail.trim()) return;
    // Find user by display name or search
    const { data: foundUsers } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${newStaffEmail}%`)
      .limit(1);

    if (!foundUsers || foundUsers.length === 0) {
      toast.error("User not found.");
      return;
    }

    const { error } = await supabase.from("user_roles").insert({
      user_id: foundUsers[0].id,
      role: newStaffRole,
    });

    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`${foundUsers[0].display_name} added as ${newStaffRole}!`);
      setShowAddStaff(false);
      setNewStaffEmail("");
      loadAllData();
    }
  };

  const handleRemoveStaff = async (userId: string, role: string) => {
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);
    toast.success("Staff member removed.");
    loadAllData();
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const { error } = await supabase.from("group_chats").insert({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || null,
      created_by: adminUserId,
      is_public: true,
    } as any);
    if (error) toast.error("Failed: " + error.message);
    else {
      toast.success("Group created!");
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin-login");
  };

  const filteredUsers = users.filter((u) =>
    (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.country || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingProofs = paymentProofs.filter(p => p.status === "pending");

  const isSuperAdmin = adminRole === "super_admin";
  const canManageUsers = isSuperAdmin || adminRole === "admin";
  const canManageFinance = isSuperAdmin || adminRole === "finance" || adminRole === "admin";
  const canManageContent = isSuperAdmin || adminRole === "editor" || adminRole === "admin";
  const canManageSupport = isSuperAdmin || adminRole === "customer_support" || adminRole === "admin";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "super_admin": return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin": return <Shield className="w-4 h-4 text-destructive" />;
      case "editor": return <Pencil className="w-4 h-4 text-blue-500" />;
      case "customer_support": return <Headphones className="w-4 h-4 text-green-500" />;
      case "finance": return <Wallet className="w-4 h-4 text-purple-500" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "super_admin": return "default" as const;
      case "admin": return "destructive" as const;
      default: return "secondary" as const;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-destructive mx-auto" />
          <p className="text-muted-foreground text-sm">Initializing Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (!adminRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-border bg-card/90">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-5 h-5 text-destructive" /> Admin access not ready
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Your admin session could not be confirmed yet. Please sign in again.</p>
            <Button onClick={() => navigate("/admin-login", { replace: true })} className="w-full">
              Return to admin login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Admin" className="w-10 h-10 rounded-full border border-destructive/30" />
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                BlackPal Admin
              </h1>
              <div className="flex items-center gap-1">
                {getRoleIcon(adminRole)}
                <span className="text-xs text-muted-foreground capitalize">{adminRole.replace("_", " ")}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getRoleBadgeVariant(adminRole)} className="hidden sm:flex items-center gap-1">
              {getRoleIcon(adminRole)}
              {adminRole.replace("_", " ")}
            </Badge>
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <Eye className="w-4 h-4 mr-1" /> View App
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Role / loading gate status — always visible at top of /admin */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-3">
        <div className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 ${
          adminRole
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
            : loading
              ? "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"
              : "border-destructive/30 bg-destructive/5 text-destructive"
        }`}>
          <div className="flex items-center gap-2">
            {adminRole ? <Check className="w-3.5 h-3.5" /> : loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
            <span className="font-semibold">
              {adminRole ? `Approved · ${adminRole.replace("_", " ")}` : loading ? "Verifying admin session…" : "Access denied"}
            </span>
          </div>
          <span className="text-[10px] opacity-70 font-mono truncate max-w-[55%]" title={adminUserId}>
            uid: {adminUserId ? adminUserId.slice(0, 8) + "…" : "—"} · users:{users.length} · payments:{payments.length}
          </span>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-500" },
            { label: "Paid Users", value: stats.paidUsers, icon: Check, color: "text-green-500" },
            { label: "Unpaid", value: stats.unpaidUsers, icon: X, color: "text-destructive" },
            { label: "Pending Pay", value: stats.pendingPayments, icon: Activity, color: "text-yellow-500" },
            { label: "Total Payments", value: stats.totalPayments, icon: CreditCard, color: "text-primary" },
            { label: "Revenue", value: `${((stats.totalRevenue * 1000) / 100).toLocaleString()} BTAX`, icon: DollarSign, color: "text-green-500", subtext: `from ₦${(stats.totalRevenue * 1000).toLocaleString()} activations` },
            { label: "Achievements", value: stats.totalAchievements, icon: Trophy, color: "text-yellow-500" },
            { label: "Proofs Pending", value: pendingProofs.length, icon: FileText, color: "text-orange-500" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border bg-card/80">
              <CardContent className="p-3">
                <stat.icon className={`w-5 h-5 ${stat.color} mb-1`} />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                {(stat as any).subtext && (
                  <p className="text-[9px] text-muted-foreground/80">{(stat as any).subtext}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/80 mb-4 px-1">
          Stats and payment rows lead with <span className="font-semibold text-foreground">BTAX</span> — the platform virtual currency.
          The ₦ amount on each row is the source receipt for the ₦1,000 activation fee paid by the user.
        </p>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap mb-4 h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1"><BarChart3 className="w-3 h-3" /> Overview</TabsTrigger>
            {canManageUsers && <TabsTrigger value="users" className="gap-1"><Users className="w-3 h-3" /> Users</TabsTrigger>}
            {canManageFinance && (
              <>
                <TabsTrigger value="payments" className="gap-1"><CreditCard className="w-3 h-3" /> Payments</TabsTrigger>
                <TabsTrigger value="proofs" className="gap-1 relative">
                  <Image className="w-3 h-3" /> Proofs
                  {pendingProofs.length > 0 && (
                    <span className="ml-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center">
                      {pendingProofs.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="topups" className="gap-1"><Coins className="w-3 h-3" /> Top-ups</TabsTrigger>
              </>
            )}
            {canManageContent && <TabsTrigger value="broadcast" className="gap-1"><Megaphone className="w-3 h-3" /> Broadcast</TabsTrigger>}
            {canManageContent && <TabsTrigger value="announcements" className="gap-1"><Bell className="w-3 h-3" /> Pop-ups</TabsTrigger>}
            {canManageContent && <TabsTrigger value="groups" className="gap-1"><Hash className="w-3 h-3" /> Groups</TabsTrigger>}
            {canManageSupport && <TabsTrigger value="support" className="gap-1"><Headphones className="w-3 h-3" /> Support</TabsTrigger>}
            {canManageUsers && <TabsTrigger value="props" className="gap-1"><Trophy className="w-3 h-3" /> Prop Firms</TabsTrigger>}
            {canManageUsers && <TabsTrigger value="packages" className="gap-1"><Package className="w-3 h-3" /> Packages</TabsTrigger>}
            {canManageUsers && <TabsTrigger value="account-requests" className="gap-1"><Inbox className="w-3 h-3" /> Requests</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="staff" className="gap-1"><UserCog className="w-3 h-3" /> Staff</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="settings" className="gap-1"><Settings className="w-3 h-3" /> Settings</TabsTrigger>}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recent Users */}
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Recent Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {users.slice(0, 10).map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.display_name || "—"}</p>
                        <p className="text-[10px] text-muted-foreground">{u.country || "Unknown"}</p>
                      </div>
                      <Badge variant={u.payment_completed ? "default" : "secondary"} className="text-[10px]">
                        {u.payment_completed ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Recent Payments</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {payments.slice(0, 10).map(p => {
                    const user = users.find(u => u.id === p.user_id);
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div>
                          <p className="text-sm font-medium text-foreground">{user?.display_name || "Unknown"}</p>
                          <p className="text-[10px] text-muted-foreground">{p.payment_method}</p>
                        </div>
                        <Badge variant={p.payment_status === "completed" ? "default" : p.payment_status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                          {p.payment_status}
                        </Badge>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Pending Proofs */}
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Pending Proofs
                    {pendingProofs.length > 0 && <Badge variant="destructive" className="text-[10px]">{pendingProofs.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                  {pendingProofs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No pending proofs</p>
                  ) : (
                    pendingProofs.slice(0, 10).map(proof => {
                      const user = users.find(u => u.id === proof.user_id);
                      return (
                        <div key={proof.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/10" onClick={() => setSelectedProof(proof)}>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user?.display_name || "Unknown"}</p>
                            <p className="text-[10px] text-muted-foreground">{format(new Date(proof.created_at), "MMM d, h:mm a")}</p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Review</Button>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border bg-card/80 md:col-span-2 lg:col-span-3">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("users")}><Users className="w-4 h-4 mr-1" /> Manage Users</Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("proofs")}><FileText className="w-4 h-4 mr-1" /> Review Proofs ({pendingProofs.length})</Button>
                  <Button size="sm" variant="outline" onClick={() => setActiveTab("broadcast")}><Megaphone className="w-4 h-4 mr-1" /> Send Broadcast</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreateGroup(true)}><Plus className="w-4 h-4 mr-1" /> Create Group</Button>
                  {isSuperAdmin && <Button size="sm" variant="outline" onClick={() => setActiveTab("staff")}><UserCog className="w-4 h-4 mr-1" /> Manage Staff</Button>}
                  <Button size="sm" variant="outline" onClick={() => navigate("/community")}><Globe className="w-4 h-4 mr-1" /> Community</Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> User Management ({filteredUsers.length})</CardTitle>
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name, country, or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
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
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{user.display_name || "—"}</p>
                            <p className="text-[10px] text-muted-foreground">{user.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>{user.country || "—"}</TableCell>
                        <TableCell>{user.xp_points || 0}</TableCell>
                        <TableCell>{user.rank_level || 1}</TableCell>
                        <TableCell>
                          <Badge variant={user.payment_completed ? "default" : "secondary"} className="text-xs">
                            {user.payment_completed ? "✅ Paid" : "⏳ Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.created_at ? format(new Date(user.created_at), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {!user.payment_completed && (
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleApprovePayment(user.id)}>
                                <Check className="w-3 h-3 mr-1" /> Approve
                              </Button>
                            )}
                            {user.payment_completed && canManageUsers && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleBanUser(user.id)}>
                                <Ban className="w-3 h-3 mr-1" /> Revoke
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedUser(user)}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </div>
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
                <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment History</CardTitle>
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
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => {
                      const user = users.find(u => u.id === p.user_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">{user?.display_name || p.user_id?.slice(0, 8)}</TableCell>
                          <TableCell className="capitalize text-sm">{p.payment_method}</TableCell>
                          <TableCell>
                            {(((Number(p.amount_usd) || 0) * 1000) / 100).toLocaleString()} BTAX
                            <span className="block text-[9px] text-muted-foreground">paid ₦{((Number(p.amount_usd) || 0) * 1000).toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.payment_status === "completed" ? "default" : p.payment_status === "failed" ? "destructive" : "secondary"}>
                              {p.payment_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell>
                            {p.payment_status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-7 text-xs" onClick={() => handleApprovePayment(p.user_id)}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRejectPayment(p.user_id)}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Proofs Tab */}
          <TabsContent value="proofs">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" /> Payment Proofs
                  {pendingProofs.length > 0 && <Badge variant="destructive">{pendingProofs.length} pending</Badge>}
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
                            proof.status === "pending" ? "border-yellow-500/30 bg-yellow-500/5" :
                            proof.status === "approved" ? "border-green-500/30 bg-green-500/5" :
                            "border-red-500/30 bg-red-500/5"
                          }`}
                          onClick={() => setSelectedProof(proof)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-foreground">{user?.display_name || "Unknown"}</p>
                            <Badge variant={proof.status === "pending" ? "secondary" : proof.status === "approved" ? "default" : "destructive"} className="text-xs">
                              {proof.status}
                            </Badge>
                          </div>
                          <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                            {proof.image_url ? (
                              <img src={proof.image_url} alt="Proof" className="w-full h-full object-cover" />
                            ) : (
                              <Image className="w-8 h-8 text-muted-foreground" />
                            )}
                          </div>
                          {proof.notes && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{proof.notes}</p>}
                          <p className="text-xs text-muted-foreground mt-1">{format(new Date(proof.created_at), "MMM d, h:mm a")}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top-up Requests Tab */}
          <TabsContent value="topups">
            <AdminTopupReview />
          </TabsContent>

          {/* Broadcast Tab */}
          <TabsContent value="broadcast">
            <AdminBroadcastChannel userId={adminUserId} isAdmin={true} />
          </TabsContent>

          {/* Announcement Pop-ups */}
          <TabsContent value="announcements">
            <AdminAnnouncements />
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Group Chat Management</CardTitle>
                  <Button size="sm" onClick={() => setShowCreateGroup(true)}><Plus className="w-4 h-4 mr-1" /> Create Group</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Create and manage group chats. Public groups appear in the Community page.</p>
                <Button variant="outline" onClick={() => navigate("/community")}>Open Community Page →</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab - Ticket Management */}
          <TabsContent value="support">
            <AdminSupportTickets adminId={adminUserId} />
          </TabsContent>

          {/* Staff Management Tab */}
          {isSuperAdmin && (
            <TabsContent value="staff">
              <Card className="border-border bg-card/80">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2"><UserCog className="w-5 h-5" /> Staff Management</CardTitle>
                    <Button size="sm" onClick={() => setShowAddStaff(true)}><Plus className="w-4 h-4 mr-1" /> Add Staff</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Role Hierarchy</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { role: "Super Admin", desc: "Full control over everything", icon: Crown, color: "border-yellow-500/30 bg-yellow-500/5" },
                        { role: "Admin", desc: "Manage users, payments, content", icon: Shield, color: "border-destructive/30 bg-destructive/5" },
                        { role: "Editor", desc: "Manage content & broadcasts", icon: Pencil, color: "border-blue-500/30 bg-blue-500/5" },
                        { role: "Customer Support", desc: "Handle user issues & proofs", icon: Headphones, color: "border-green-500/30 bg-green-500/5" },
                        { role: "Finance", desc: "Manage payments & revenue", icon: Wallet, color: "border-purple-500/30 bg-purple-500/5" },
                      ].map(r => (
                        <div key={r.role} className={`p-3 rounded-xl border ${r.color}`}>
                          <r.icon className="w-6 h-6 mb-2" />
                          <p className="text-sm font-semibold text-foreground">{r.role}</p>
                          <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold text-foreground mb-3">Current Staff ({staffMembers.length})</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staffMembers.map((staff, i) => (
                        <TableRow key={`${staff.user_id}-${staff.role}-${i}`}>
                          <TableCell>
                            <p className="text-sm font-medium text-foreground">{staff.display_name || staff.user_id.slice(0, 8)}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(staff.role)} className="flex items-center gap-1 w-fit">
                              {getRoleIcon(staff.role)}
                              {staff.role.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {staff.role !== "super_admin" && (
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleRemoveStaff(staff.user_id, staff.role)}>
                                <X className="w-3 h-3 mr-1" /> Remove
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Settings Tab */}
          {isSuperAdmin && (
            <TabsContent value="settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AdminSettingsPanelShell title="Pending Approvals" icon={Check}>
                  <AdminApprovalsPanel />
                </AdminSettingsPanelShell>
                <AdminSettingsPanelShell title="Gate Pass Settings" icon={Lock}>
                  <GatePassSettings />
                </AdminSettingsPanelShell>
                <AdminSettingsPanelShell title="Admin Credentials" icon={UserCog}>
                  <AdminCredentialsPanel />
                </AdminSettingsPanelShell>
                {/* WebhookEventsPanel intentionally left without shell per spec */}
                <WebhookEventsPanel />
                <AdminSettingsPanelShell title="Diagnostics" icon={Activity}>
                  <AdminDiagnosticsPanel
                    adminUserId={adminUserId}
                    adminRole={adminRole}
                    usersLoaded={users.length}
                    paymentsLoaded={payments.length}
                  />
                </AdminSettingsPanelShell>
                <AdminSettingsPanelShell title="App Configuration" icon={Settings} dataCount={3}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Payment Required</p>
                          <p className="text-[10px] text-muted-foreground">₦1,000 activation fee</p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Email Verification</p>
                          <p className="text-[10px] text-muted-foreground">Required before sign-in</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Payment Proofs</p>
                          <p className="text-[10px] text-muted-foreground">Manual review required</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                    </div>
                </AdminSettingsPanelShell>


                <Card className="border-border bg-card/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm"><Lock className="w-4 h-4" /> Security</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Admin PIN</p>
                          <p className="text-[10px] text-muted-foreground">4-digit access code</p>
                        </div>
                        <Badge variant="secondary">Set</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">RLS Policies</p>
                          <p className="text-[10px] text-muted-foreground">Row-level security active</p>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                        <div>
                          <p className="text-sm font-medium text-foreground">Login Activity</p>
                          <p className="text-[10px] text-muted-foreground">All logins tracked</p>
                        </div>
                        <Badge variant="default">Enabled</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/80">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Wallet className="w-4 h-4" /> Naira ↔ BTAX Converter
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CurrencyConverter compact />
                    <p className="text-[10px] text-muted-foreground mt-2">
                      All in-app pricing now displays in BTAX. Naira remains the funding currency for the ₦1,000 activation fee.
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-card/80 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4" /> Payment Accounts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { bank: "OPay", account: "8135108929", name: "BlackPal" },
                        { bank: "PalmPay", account: "8135108929", name: "BlackPal" },
                        { bank: "Access Bank", account: "1491995592", name: "BlackPal" },
                        { bank: "Wema Bank", account: "7650337621", name: "BlackPal" },
                        { bank: "9PSB", account: "5240061723", name: "BlackPal" },
                        { bank: "Providus Bank", account: "9977732785", name: "BlackPal" },
                      ].map(acc => (
                        <div key={acc.bank} className="p-3 rounded-lg bg-muted/30 border border-border">
                          <p className="text-sm font-semibold text-foreground">{acc.bank}</p>
                          <p className="text-xs text-primary font-mono">{acc.account}</p>
                          <p className="text-[10px] text-muted-foreground">{acc.name}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {canManageUsers && <AdminPropManager adminUserId={adminUserId} users={users} />}
          {canManageUsers && <AdminPackageManager />}
          {canManageUsers && <AdminAccountRequests />}
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
                    From: {users.find(u => u.id === selectedProof.user_id)?.display_name || "Unknown"}
                  </p>
                  <Badge variant="secondary">{selectedProof.status}</Badge>
                </div>
                <div className="rounded-xl border border-border overflow-hidden bg-muted min-h-[200px]">
                  {selectedProof.image_url ? (
                    <img src={selectedProof.image_url} alt="Payment proof" className="w-full object-contain max-h-[400px]" />
                  ) : (
                    <div className="flex items-center justify-center h-[200px]">
                      <p className="text-xs text-muted-foreground">No image</p>
                    </div>
                  )}
                </div>
                {selectedProof.notes && (
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-lg">{selectedProof.notes}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Submitted: {format(new Date(selectedProof.created_at), "MMM d, yyyy h:mm a")}
                </p>
                {selectedProof.status === "pending" && (
                  <div className="flex gap-3">
                    <Button className="flex-1" onClick={() => handleReviewProof(selectedProof.id, "approved")}>
                      <Check className="w-4 h-4 mr-2" /> Approve & Activate
                    </Button>
                    <Button variant="destructive" className="flex-1" onClick={() => handleReviewProof(selectedProof.id, "rejected")}>
                      <X className="w-4 h-4 mr-2" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                      {(selectedUser.display_name || "?")[0]}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">{selectedUser.display_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{selectedUser.country || "No country"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "XP", value: selectedUser.xp_points || 0 },
                    { label: "Level", value: selectedUser.rank_level || 1 },
                    { label: "BTAX", value: (selectedUser.virtual_currency || 0).toLocaleString() },
                    { label: "Streak", value: selectedUser.achievement_streak || 0 },
                  ].map(item => (
                    <div key={item.label} className="p-2 rounded-lg bg-muted/30 border border-border text-center">
                      <p className="text-lg font-bold text-foreground">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-sm text-muted-foreground">Payment Status</span>
                  <Badge variant={selectedUser.payment_completed ? "default" : "secondary"}>
                    {selectedUser.payment_completed ? "Paid" : "Pending"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                  <span className="text-sm text-muted-foreground">Joined</span>
                  <span className="text-sm text-foreground">{selectedUser.created_at ? format(new Date(selectedUser.created_at), "MMM d, yyyy") : "—"}</span>
                </div>
                <div className="flex gap-2">
                  {!selectedUser.payment_completed ? (
                    <Button className="flex-1" size="sm" onClick={() => { handleApprovePayment(selectedUser.id); setSelectedUser(null); }}>
                      <Check className="w-4 h-4 mr-1" /> Activate
                    </Button>
                  ) : (
                    <Button variant="destructive" className="flex-1" size="sm" onClick={() => { handleBanUser(selectedUser.id); setSelectedUser(null); }}>
                      <Ban className="w-4 h-4 mr-1" /> Revoke Access
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Staff Dialog */}
        <Dialog open={showAddStaff} onOpenChange={setShowAddStaff}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">User Display Name</label>
                <Input placeholder="Search by display name..." value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Role</label>
                <Select value={newStaffRole} onValueChange={(v) => setNewStaffRole(v as AdminRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="customer_support">Customer Support</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleAddStaff} disabled={!newStaffEmail.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Add Staff
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Group Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Group name" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} rows={3} />
              <Button className="w-full" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
                <Plus className="w-4 h-4 mr-2" /> Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Prop Firm tab content is mounted inside <Tabs> above */}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardInner />
    </AdminErrorBoundary>
  );
}
