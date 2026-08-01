interface Fetcher { fetch(input: Request | string, init?: RequestInit): Promise<Response>; }
type D1Database = object;
declare module "cloudflare:workers" { export const env: { DB?: D1Database }; }
