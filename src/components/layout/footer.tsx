import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <nav className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground text-sm transition-colors hover:text-foreground"
          >
            Terms of Service
          </Link>
        </nav>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Rami Labs. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
