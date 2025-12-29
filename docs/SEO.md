# SEO Configuration and Google Search Console Setup

This document outlines the SEO setup for RPGen, including Google Search Console configuration, sitemap management, and SEO best practices.

## Overview

RPGen uses Next.js 15 built-in features for SEO:

- **Sitemap**: Dynamically generated via `src/app/sitemap.ts` (accessible at `/sitemap.xml`)
- **Robots.txt**: Dynamically generated via `src/app/robots.ts` (accessible at `/robots.txt`)
- **Metadata**: Enhanced metadata with OpenGraph and Twitter cards using Next.js Metadata API
- **Production URL**: `https://rpgen.ramilabs.com`

## Google Search Console Setup

### Step 1: Add Property

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Sign in with your Google account
3. Click "Add Property"
4. Enter your website URL: `rpgen.ramilabs.com`
5. Click "Continue"

### Step 2: Verify Ownership (DNS Method)

Since we're using DNS verification, no code changes are required:

1. In Google Search Console, select "DNS record" as the verification method
2. Google will provide a TXT record that looks like:
   ```
   google-site-verification=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. Add this TXT record to your domain's DNS settings (`ramilabs.com`):
   - **Type**: TXT
   - **Name**: `@` (or root domain)
   - **Value**: The verification string provided by Google
   - **TTL**: Default (usually 3600 seconds)
4. Save the DNS record in your DNS provider
5. Wait a few minutes for DNS propagation (can take up to 24 hours, but usually much faster)
6. Return to Google Search Console and click "Verify"
7. Once verified, you'll have access to Search Console features

**Note**: DNS verification is permanent and doesn't require any code changes or environment variables.

### Step 3: Submit Sitemap

After verification is complete:

1. In Google Search Console, navigate to "Sitemaps" in the left sidebar
2. Enter your sitemap URL: `https://rpgen.ramilabs.com/sitemap.xml`
3. Click "Submit"
4. Google will start processing your sitemap and indexing your pages

The sitemap includes the following public routes:
- `/` (Home page)
- `/about` (About page)
- `/privacy` (Privacy Policy)
- `/terms` (Terms of Service)

**Note**: User-specific routes (campaigns/[id], characters/[id], runs/[id], etc.) are excluded from the sitemap as they require authentication.

## Sitemap Configuration

The sitemap is dynamically generated at `src/app/sitemap.ts` using Next.js 15's built-in file convention. It:

- Automatically exposes at `/sitemap.xml`
- Updates dynamically (no build-time generation needed)
- Includes `lastModified`, `changeFrequency`, and `priority` for each route
- Uses `NEXT_PUBLIC_SITE_URL` environment variable (defaults to `https://rpgen.ramilabs.com`)

### Sitemap Structure

```typescript
- Home (/): priority 1.0, changeFrequency: weekly
- About (/about): priority 0.8, changeFrequency: monthly
- Privacy (/privacy): priority 0.5, changeFrequency: yearly
- Terms (/terms): priority 0.5, changeFrequency: yearly
```

## Robots.txt Configuration

The robots.txt file is dynamically generated at `src/app/robots.ts`. It:

- Allows all search engine crawlers
- References the sitemap URL
- Disallows `/api/*`, `/sign-in/*`, `/sign-up/*`, and `/profile/*` routes

Access the robots.txt file at: `https://rpgen.ramilabs.com/robots.txt`

## Metadata Configuration

All pages use Next.js 15's Metadata API with:

- **OpenGraph tags**: For social media sharing (Facebook, LinkedIn, etc.)
- **Twitter Card tags**: For Twitter sharing
- **Keywords**: Relevant SEO keywords
- **Descriptions**: Unique, descriptive meta descriptions for each page

### Pages with Custom Metadata

- **Home** (`/`): Full description of RPGen's features and value proposition
- **About** (`/about`): Detailed information about the game mechanics
- **Privacy** (`/privacy`): Privacy policy metadata with appropriate keywords
- **Terms** (`/terms`): Terms of service metadata with appropriate keywords

All metadata uses absolute URLs for images and OpenGraph tags, using the `NEXT_PUBLIC_SITE_URL` environment variable.

## Environment Variables

### `NEXT_PUBLIC_SITE_URL`

- **Purpose**: Base URL for the production site
- **Default**: `https://rpgen.ramilabs.com`
- **Usage**: Used in sitemap generation and metadata for absolute URLs
- **Set in**: Production environment variables

If you need to change the production URL, update this environment variable in your deployment platform (e.g., Vercel).

## Monitoring and Maintenance

### Regular Checks

1. **Search Console Reports**:
   - Monitor "Coverage" report for indexing issues
   - Check "Performance" report for search queries and impressions
   - Review "Sitemaps" section for any errors or warnings

2. **Sitemap Validation**:
   - Periodically verify that `/sitemap.xml` is accessible and properly formatted
   - Ensure all public routes are included
   - Check that excluded routes (user-specific) are not accidentally included

3. **Robots.txt Validation**:
   - Verify `/robots.txt` is accessible
   - Test with Google's robots.txt tester tool
   - Ensure critical routes are not accidentally disallowed

4. **Metadata Updates**:
   - Keep page descriptions up-to-date with content changes
   - Update OpenGraph images when brand assets change
   - Review and refresh keywords periodically

### Common Issues

**Sitemap Not Found (404)**:
- Verify `src/app/sitemap.ts` exists and exports the correct function
- Check that the Next.js build completed successfully
- Ensure the route is accessible at `/sitemap.xml`

**Pages Not Indexing**:
- Check robots.txt to ensure pages aren't disallowed
- Verify pages return 200 status codes
- Ensure pages have proper metadata and content
- Check Search Console "Coverage" report for specific errors

**DNS Verification Not Working**:
- Confirm DNS record was added correctly (check with DNS lookup tools)
- Wait longer for DNS propagation (can take up to 24 hours)
- Verify the TXT record name and value match exactly what Google provided
- Check that the domain's DNS provider supports TXT records

## Best Practices

### Content

- Write unique, descriptive meta descriptions for each page (150-160 characters)
- Use relevant keywords naturally in content and metadata
- Ensure each page has a clear, descriptive title
- Keep content fresh and updated regularly

### Technical SEO

- Ensure fast page load times
- Use semantic HTML structure
- Implement proper heading hierarchy (H1, H2, H3)
- Include alt text for images
- Ensure mobile responsiveness

### Social Sharing

- Use descriptive OpenGraph titles and descriptions
- Include appropriate OpenGraph images (currently using favicon, can be upgraded)
- Test social media previews using tools like:
  - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
  - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Future Enhancements

Potential improvements for future consideration:

1. **Structured Data (JSON-LD)**: Add structured data markup for better rich snippets
2. **OpenGraph Images**: Create dedicated OG images for better social sharing
3. **Dynamic Sitemaps**: Include public campaigns/universes in sitemap if they become indexable
4. **Canonical URLs**: Ensure canonical tags are set correctly for all pages
5. **Language Tags**: Add hreflang tags if internationalization is added

## Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [Next.js Metadata API Documentation](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js Sitemap Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Google Search Central](https://developers.google.com/search)
