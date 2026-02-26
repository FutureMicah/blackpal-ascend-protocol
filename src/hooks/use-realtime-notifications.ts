import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RealtimeNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  icon: string;
  action_url?: string;
}

export const useRealtimeNotifications = (userId: string | null) => {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    channelRef.current = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as RealtimeNotification;
          toast(notification.title, {
            description: notification.message,
            icon: notification.icon || "🔔",
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);
};
