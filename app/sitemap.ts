import type { MetadataRoute } from "next";
import { VERCEL_SITE_ORIGIN } from "@/lib/auth/site";

const paths = ["", "/about", "/how-it-works", "/students", "/parents", "/schools", "/contact", "/login", "/signup", "/signup/student", "/signup/parent", "/forgot-password"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({
    url: `${VERCEL_SITE_ORIGIN}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.6,
  }));
}
