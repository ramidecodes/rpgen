# Feature Requirement Document - Cookie Consent Banner

- **Feature Name**: Cookie Consent Banner

- **Goal**: Implement a simple, GDPR-compliant cookie consent banner that informs users about cookie usage and allows them to accept or reject non-essential cookies. This ensures transparency about data collection and compliance with privacy regulations.

- **User Story**: As a user, I want to be informed about what cookies are used on the platform and have control over non-essential cookies, so that I understand how my data is being used and can make informed privacy choices.

- **Functional Requirements**:

  ### Cookie Banner Component

  - Create a new client component `src/components/layout/cookie-banner.tsx`
  - Display a non-intrusive banner at the bottom of the page (fixed position)
  - Show banner only on first visit (check localStorage for consent preference)
  - Include clear, simple messaging about cookie usage
  - Provide two action buttons:
    - "Accept All" - Accepts all cookies (essential + functional)
    - "Reject Non-Essential" - Accepts only essential cookies (authentication)
  - Link to privacy policy page (`/privacy`) using Next.js `Link` component
  - Store user preference in localStorage with key `cookie-consent`
  - Banner should slide up/down with smooth animation using Tailwind transitions
  - Use shadcn/ui components for consistent styling:
    - **Alert component** (semantic choice for banner notifications) with `AlertTitle` and `AlertDescription`
    - **Button components** with appropriate variants (`default` for primary action, `outline` for secondary)
    - Alternative: **Card component** if Alert styling doesn't fit design needs
  - Implement hydration-safe pattern (similar to `ThemeToggle`):
    - Use `mounted` state with `useEffect` to prevent hydration mismatches
    - Only render banner content after component mounts on client
    - Show placeholder or nothing during SSR

  ### Cookie Categories to Inform About

  **Essential Cookies (Required - Cannot be rejected):**

  - Clerk authentication cookies - Required for user sessions and account access
  - Session management cookies - Required for app functionality

  **Functional Cookies (Optional - Can be rejected):**

  - Theme preference cookies (next-themes) - Stores light/dark mode preference
  - User preferences - Any other functional preferences stored locally

  **Third-Party Service Cookies (Informational):**

  - Stripe cookies - If payment processing is used
  - Replicate cookies - If image generation service sets cookies
  - OpenRouter cookies - If AI inference service sets cookies
  - Note: These are informational only, as they're set by third-party services

  ### Integration

  - Add cookie banner to root layout (`src/app/layout.tsx`) as a client component
  - Wrap in conditional rendering to only show when mounted (prevents hydration issues)
  - Banner should appear after page load (client-side only)
  - Banner should not interfere with existing UI components (use z-index appropriately)
  - Banner should respect theme (light/dark mode) - shadcn components handle this automatically
  - Banner should be responsive (mobile-friendly) - use Tailwind responsive classes
  - Position banner with `fixed bottom-0` and proper padding for mobile/desktop
  - Use Next.js `Link` component for privacy policy navigation (not anchor tag)

  ### User Preference Storage

  - Store consent in localStorage: `cookie-consent` with value structure:
    ```typescript
    {
      essential: true, // Always true, cannot be rejected
      functional: boolean, // User's choice
      timestamp: number // When consent was given
    }
    ```
  - Check localStorage on component mount to determine if banner should show
  - If consent exists, don't show banner
  - Provide way to change preferences (optional: settings page or re-show banner)

- **Data Requirements**:

  - No database storage needed - preferences stored in browser localStorage only
  - No server-side processing required

- **User Flow**:

  1. User visits the application for the first time
  2. Cookie banner appears at bottom of page with simple message
  3. User reads information about cookie usage
  4. User clicks either:
     - "Accept All" - All cookies enabled, preference saved, banner dismissed
     - "Reject Non-Essential" - Only essential cookies enabled, preference saved, banner dismissed
  5. Banner disappears and doesn't show again (unless localStorage is cleared)
  6. User can click privacy policy link to learn more

- **Acceptance Criteria**:

  - Cookie banner component is created in `src/components/layout/cookie-banner.tsx`
  - Component uses `"use client"` directive and hydration-safe pattern (mounted state)
  - Banner displays on first visit only (checks localStorage after mount)
  - Banner shows clear information about cookie usage using Alert or Card component
  - "Accept All" button (Button variant="default") accepts all cookies and saves preference
  - "Reject Non-Essential" button (Button variant="outline") accepts only essential cookies and saves preference
  - Privacy policy link uses Next.js `Link` component and navigates to `/privacy` page
  - Preference is stored in localStorage with proper TypeScript type structure
  - Banner doesn't show again after user makes a choice (checks localStorage on mount)
  - Banner is responsive and works on mobile devices (responsive Tailwind classes)
  - Banner respects theme (light/dark mode) - shadcn components handle this automatically
  - Banner uses shadcn/ui components (Alert or Card, Button, Link)
  - Banner has smooth slide-up/down animation using Tailwind transition utilities
  - Banner doesn't interfere with existing UI or functionality (proper z-index, positioning)
  - Banner is accessible (keyboard navigation, screen readers - Alert component provides role="alert")
  - Component follows Next.js App Router patterns and codebase conventions

