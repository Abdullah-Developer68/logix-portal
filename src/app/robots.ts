import type { MetadataRoute } from "next";

// The portal is a private workspace; the public site is logixofficial.site.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
