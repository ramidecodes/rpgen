import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://rpgen.ramilabs.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/sign-in/", "/sign-up/", "/profile/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
