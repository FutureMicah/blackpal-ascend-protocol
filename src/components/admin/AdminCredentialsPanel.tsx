import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";

export const AdminCredentialsPanel = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const changePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Admin password updated");
    setNewPassword("");
    setConfirmPassword("");
  };

  const changePin = async () => {
    if (!/^[0-9]{4,8}$/.test(newPin)) {
      toast.error("PIN must be 4-8 digits");
      return;
    }
    if (newPin !== confirmPin) {
      toast.error("PINs do not match");
      return;
    }
    setSavingPin(true);
    const { error } = await supabase.rpc("set_admin_pin", { _pin: newPin });
    setSavingPin(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Admin PIN updated");
    setNewPin("");
    setConfirmPin("");
  };

  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <KeyRound className="w-4 h-4" /> Admin Credentials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <Lock className="w-3 h-3" /> Change Password
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-pwd" className="text-xs">New password</Label>
            <Input
              id="new-pwd"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pwd" className="text-xs">Confirm password</Label>
            <Input
              id="confirm-pwd"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button size="sm" onClick={changePassword} disabled={savingPwd} className="w-full">
            {savingPwd ? "Updating..." : "Update Password"}
          </Button>
        </div>

        <div className="space-y-3 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1">
            <KeyRound className="w-3 h-3" /> Change Admin PIN
          </p>
          <div className="space-y-2">
            <Label htmlFor="new-pin" className="text-xs">New PIN (4-8 digits)</Label>
            <Input
              id="new-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pin" className="text-xs">Confirm PIN</Label>
            <Input
              id="confirm-pin"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            />
          </div>
          <Button size="sm" onClick={changePin} disabled={savingPin} className="w-full">
            {savingPin ? "Updating..." : "Update PIN"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
