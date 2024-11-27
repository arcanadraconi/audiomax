/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Firebase Configuration
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;

  // PlayHT Configuration
  readonly VITE_PLAYHT_USER_ID: string;
  readonly VITE_PLAYHT_SECRET_KEY: string;

  // OpenRouter Configuration
  readonly VITE_OPENROUTER_API_KEY: string;

  // Feature Flags
  readonly VITE_ENABLE_VOICE_CLONING: string;
  readonly VITE_ENABLE_CUSTOM_VOICES: string;
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS: string;

  // Stripe Configuration
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
  readonly VITE_STRIPE_PRICE_ID_PRO_MONTHLY: string;
  readonly VITE_STRIPE_PRICE_ID_PRO_YEARLY: string;
  readonly VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY: string;
  readonly VITE_STRIPE_PRICE_ID_PREMIUM_YEARLY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
