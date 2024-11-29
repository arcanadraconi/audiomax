/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLAYHT_SECRET_KEY: string
  readonly VITE_PLAYHT_USER_ID: string
  readonly VITE_ENABLE_VOICE_CLONING: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
