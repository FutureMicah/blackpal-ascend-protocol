import { Shield, ShieldCheck, Crown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  isVerified: boolean;
  badge: string | null;
  kycStatus?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const badgeConfig = {
  gold: {
    icon: Crown,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
    label: "Gold Verified",
    description: "Premium verified member with full KYC",
  },
  verified: {
    icon: ShieldCheck,
    color: "text-blue-500",
    bgColor: "bg-blue-500/20",
    label: "Verified",
    description: "Identity verified member",
  },
  premium: {
    icon: Star,
    color: "text-purple-500",
    bgColor: "bg-purple-500/20",
    label: "Premium",
    description: "Premium subscriber",
  },
  basic: {
    icon: Shield,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Basic",
    description: "Basic member",
  },
};

const sizeConfig = {
  sm: { icon: "h-3 w-3", container: "w-4 h-4" },
  md: { icon: "h-4 w-4", container: "w-5 h-5" },
  lg: { icon: "h-5 w-5", container: "w-6 h-6" },
};

export const VerificationBadge = ({
  isVerified,
  badge,
  kycStatus,
  size = 'md',
  showTooltip = true,
}: VerificationBadgeProps) => {
  if (!isVerified && !badge) return null;

  const config = badge && badgeConfig[badge as keyof typeof badgeConfig]
    ? badgeConfig[badge as keyof typeof badgeConfig]
    : badgeConfig.basic;

  const Icon = config.icon;
  const sizes = sizeConfig[size];

  const BadgeIcon = (
    <div
      className={cn(
        "flex items-center justify-center rounded-full",
        config.bgColor,
        sizes.container
      )}
    >
      <Icon className={cn(config.color, sizes.icon)} />
    </div>
  );

  if (!showTooltip) return BadgeIcon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {BadgeIcon}
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {kycStatus && (
              <p className="text-xs mt-1">
                KYC: <span className="capitalize">{kycStatus}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const KYCStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { color: string; label: string }> = {
    verified: { color: "text-green-500", label: "✓ KYC Verified" },
    pending: { color: "text-yellow-500", label: "⏳ KYC Pending" },
    rejected: { color: "text-red-500", label: "✗ KYC Rejected" },
    unverified: { color: "text-muted-foreground", label: "Not Verified" },
  };

  const config = statusConfig[status] || statusConfig.unverified;

  return (
    <span className={cn("text-sm font-medium", config.color)}>
      {config.label}
    </span>
  );
};
