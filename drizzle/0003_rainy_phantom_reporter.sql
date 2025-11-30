CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"universe_id" uuid NOT NULL,
	"character_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"cover_image" text,
	"genres" jsonb NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"campaign_state" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_user_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_universe_id_universes_id_fk" FOREIGN KEY ("universe_id") REFERENCES "public"."universes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE no action ON UPDATE no action;