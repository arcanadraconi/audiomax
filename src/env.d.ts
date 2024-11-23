/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PLAYHT_SECRET_KEY: string
  readonly PLAYHT_USER_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
