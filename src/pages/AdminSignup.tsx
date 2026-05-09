import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Upload, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

type RequestedRole = "admin" | "editor" | "customer_support" | "finance";

export default function AdminSignup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<RequestedRole>("admin");
  const [face, setFace] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!face) return toast.error("Please upload a clear photo of your face.");
    if (!/^\d{4,8}$/.test(pin)) return toast.error("PIN must be 4–8 digits.");
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");

    setLoading(true);
    try {
      // 1. Create auth user
      const { data: signUp, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin-login`,
          data: { full_name: displayName },
        },
      });
      if (signErr) throw signErr;

      // 2. Sign in immediately (works if email confirm disabled; otherwise user must confirm first)
      let userId = signUp.user?.id;
      if (!signUp.session) {
        const { data: si, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) {
          toast.message("Check your email to confirm, then return to /admin-signup to upload your photo.");
          setLoading(false);
          return;
        }
        userId = si.user?.id;
      }
      if (!userId) throw new Error("Could not create account");

      // 3. Upload face photo to private bucket under user_id/
      const ext = face.name.split(".").pop() || "jpg";
      const path = `${userId}/face-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("admin-faces")
        .upload(path, face, { contentType: face.type, upsert: true });
      if (upErr) throw upErr;

      // 4. Submit signup request via RPC
      const { error: rpcErr } = await supabase.rpc("submit_admin_request", {
        _email: email,
        _display_name: displayName,
        _requested_role: role,
        _pin: pin,
        _face_photo_path: path,
      });
      if (rpcErr) throw rpcErr;

      // 5. Sign out – they cannot enter admin until approved
      await supabase.auth.signOut();

      toast.success("Request submitted! The super admin will review your application.");
      navigate("/admin-login");
    } catch (err: any) {
      toast.error(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-destructive/20 bg-card/90 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Admin Access Request</CardTitle>
          <p className="text-xs text-muted-foreground">
            All admin sign-ups require approval by the super admin. A clear photo of your face is required.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="pin">Admin PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  placeholder="4–8 digits"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="tracking-widest text-center"
                />
              </div>
              <div className="space-y-1">
                <Label>Requested role</Label>
                <Select value={role} onValueChange={(v: RequestedRole) => setRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="customer_support">Customer Support</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Face photo (required)</Label>
              <label className="flex items-center gap-3 p-3 border border-dashed border-destructive/30 rounded-lg cursor-pointer hover:bg-muted/30">
                {face ? <Camera className="w-4 h-4 text-emerald-400" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="text-xs flex-1 truncate">
                  {face ? face.name : "Tap to upload a clear, recent photo of your face"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  className="hidden"
                  onChange={(e) => setFace(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting</> : "Submit for approval"}
            </Button>
            <p className="text-[10px] text-muted-foreground text-center">
              Already have access?{" "}
              <Link to="/admin-login" className="text-destructive underline">Admin login</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
