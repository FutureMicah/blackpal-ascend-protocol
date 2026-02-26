import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, CreditCard, Trophy, TrendingUp, Search, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalPayments: 0, totalAchievements: 0, totalRevenue: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/"); return; }

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
    const [profilesRes, paymentsRes, achievementsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("payments").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("user_achievements").select("*", { count: "exact", head: true }),
    ]);

    const profilesList = profilesRes.data || [];
    const paymentsList = paymentsRes.data || [];

    setUsers(profilesList);
    setPayments(paymentsList);

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

  const filteredUsers = users.filter((u) =>
    (u.display_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.country || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold gradient-text-cyber">Admin Dashboard</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalPayments}</p>
                  <p className="text-xs text-muted-foreground">Payments</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalAchievements}</p>
                  <p className="text-xs text-muted-foreground">Achievements Awarded</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Revenue (USD)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>XP</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id} className="cursor-pointer hover:bg-muted/30" onClick={() => navigate(`/profile/${user.id}`)}>
                        <TableCell className="font-medium">{user.display_name || "—"}</TableCell>
                        <TableCell>{user.country || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {user.payment_tier || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.xp_points || 0}</TableCell>
                        <TableCell>{user.rank_level || 1}</TableCell>
                        <TableCell>
                          <Badge variant={user.payment_completed ? "default" : "secondary"} className="text-xs">
                            {user.payment_completed ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-xs font-mono">{p.user_id?.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.payment_tier}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{p.payment_method}</TableCell>
                        <TableCell>${Number(p.amount_usd).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={p.payment_status === "completed" ? "default" : p.payment_status === "failed" ? "destructive" : "secondary"}
                          >
                            {p.payment_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
