CREATE TABLE "scenes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"scene_type" varchar(20) NOT NULL,
	"image_url" varchar(500) NOT NULL,
	"generation_prompt" text NOT NULL,
	"narrative_context" text NOT NULL,
	"previous_scene_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD COLUMN "current_scene_id" uuid;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_previous_scene_id_scenes_id_fk" FOREIGN KEY ("previous_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenes_run_id_idx" ON "scenes" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "scenes_created_at_idx" ON "scenes" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_current_scene_id_scenes_id_fk" FOREIGN KEY ("current_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;