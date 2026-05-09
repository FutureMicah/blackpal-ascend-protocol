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
  amountLocal?: number;
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

const CONTINENT_MAP: Record<string, string> = {
  NG: 'Africa',
};

export async function detectGeo(): Promise<GeoData> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();

    const countryCode = data.country_code || 'US';
    const country = data.country_name || 'United States';
    const continent = data.continent_code === 'AF' ? 'Africa' : (CONTINENT_MAP[countryCode] || data.continent_code || 'Unknown');

    return calculatePaymentTier({ countryCode, country, continent });
  } catch (error) {
    console.error('Geo detection failed, using fallback:', error);
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
  let amountLocal: number | undefined;
  let localCurrency: string | undefined;

  if (isNigeria) {
    paymentTier = 'NIGERIA';
    amountUSD = 1;
    amountLocal = 1000;
    localCurrency = 'NGN';
  } else if (isAfrica) {
    paymentTier = 'NIGERIA'; // All users pay ₦1,000
    amountUSD = 1;
    amountLocal = 1000;
    localCurrency = 'NGN';
  } else {
    paymentTier = 'NIGERIA'; // All users pay ₦1,000
    amountUSD = 1;
    amountLocal = 1000;
    localCurrency = 'NGN';
  }

  return {
    country,
    countryCode,
    continent,
    isNigeria,
    isAfrica,
    paymentTier,
    amountUSD,
    amountLocal,
    localCurrency
  };
}

export interface PaymentMethodInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'card' | 'transfer' | 'mobile' | 'ussd' | 'crypto' | 'voucher';
}

export function getPaymentMethods(tier: PaymentTier): PaymentMethodInfo[] {
  if (tier === 'NIGERIA') {
    return [
      {
        id: 'paystack',
        name: 'Paystack',
        description: 'Pay with debit/credit card',
        icon: '💳',
        category: 'card',
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        description: 'Direct transfer to our bank account',
        icon: '🏦',
        category: 'transfer',
      },
      {
        id: 'opay',
        name: 'OPay',
        description: 'Pay via OPay wallet or transfer',
        icon: '📱',
        category: 'mobile',
      },
      {
        id: 'palmpay',
        name: 'PalmPay',
        description: 'Pay via PalmPay wallet',
        icon: '🌴',
        category: 'mobile',
      },
      {
        id: 'momo',
        name: 'MoMo (MTN)',
        description: 'Pay via MTN Mobile Money',
        icon: '📲',
        category: 'mobile',
      },
      {
        id: 'ussd',
        name: 'USSD Payment',
        description: 'Dial code to pay instantly (*737#, *901#, etc.)',
        icon: '📞',
        category: 'ussd',
      },
      {
        id: 'flutterwave',
        name: 'Flutterwave (Coming Soon)',
        description: 'Worldwide payments — launching shortly',
        icon: '⚡',
        category: 'card',
      },
      {
        id: 'voucher',
        name: 'BTA Voucher Code',
        description: 'Redeem a pre-purchased voucher',
        icon: '🎫',
        category: 'voucher',
      },
    ];
  } else {
    return [
      {
        id: 'crypto_trc20',
        name: 'USDT (TRC20)',
        description: 'Pay with USDT on Tron network',
        icon: '🪙',
        category: 'crypto',
      },
      {
        id: 'crypto_bsc',
        name: 'USDT (BSC)',
        description: 'Pay with USDT on Binance Smart Chain',
        icon: '🔶',
        category: 'crypto',
      },
    ];
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
