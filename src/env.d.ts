/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string
  readonly PLAYHT_SECRET_KEY: string
  readonly PLAYHT_USER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@env' {
  export const env: ImportMetaEnv
}
