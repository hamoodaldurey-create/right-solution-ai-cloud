declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_ENABLED?: string;
    OPENAI_API_KEY?: string;
    CLOUD_BUDGET_USD?: string;
  }
}
