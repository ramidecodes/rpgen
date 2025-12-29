"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CookieConsent = {
  essential: true;
  functional: boolean;
  timestamp: number;
};

const COOKIE_CONSENT_KEY = "cookie-consent";

const getStoredConsent = (): CookieConsent | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "essential" in parsed &&
      "functional" in parsed &&
      "timestamp" in parsed
    ) {
      const value = parsed as {
        essential: unknown;
        functional: unknown;
        timestamp: unknown;
      };

      if (value.essential === true && typeof value.functional === "boolean") {
        return {
          essential: true,
          functional: value.functional,
          timestamp:
            typeof value.timestamp === "number" ? value.timestamp : Date.now(),
        };
      }
    }

    return null;
  } catch {
    return null;
  }
};

const storeConsent = (functional: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  const consent: CookieConsent = {
    essential: true,
    functional,
    timestamp: Date.now(),
  };

  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Ignore storage errors (e.g., private mode)
  }
};

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);

    const consent = getStoredConsent();
    if (!consent) {
      setShowBanner(true);
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === COOKIE_CONSENT_KEY) {
        const updated = getStoredConsent();
        setShowBanner(!updated);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  if (!mounted || !showBanner) {
    return null;
  }

  const handleChoice = (functional: boolean) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    storeConsent(functional);
    setShowBanner(false);
    setIsSubmitting(false);
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 sm:pb-6">
      <Alert
        className={cn(
          "pointer-events-auto flex max-w-4xl flex-col gap-2 rounded-xl border shadow-xl transition-transform duration-300 ease-out",
          "translate-y-0"
        )}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="space-y-0.5">
            <AlertTitle>We use cookies to enhance your adventure</AlertTitle>
            <AlertDescription className="text-sm">
              We use essential cookies to keep RPGen running (authentication and
              session management). With your permission, we also use functional
              cookies to remember things like your theme and preferences. You
              can learn more in our{" "}
              <Link href="/privacy" className="underline underline-offset-4">
                privacy policy
              </Link>
              .
            </AlertDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:min-w-[220px] sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleChoice(false)}
              className="hover:cursor-pointer"
            >
              Reject non-essential
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleChoice(true)}
              className="hover:cursor-pointer"
            >
              Accept all
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
}