- **Edge Cases**:

  - User clears localStorage - Banner should show again
  - User visits in incognito mode - Banner should show (no localStorage persistence)
  - User clicks privacy link - Should navigate using Next.js Link (client-side navigation), banner can remain or dismiss based on UX preference
  - Multiple tabs open - Preference should sync (localStorage is shared)
  - Browser doesn't support localStorage - Gracefully handle (show banner each time)
  - User rapidly clicks buttons - Prevent double-submission

- **Non-Functional Requirements**:

  - **Performance**: Banner should not impact page load time (client-side only, hydration-safe pattern prevents SSR overhead)
  - **Accessibility**: Banner should be keyboard accessible and screen reader friendly
  - **UX**: Banner should be unobtrusive but visible, with clear messaging
  - **Compliance**: Meets basic GDPR/CCPA requirements for cookie consent
  - **Maintainability**: Simple implementation, easy to update messaging or add cookie categories

- **Implementation Guidelines**:

  ### Next.js Best Practices

  - Use client component (`"use client"`) since it needs localStorage and interactivity
  - Implement hydration-safe pattern:
    ```typescript
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
      setMounted(true);
    }, []);
    if (!mounted) return null; // or return placeholder
    ```
  - Use Next.js `Link` component from `next/link` for navigation to privacy page
  - Keep component in `src/components/layout/` directory following existing structure
  - Import and use in root layout (`src/app/layout.tsx`) as a client component

  ### Shadcn Component Usage

  - **Primary choice**: Use `Alert` component with `AlertTitle` and `AlertDescription` for semantic banner
    - Import from `@/components/ui/alert`
    - Provides built-in accessibility (role="alert")
    - Styled with theme-aware colors automatically
  - **Alternative**: Use `Card` component if Alert styling doesn't fit design needs
    - Import from `@/components/ui/card`
    - Use `CardContent` for banner content
  - Use `Button` components for actions:
    - Primary action: `variant="default"` for "Accept All"
    - Secondary action: `variant="outline"` for "Reject Non-Essential"
    - Import from `@/components/ui/button`

  ### Styling & Animation

  - Use Tailwind CSS for styling and animations
  - Use `transition-transform` and `transform` utilities for slide animations
  - Use `fixed bottom-0 left-0 right-0` for positioning
  - Add appropriate z-index (e.g., `z-50`) to ensure banner appears above content
  - Use responsive padding: `p-4 md:p-6` for mobile/desktop spacing
  - Use `shadow-lg` or `shadow-xl` for elevation
  - Follow existing Tailwind class ordering conventions (see `css-class-ordering.mdc`)

  ### Code Style

  - Follow existing code style (double quotes, semicolons, named exports)
  - Use TypeScript with proper types for localStorage data structure
  - Store preference with clear structure for future extensibility
  - Keep messaging simple and user-friendly (avoid technical jargon)
  - Use `cn()` utility from `@/lib/utils` for conditional class merging

  ### Component Structure Example

  ```typescript
  "use client";

  import { useEffect, useState } from "react";
  import Link from "next/link";
  import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/lib/utils";

  export function CookieBanner() {
    const [mounted, setMounted] = useState(false);
    const [showBanner, setShowBanner] = useState(false);

    useEffect(() => {
      setMounted(true);
      // Check localStorage for existing consent
      const consent = localStorage.getItem("cookie-consent");
      if (!consent) {
        setShowBanner(true);
      }
    }, []);

    if (!mounted || !showBanner) return null;

    // Handle accept/reject logic
    // ...

    return (
      <Alert className={cn("fixed bottom-0 left-0 right-0 z-50 ...")}>
        {/* Banner content */}
      </Alert>
    );
  }
  ```

- **Dependencies**:

  - Base Next.js Implementation (base-implementation.md)
  - Authentication with Clerk (authentication-clerk.md) - For understanding essential cookies
  - Privacy Policy page exists (`src/app/privacy/page.tsx`)

- **Future Enhancements (Out of Scope)**:

  - Cookie preference management page/settings
  - Granular cookie category selection (analytics, marketing, etc.)
  - Cookie expiration date tracking
  - Server-side consent tracking
  - Cookie policy page with detailed information
  - Integration with cookie management libraries (if needed later)
