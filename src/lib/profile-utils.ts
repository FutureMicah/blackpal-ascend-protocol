import { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;

export interface ProfileCompletionStatus {
  isComplete: boolean;
  missingFields: string[];
  readyForPayment: boolean;
}

export function checkProfileCompletion(profile: Profile | null): ProfileCompletionStatus {
  if (!profile) {
    return {
      isComplete: false,
      missingFields: ['profile'],
      readyForPayment: false
    };
  }

  const missingFields: string[] = [];

  // Check required fields for profile completion
  if (!profile.display_name?.trim()) {
    missingFields.push('display_name');
  }

  // Check geo/payment fields
  if (!profile.country) {
    missingFields.push('country');
  }
  if (!profile.continent) {
    missingFields.push('continent');
  }
  if (!profile.payment_tier) {
    missingFields.push('payment_tier');
  }

  const isComplete = missingFields.length === 0;
  const readyForPayment = isComplete && !profile.payment_completed;

  return {
    isComplete,
    missingFields,
    readyForPayment
  };
}

export function getProfileCompletionPercentage(profile: Profile | null): number {
  if (!profile) return 0;

  const fields = [
    'display_name',
    'avatar_url',
    'bio',
    'country',
    'phone_number'
  ];

  const filledFields = fields.filter(field => {
    const value = profile[field as keyof Profile];
    return value !== null && value !== undefined && String(value).trim() !== '';
  });

  return Math.round((filledFields.length / fields.length) * 100);
}

// Profile backup/restore utilities
export interface ProfileBackup {
  version: string;
  timestamp: number;
  data: {
    displayName: string;
    bio?: string;
    country?: string;
    phoneNumber?: string;
    avatarPreview?: string;
  };
}

const BACKUP_KEY = 'blackpal_profile_backup';

export function saveProfileBackup(data: ProfileBackup['data']): void {
  try {
    const backup: ProfileBackup = {
      version: '1.0',
      timestamp: Date.now(),
      data
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
  } catch (error) {
    console.error('Failed to save profile backup:', error);
  }
}

export function loadProfileBackup(): ProfileBackup | null {
  try {
    const stored = localStorage.getItem(BACKUP_KEY);
    if (!stored) return null;
    
    const backup = JSON.parse(stored) as ProfileBackup;
    
    // Check if backup is less than 30 days old
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - backup.timestamp > thirtyDaysInMs) {
      clearProfileBackup();
      return null;
    }
    
    return backup;
  } catch (error) {
    console.error('Failed to load profile backup:', error);
    return null;
  }
}

export function clearProfileBackup(): void {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch (error) {
    console.error('Failed to clear profile backup:', error);
  }
}

export function hasProfileBackup(): boolean {
  return loadProfileBackup() !== null;
}

// Enhanced profile completion for gamification
export interface EnhancedProfileCompletion {
  percentage: number;
  completedFields: string[];
  missingFields: string[];
  isComplete: boolean;
  hasCustomTheme: boolean;
}

export function calculateProfileCompletion(profile: Profile | null): EnhancedProfileCompletion {
  if (!profile) {
    return {
      percentage: 0,
      completedFields: [],
      missingFields: [],
      isComplete: false,
      hasCustomTheme: false,
    };
  }

  const requiredFields = [
    { key: "display_name", label: "Display Name" },
    { key: "avatar_url", label: "Profile Photo" },
    { key: "bio", label: "Bio" },
    { key: "country", label: "Country" },
    { key: "username", label: "Username" },
  ];

  const optionalFields = [
    { key: "phone_number", label: "Phone Number" },
    { key: "date_of_birth", label: "Date of Birth" },
    { key: "website_url", label: "Website" },
    { key: "twitter_handle", label: "Twitter" },
    { key: "linkedin_url", label: "LinkedIn" },
    { key: "github_handle", label: "GitHub" },
    { key: "instagram_handle", label: "Instagram" },
  ];

  const allFields = [...requiredFields, ...optionalFields];
  
  const completedFields: string[] = [];
  const missingFields: string[] = [];

  allFields.forEach((field) => {
    const value = profile[field.key as keyof Profile];
    if (value && value !== "") {
      completedFields.push(field.label);
    } else {
      missingFields.push(field.label);
    }
  });

  const percentage = Math.round((completedFields.length / allFields.length) * 100);
  const isComplete = percentage === 100;

  // Check if user has customized their theme
  const hasCustomTheme =
    (profile.theme_background && profile.theme_background !== "default") ||
    (profile.theme_font && profile.theme_font !== "inter") ||
    (profile.theme_accent_color && profile.theme_accent_color !== "purple");

  return {
    percentage,
    completedFields,
    missingFields,
    isComplete,
    hasCustomTheme,
  };
}
