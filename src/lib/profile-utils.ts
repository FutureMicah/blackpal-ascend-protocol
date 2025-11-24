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
