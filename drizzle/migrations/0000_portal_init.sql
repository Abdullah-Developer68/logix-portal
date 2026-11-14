CREATE TABLE "portal_backups" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"label" text,
	"created_by" text,
	"record_count" integer,
	"size_bytes" integer,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_backups" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portal_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portal_rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "portal_records" (
	"collection" text NOT NULL,
	"id" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_records_collection_id_pk" PRIMARY KEY("collection","id")
);
--> statement-breakpoint
ALTER TABLE "portal_records" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "portal_records_collection_created_at_idx" ON "portal_records" USING btree ("collection","created_at" DESC NULLS LAST);