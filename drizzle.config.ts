import { defineConfig } from 'drizzle-kit'; 
 
export default defineConfig({ 
  schema: './db/schema.ts', 
  out: './db/migrations', 
  dialect: 'postgresql', 
  dbCredentials: { 
    url: 'postgresql://neondb_owner:npg_rXLa7UCix9Dm@ep-restless-truth-aqz27bqu.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require', 
  }, 
}); 
