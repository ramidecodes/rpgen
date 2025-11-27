# Feature Requirement Document - Authentication with Clerk

- **Feature Name**: Authentication with Clerk

- **Goal**: Integrate Clerk authentication service to provide secure user authentication, session management, and protected routes. This enables users to create accounts, sign in, and access protected game features while maintaining security best practices.

- **User Story**: As a player, I want to create an account and sign in securely, so that my game progress, characters, and campaigns are saved and associated with my account.

- **Functional Requirements**:

  - Install and configure Clerk SDK for Next.js:
    - Install `@clerk/nextjs@latest` package to ensure latest version
    - Set up Clerk provider (`<ClerkProvider>`) in root layout (`src/app/layout.tsx` or `app/layout.tsx`)
    - Configure Clerk environment variables in `.env.local` file:
      - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (from Clerk Dashboard)
      - `CLERK_SECRET_KEY` (from Clerk Dashboard)
    - Verify `.gitignore` excludes `.env*` files to prevent committing secrets
  - Set up Clerk middleware in `src/middleware.ts` or root `middleware.ts`:
    - Use `clerkMiddleware()` from `@clerk/nextjs/server` (NOT deprecated `authMiddleware()`)
    - Configure matcher pattern to skip Next.js internals and static files:
      - Skip `_next`, static files (html, css, js, images, etc.)
      - Always run for API routes (`/api/*` and `/trpc/*`)
    - Configure public routes (sign-in, sign-up pages) if needed
    - Handle authentication redirects automatically
  - Implement sign-up flow using Clerk components:
    - Use Clerk's `<SignUpButton />` component for quick integration
    - Or use Clerk's `<SignUp />` component for custom sign-up pages
    - Or custom form with Clerk API
    - Support email/password or OAuth providers
    - Style with shadcn/ui components (Button, Input, Card)
  - Implement sign-in flow:
    - Use Clerk's `<SignInButton />` component for quick integration
    - Or use Clerk's `<SignIn />` component for custom sign-in pages
    - Or custom form with Clerk API
    - Support existing users
    - Style with shadcn/ui components
  - Implement conditional rendering based on auth state:
    - Use `<SignedIn>` component to show content only for authenticated users
    - Use `<SignedOut>` component to show content only for unauthenticated users
  - Implement sign-out functionality:
    - Use Clerk's `<UserButton />` component (includes sign-out, profile, etc.)
    - Or custom sign-out button using Clerk's `useClerk()` hook
  - Create server-side helpers in `src/lib/auth/clerk.ts`:
    - `getCurrentUser()` - Get current user from `auth()` helper (uses async/await)
    - `requireAuth()` - Helper to require authentication in server actions
    - Use Clerk's `auth()` function from `@clerk/nextjs/server` (must use async/await pattern)
  - Create protected server actions pattern:
    - Use `requireAuth()` helper in server actions
    - Validate user session before processing
  - Display user authentication state in UI:
    - Use Clerk's `<UserButton />` component
    - Use `<SignedIn>` and `<SignedOut>` components for conditional rendering
    - Or custom UI using `useUser()` hook from `@clerk/nextjs`
    - Style with shadcn/ui components
  - Handle authentication callbacks and redirects:
    - Configure redirect URLs in Clerk dashboard
    - Handle OAuth callbacks appropriately
  - Support session management and token refresh (handled automatically by Clerk)
  - Create user profile page (`src/app/profile/page.tsx`):
    - Display Clerk user information using `useUser()` hook
    - Style with shadcn/ui components (Card, Avatar, etc.)
  - Handle authentication errors gracefully:
    - Use shadcn/ui `Alert` component for error messages
    - Display user-friendly error messages

- **Data Requirements**:

  - Clerk manages user data externally (no local database tables needed for authentication)
  - Clerk user ID will be used as foreign key in future user profile table
  - Store Clerk user ID in session for server-side access

