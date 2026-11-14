REVOKE ALL ON TABLE "public"."portal_records" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."portal_backups" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON TABLE "public"."portal_rate_limits" FROM "anon", "authenticated";