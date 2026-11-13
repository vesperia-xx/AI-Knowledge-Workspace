CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "plan" "subscription_plan" DEFAULT 'free' NOT NULL;