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
