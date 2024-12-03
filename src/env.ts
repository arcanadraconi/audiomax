export const env = {
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  },
  playht: {
    userId: import.meta.env.VITE_PLAYHT_USER_ID,
    secretKey: import.meta.env.VITE_PLAYHT_SECRET_KEY,
  },
  openrouter: {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
  },
  features: {
    voiceCloning: import.meta.env.VITE_ENABLE_VOICE_CLONING === 'true',
    customVoices: import.meta.env.VITE_ENABLE_CUSTOM_VOICES === 'true',
    analytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    pushNotifications: import.meta.env.VITE_ENABLE_PUSH_NOTIFICATIONS === 'true',
  },
  stripe: {
    publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
    prices: {
      pro: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_MONTHLY,
        yearly: import.meta.env.VITE_STRIPE_PRICE_ID_PRO_YEARLY,
      },
      premium: {
        monthly: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM_MONTHLY,
        yearly: import.meta.env.VITE_STRIPE_PRICE_ID_PREMIUM_YEARLY,
      },
    },
  },
};
