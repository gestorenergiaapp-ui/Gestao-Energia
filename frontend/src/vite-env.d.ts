interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_LOGO_URL?: string;
  // any other env variables you have go here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
