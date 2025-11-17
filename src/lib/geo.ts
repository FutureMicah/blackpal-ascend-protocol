// Geo-detection and payment tier logic

export type PaymentTier = 'NIGERIA' | 'AFRICA' | 'INTERNATIONAL';

export interface GeoData {
  country: string;
  countryCode: string;
  continent: string;
  isNigeria: boolean;
  isAfrica: boolean;
  paymentTier: PaymentTier;
  amountUSD: number;
  localCurrency?: string;
}

// African country codes (ISO 3166-1 alpha-2)
const AFRICAN_COUNTRIES = new Set([
  'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD',
  'CI', 'DJ', 'EG', 'GQ', 'ER', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS',
  'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'YT', 'MA', 'MZ', 'NA', 'NE', 'NG',
  'RE', 'RW', 'SH', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'SZ', 'TZ',
  'TG', 'TN', 'UG', 'EH', 'ZM', 'ZW'
]);

// Continent mapping for major regions
const CONTINENT_MAP: Record<string, string> = {
  NG: 'Africa',
  // Add more as needed for display purposes
};

export async function detectGeo(): Promise<GeoData> {
  try {
    // Use ipapi.co for free geo detection (100 requests/day free tier)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();

    const countryCode = data.country_code || 'US';
    const country = data.country_name || 'United States';
    const continent = data.continent_code === 'AF' ? 'Africa' : (CONTINENT_MAP[countryCode] || data.continent_code || 'Unknown');

    return calculatePaymentTier({ countryCode, country, continent });
  } catch (error) {
    console.error('Geo detection failed, using fallback:', error);
    // Fallback to US
    return calculatePaymentTier({
      countryCode: 'US',
      country: 'United States',
      continent: 'North America'
    });
  }
}

export function calculatePaymentTier(data: {
  countryCode: string;
  country: string;
  continent: string;
}): GeoData {
  const { countryCode, country, continent } = data;
  const isNigeria = countryCode === 'NG';
  const isAfrica = AFRICAN_COUNTRIES.has(countryCode);

  let paymentTier: PaymentTier;
  let amountUSD: number;
  let localCurrency: string | undefined;

  if (isNigeria) {
    paymentTier = 'NIGERIA';
    amountUSD = 50; // Base price for Nigeria
    localCurrency = 'NGN';
  } else if (isAfrica) {
    paymentTier = 'AFRICA';
    amountUSD = 100;
  } else {
    paymentTier = 'INTERNATIONAL';
    amountUSD = 200;
  }

  return {
    country,
    countryCode,
    continent,
    isNigeria,
    isAfrica,
    paymentTier,
    amountUSD,
    localCurrency
  };
}

export function getPaymentMethods(tier: PaymentTier): string[] {
  if (tier === 'NIGERIA') {
    return ['paystack', 'flutterwave', 'bank_transfer', 'ussd', 'voucher'];
  } else {
    return ['crypto_trc20', 'crypto_bsc'];
  }
}

export function getCitizenshipRank(xp: number): string {
  if (xp < 100) return 'Visitor';
  if (xp < 500) return 'Pathfinder';
  if (xp < 2000) return 'Guardian';
  if (xp < 10000) return 'Sovereign';
  return 'Citizen Prime';
}

export function getXPReward(tier: PaymentTier): number {
  switch (tier) {
    case 'NIGERIA':
      return 20;
    case 'AFRICA':
      return 40;
    case 'INTERNATIONAL':
      return 60;
    default:
      return 0;
  }
}
