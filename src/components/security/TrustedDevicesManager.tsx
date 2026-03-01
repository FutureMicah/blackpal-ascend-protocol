/**
 * TrustedDevicesManager - View, rename, and revoke registered biometric devices.
 * 
 * Usage: <TrustedDevicesManager userId={user.id} />
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { Fingerprint, ScanFace, Trash2, Pencil, Check, X, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface TrustedDevicesManagerProps {
  userId: string;
}

interface WebAuthnCredential {
  id: string;
  credential_id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
  transports: string[] | null;
}

export const TrustedDevicesManager = ({ userId }: TrustedDevicesManagerProps) => {
  const [devices, setDevices] = useState<WebAuthnCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadDevices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("webauthn_credentials")
      .select("id, credential_id, device_name, created_at, last_used_at, transports")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, [userId]);

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase
      .from("webauthn_credentials")
      .update({ device_name: editName.trim() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Renamed", description: "Device renamed successfully." });
      setEditingId(null);
      loadDevices();
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase
      .from("webauthn_credentials")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Removed", description: "Device removed from trusted list." });
      loadDevices();
    }
    setDeletingId(null);
  };

  const getDeviceIcon = (transports: string[] | null) => {
    if (transports?.includes("internal")) return <ScanFace className="w-5 h-5 text-primary" />;
    return <Fingerprint className="w-5 h-5 text-primary" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Trusted Devices</h3>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No biometric devices registered yet.</p>
          <p className="text-xs mt-1">Register one from your dashboard to enable passwordless access.</p>
        </div>
      ) : (
        <AnimatePresence>
          {devices.map((device, index) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                {getDeviceIcon(device.transports)}
              </div>

              <div className="flex-1 min-w-0">
                {editingId === device.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleRename(device.id)}>
                      <Check className="w-4 h-4 text-green-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">
                      {device.device_name || "Unnamed Device"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Added {formatDistanceToNow(new Date(device.created_at), { addSuffix: true })}
                      {device.last_used_at && (
                        <> · Last used {formatDistanceToNow(new Date(device.last_used_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </>
                )}
              </div>

              {editingId !== device.id && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditingId(device.id);
                      setEditName(device.device_name || "");
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 hover:text-destructive"
                    disabled={deletingId === device.id}
                    onClick={() => handleDelete(device.id)}
                  >
                    {deletingId === device.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
};
