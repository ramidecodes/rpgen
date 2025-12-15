CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"description" text NOT NULL,
	"clues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "relationships" jsonb DEFAULT '{"nodes":[],"edges":[]}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "active_fronts" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "narrative_vectors" jsonb DEFAULT '{"hope":0.5,"chaos":0.5}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "current_context" text;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quests_run_id_idx" ON "quests" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "quests_status_idx" ON "quests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quests_created_at_idx" ON "quests" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "runs" DROP COLUMN "state";