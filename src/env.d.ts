/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_MEASUREMENT_ID: string
  readonly VITE_OPENROUTER_API_KEY: string
  readonly VITE_PLAYHT_SECRET_KEY: string
  readonly VITE_PLAYHT_USER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