- **User Flow**:

  1. User visits the application
  2. If not authenticated, user sees sign-in/sign-up options
  3. User clicks "Sign Up" and provides email/password or chooses OAuth provider
  4. User completes authentication flow (email verification if required)
  5. User is redirected to the application with authenticated session
  6. User can access protected routes and features
  7. User can sign out, which clears the session
  8. After sign-out, user is redirected to public pages

- **Acceptance Criteria**:

  - Clerk SDK is installed and configured correctly (`@clerk/nextjs@latest`)
  - Clerk provider (`<ClerkProvider>`) is set up in root layout (`app/layout.tsx`)
  - Clerk middleware uses `clerkMiddleware()` (NOT deprecated `authMiddleware()`)
  - Middleware matcher pattern correctly skips Next.js internals and static files
  - Middleware always runs for API routes (`/api/*` and `/trpc/*`)
  - Sign-up flow works with email/password authentication using `<SignUpButton />` or `<SignUp />` components
  - Sign-in flow works for existing users using `<SignInButton />` or `<SignIn />` components
  - Conditional rendering works with `<SignedIn>` and `<SignedOut>` components
  - Sign-out functionality clears user session (via `<UserButton />` component or hooks)
  - Protected routes redirect unauthenticated users to sign-in page (via middleware)
  - Server actions can access current user via `auth()` helper from `@clerk/nextjs/server` (using async/await)
  - API routes can validate user sessions using Clerk's `auth()` helper (using async/await)
  - User authentication state is correctly displayed in UI (via `useUser()` hook, `<UserButton />`, `<SignedIn>`, `<SignedOut>`)
  - Session persists across page refreshes (handled by Clerk)
  - Authentication errors are displayed to users clearly (shadcn/ui Alert components)
  - OAuth providers work (if configured in Clerk dashboard)
  - UI components use shadcn/ui for consistent styling
  - Environment variables are stored in `.env.local` (not committed to git)
  - No deprecated patterns are used (no `_app.tsx`, no `pages/` directory, no `authMiddleware()`)
  - All Clerk imports are from `@clerk/nextjs` or `@clerk/nextjs/server` only

- **Edge Cases**:

  - User tries to sign up with existing email - should show appropriate error
  - User session expires - should redirect to sign-in with message
  - User tries to access protected route without authentication - should redirect
  - Network errors during authentication - should show retry option
  - Invalid email format - should validate before submission
  - Weak password - should enforce password requirements
  - OAuth callback failures - should handle gracefully

- **Non-Functional Requirements**:

  - **Security**: All authentication must use HTTPS in production
  - **Performance**: Authentication should not significantly impact page load times
  - **UX**: Authentication flows should be smooth and intuitive
  - **Reliability**: Should handle Clerk service outages gracefully
  - **Privacy**: Must comply with data protection regulations (GDPR, etc.)

- **Implementation Guidelines**:

  - **CRITICAL**: Use Next.js App Router approach only (folders like `app/page.tsx`, `app/layout.tsx`)
  - **DO NOT** use deprecated patterns:
    - Do NOT use `_app.tsx` (Pages Router pattern)
    - Do NOT use `pages/` directory structure for auth pages
    - Do NOT use deprecated `authMiddleware()` - use `clerkMiddleware()` instead
    - Do NOT use deprecated APIs like `withAuth` or old `currentUser` patterns
  - **Verification Checklist**:
    - Middleware uses `clerkMiddleware()` from `@clerk/nextjs/server`
    - `<ClerkProvider>` wraps app in `app/layout.tsx` (or `src/app/layout.tsx`)
    - All imports are from `@clerk/nextjs` or `@clerk/nextjs/server`
    - Using App Router structure (not Pages Router)
    - Environment variables are in `.env.local` with placeholder values in docs
    - `.gitignore` excludes `.env*` files
    - `auth()` helper uses async/await pattern
    - Only placeholder values (e.g., `YOUR_PUBLISHABLE_KEY`) in code examples/docs

- **Dependencies**:
  - Base Next.js Implementation (base-implementation.md)
