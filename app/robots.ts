import type { MetadataRoute } from "next";
import { VERCEL_SITE_ORIGIN } from "@/lib/auth/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/holding"] },
    sitemap: `${VERCEL_SITE_ORIGIN}/sitemap.xml`,
  };
}
