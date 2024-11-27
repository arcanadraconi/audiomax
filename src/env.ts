export const env = {
  FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY as string,
  FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID as string,
  FIREBASE_MEASUREMENT_ID: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,

  // PlayHT Configuration
  PLAYHT_USER_ID: import.meta.env.VITE_PLAYHT_USER_ID as string,
  PLAYHT_SECRET_KEY: import.meta.env.VITE_PLAYHT_SECRET_KEY as string,

  // OpenRouter Configuration
  OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY as string,

  // Feature Flags
  ENABLE_VOICE_CLONING: import.meta.env.VITE_ENABLE_VOICE_CLONING === 'true',
  ENABLE_CUSTOM_VOICES: import.meta.env.VITE_ENABLE_CUSTOM_VOICES === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_PUSH_NOTIFICATIONS: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',

  // Stripe Configuration
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string,
  STRIPE_PRICE_ID_PRO_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_MONTHLY as string,
  STRIPE_PRICE_ID_PRO_YEARLY: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_YEARLY as string,
  STRIPE_PRICE_ID_PREMIUM_MONTHLY: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY as string,
  STRIPE_PRICE_ID_PREMIUM_YEARLY: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM_YEARLY as string,
};
