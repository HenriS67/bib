CREATE TABLE IF NOT EXISTS "admin_users" (
  "id" text PRIMARY KEY NOT NULL,
  "username" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
