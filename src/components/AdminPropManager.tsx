import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trophy, Users, Search, Eye, Ban, Check, RefreshCw, BarChart3 } from "lucide-react";

interface AdminPropManagerProps {
  adminUserId?: string;
  users?: any[];
}

export function AdminPropManager({ adminUserId = "", users = [] }: AdminPropManagerProps) {
  const [tiers, setTiers] = useState<any[]>([]);
  const [propAccounts, setPropAccounts] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedTier, setSelectedTier] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [activeTab, setActiveTab] = useState("accounts");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [tiersRes, accountsRes] = await Promise.all([
      supabase.from("prop_tiers").select("*").order("tier_level"),
      supabase.from("user_prop_accounts").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setTiers(tiersRes.data || []);
    setPropAccounts(accountsRes.data || []);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "BP-";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const assignPropAccount = async () => {
    if (!selectedUserId || !selectedTier) { toast.error("Select user and tier"); return; }
    setLoading(true);

    const tier = tiers.find(t => t.id === selectedTier);
    if (!tier) return;

    const code = customCode.trim() || generateCode();

    const { error } = await supabase.from("user_prop_accounts").insert({
      user_id: selectedUserId,
      tier_id: selectedTier,
      account_balance: tier.account_size,
      starting_balance: tier.account_size,
      current_equity: tier.account_size,
      highest_balance: tier.account_size,
      access_code: code,
      status: "active",
      phase: "challenge",
      assigned_by: adminUserId,
    });

    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`Prop account assigned! Code: ${code}`);
      setShowAssign(false);
      setSelectedUserId("");
      setSelectedTier("");
      setCustomCode("");
      loadData();
    }
    setLoading(false);
  };

  const updateAccountStatus = async (accountId: string, status: string) => {
    await supabase.from("user_prop_accounts").update({ status }).eq("id", accountId);
    toast.success(`Account ${status}`);
    loadData();
  };

  const markAsPassed = async (account: any) => {
    const tier = tiers.find(t => t.id === account.tier_id);
    const pnlPercent = ((account.account_balance - account.starting_balance) / account.starting_balance) * 100;
    const winRate = account.total_trades > 0 ? (account.winning_trades / account.total_trades) * 100 : 0;

    await Promise.all([
      supabase.from("user_prop_accounts").update({
        status: "passed",
        phase: "funded",
        passed_at: new Date().toISOString(),
        profit_target_hit: true,
      }).eq("id", account.id),
      supabase.from("prop_pass_history").insert({
        user_id: account.user_id,
        tier_id: account.tier_id,
        prop_account_id: account.id,
        final_balance: account.account_balance,
        final_pnl_percent: pnlPercent,
        total_trades: account.total_trades,
        trading_days: account.trading_days,
        win_rate: winRate,
      }),
    ]);

    toast.success("Account marked as PASSED! User can now unlock next tier.");
    loadData();
  };

  const filteredAccounts = propAccounts.filter(a => {
    const user = users.find(u => u.id === a.user_id);
    const name = user?.display_name || "";
    return name.toLowerCase().includes(searchFilter.toLowerCase()) || a.access_code.toLowerCase().includes(searchFilter.toLowerCase());
  });

  const filteredUsers = users.filter(u =>
    (u.display_name || "").toLowerCase().includes(searchUser.toLowerCase())
  ).slice(0, 10);

  return (
    <TabsContent value="props" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Prop Firm Management
        </h3>
        <Button size="sm" onClick={() => setShowAssign(true)}>
          <Plus className="w-4 h-4 mr-1" /> Assign Account
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Accounts", value: propAccounts.length },
          { label: "Active", value: propAccounts.filter(a => a.status === "active").length },
          { label: "Passed", value: propAccounts.filter(a => a.status === "passed").length },
          { label: "Failed", value: propAccounts.filter(a => a.status === "failed").length },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-3">
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or access code..."
          value={searchFilter}
          onChange={e => setSearchFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Accounts Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">User</TableHead>
                <TableHead className="text-xs">Tier</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs text-right">Balance</TableHead>
                <TableHead className="text-xs text-right">P&L</TableHead>
                <TableHead className="text-xs text-right">Trades</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAccounts.map(account => {
                const user = users.find(u => u.id === account.user_id);
                const tier = tiers.find(t => t.id === account.tier_id);
                const pnl = account.account_balance - account.starting_balance;
                return (
                  <TableRow key={account.id}>
                    <TableCell className="text-xs font-medium">{user?.display_name || "Unknown"}</TableCell>
                    <TableCell className="text-xs">{tier?.badge_icon} {tier?.tier_name}</TableCell>
                    <TableCell className="text-xs font-mono">{account.access_code}</TableCell>
                    <TableCell className="text-xs text-right font-mono">${account.account_balance.toFixed(2)}</TableCell>
                    <TableCell className={`text-xs text-right font-mono ${pnl >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right">{account.total_trades}</TableCell>
                    <TableCell>
                      <Badge variant={account.status === "active" ? "default" : account.status === "passed" ? "secondary" : "destructive"} className="text-[9px]">
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {account.status === "active" && (
                          <>
                            <Button variant="ghost" size="icon" className="w-6 h-6" title="Mark Passed" onClick={() => markAsPassed(account)}>
                              <Check className="w-3 h-3 text-green-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="w-6 h-6" title="Fail" onClick={() => updateAccountStatus(account.id, "failed")}>
                              <Ban className="w-3 h-3 text-destructive" />
                            </Button>
                          </>
                        )}
                        {account.status === "failed" && (
                          <Button variant="ghost" size="icon" className="w-6 h-6" title="Reactivate" onClick={() => updateAccountStatus(account.id, "active")}>
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAccounts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-8">
                    No prop accounts found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Prop Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* User search */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Search User</label>
              <Input placeholder="Type username..." value={searchUser} onChange={e => setSearchUser(e.target.value)} />
              {searchUser && (
                <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-md">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { setSelectedUserId(u.id); setSearchUser(u.display_name || u.id); }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/30 ${selectedUserId === u.id ? "bg-primary/10" : ""}`}
                    >
                      {u.display_name || "Unknown"} <span className="text-muted-foreground text-[10px]">{u.country || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tier selection */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Prop Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  {tiers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.badge_icon} {t.tier_name} — ${t.account_size.toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom code */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Access Code (leave blank to auto-generate)</label>
              <Input placeholder="e.g. BP-CUSTOM01" value={customCode} onChange={e => setCustomCode(e.target.value)} className="font-mono" />
            </div>

            <Button className="w-full" onClick={assignPropAccount} disabled={loading || !selectedUserId || !selectedTier}>
              <Plus className="w-4 h-4 mr-2" /> Assign Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
