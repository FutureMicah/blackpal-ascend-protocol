import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ProfileSetupEnhanced } from "@/components/ProfileSetupEnhanced";
import { FloatingNav } from "@/components/FloatingNav";
import { toast } from "sonner";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserAndProfile();
  }, []);

  const loadUserAndProfile = async () => {
    try {
      const { data: { user: userData } } = await supabase.auth.getUser();
      
      if (!userData) {
        navigate("/auth");
        return;
      }

      setUser(userData);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.id)
        .single();

      setProfile(profileData);
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    toast.success("Profile updated successfully!");
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingNav />
      <ProfileSetupEnhanced
        userId={user.id}
        existingProfile={profile}
        onComplete={handleComplete}
      />
    </div>
  );
}
