/**
 * SecurityPanel - Central security settings hub combining all security features.
 * 
 * Usage: <SecurityPanel userId={user.id} userEmail={user.email} />
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Fingerprint, History, MonitorSmartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BiometricAuth } from "@/components/BiometricAuth";
import { TrustedDevicesManager } from "./TrustedDevicesManager";
import { LoginActivityLog } from "./LoginActivityLog";

interface SecurityPanelProps {
  userId: string;
  userEmail?: string;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "devices" | "activity" | "register";

export const SecurityPanel = ({ userId, userEmail, isOpen, onClose }: SecurityPanelProps) => {
  const [activeTab, setActiveTab] = useState<Tab>("devices");

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "devices", label: "Devices", icon: <MonitorSmartphone className="w-4 h-4" /> },
    { id: "activity", label: "Activity", icon: <History className="w-4 h-4" /> },
    { id: "register", label: "Add Device", icon: <Fingerprint className="w-4 h-4" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg max-h-[85vh] rounded-2xl border border-primary/20 bg-card overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Security Center</h2>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "devices" && <TrustedDevicesManager userId={userId} />}
          {activeTab === "activity" && <LoginActivityLog userId={userId} />}
          {activeTab === "register" && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Fingerprint className="w-12 h-12 mx-auto mb-3 text-primary opacity-60" />
                <h3 className="text-lg font-semibold text-foreground mb-1">Register New Device</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Add your fingerprint or face as a trusted method for payments and login.
                </p>
              </div>
              <BiometricAuth
                mode="register"
                label="Register Biometric Device"
                onSuccess={() => setActiveTab("devices")}
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
