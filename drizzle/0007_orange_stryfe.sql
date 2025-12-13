ALTER TABLE "runs" DROP CONSTRAINT "runs_current_scene_id_scenes_id_fk";
--> statement-breakpoint
ALTER TABLE "scenes" DROP CONSTRAINT "scenes_previous_scene_id_scenes_id_fk";
--> statement-breakpoint
ALTER TABLE "scenes" ALTER COLUMN "image_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "scenes" ADD CONSTRAINT "scenes_previous_scene_id_fkey" FOREIGN KEY ("previous_scene_id") REFERENCES "public"."scenes"("id") ON DELETE no action ON UPDATE no action;