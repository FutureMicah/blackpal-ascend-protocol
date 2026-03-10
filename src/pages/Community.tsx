import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FloatingNav } from "@/components/FloatingNav";
import { AdminBroadcastChannel } from "@/components/AdminBroadcastChannel";
import { GroupChatRoom } from "@/components/GroupChatRoom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, Megaphone, Users, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function Community() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/"); return; }

    setUser(session.user);

    const [profileRes, roleRes, groupsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('user_roles').select('role').eq('user_id', session.user.id).eq('role', 'admin').maybeSingle(),
      supabase.from('group_chats').select('*').eq('is_public', true).order('created_at', { ascending: true }),
    ]);

    setProfile(profileRes.data);
    setIsAdmin(!!roleRes.data);
    
    const groupList = groupsRes.data || [];
    setGroups(groupList);
    
    // Auto-join public groups
    if (groupList.length > 0) {
      setSelectedGroup(groupList[0].id);
      
      // Ensure user is a member of public groups
      for (const g of groupList) {
        await supabase
          .from('group_chat_members')
          .upsert({
            group_id: g.id,
            user_id: session.user.id,
            role: 'member',
          } as any, { onConflict: 'group_id,user_id' });
      }
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-foreground">Community</h1>
          <p className="text-muted-foreground text-sm mt-1">Announcements, group chats, and more</p>
        </motion.div>

        <Tabs defaultValue="announcements">
          <TabsList className="mb-6">
            <TabsTrigger value="announcements" className="flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Announcements
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Group Chats
            </TabsTrigger>
          </TabsList>

          <TabsContent value="announcements">
            <AdminBroadcastChannel userId={user.id} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="groups">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Group list */}
              <div className="lg:col-span-1 space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Groups</h3>
                {groups.length === 0 && (
                  <p className="text-sm text-muted-foreground">No groups available yet.</p>
                )}
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroup(g.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedGroup === g.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card/50 hover:bg-card/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{g.description || 'Public group'}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat area */}
              <div className="lg:col-span-3">
                {selectedGroup ? (
                  <GroupChatRoom
                    groupId={selectedGroup}
                    groupName={groups.find(g => g.id === selectedGroup)?.name || 'Group'}
                    userId={user.id}
                    userDisplayName={profile?.display_name || 'User'}
                  />
                ) : (
                  <div className="h-[500px] rounded-2xl border border-border bg-card/50 flex items-center justify-center">
                    <p className="text-muted-foreground text-sm">Select a group to start chatting</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
