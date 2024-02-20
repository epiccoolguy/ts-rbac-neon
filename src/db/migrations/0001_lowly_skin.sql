ALTER TABLE "permissions" DROP COLUMN IF EXISTS "created_at";--> statement-breakpoint
ALTER TABLE "permissions" DROP COLUMN IF EXISTS "updated_at";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN IF EXISTS "created_at";--> statement-breakpoint
ALTER TABLE "roles" DROP COLUMN IF EXISTS "updated_at";