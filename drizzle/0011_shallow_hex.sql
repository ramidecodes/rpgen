CREATE TABLE "sse_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sse_events" ADD CONSTRAINT "sse_events_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sse_events_run_id_created_at_idx" ON "sse_events" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "sse_events_created_at_idx" ON "sse_events" USING btree ("created_at");