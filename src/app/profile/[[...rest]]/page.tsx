"use client";

import { UserProfile, useUser } from "@clerk/nextjs";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ProfilePage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-8 font-bold text-3xl tracking-tight md:text-4xl">
              Profile
            </h1>

            <div className="space-y-8">
              {/* Clerk Profile Information Display */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>
                    Your Clerk-managed account details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Avatar className="size-20 border-2 border-muted">
                      <AvatarImage
                        src={user?.imageUrl}
                        alt={user?.fullName || "User"}
                      />
                      <AvatarFallback className="text-xl">
                        {user?.firstName?.[0] ||
                          user?.emailAddresses[0]?.emailAddress[0] ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="font-semibold text-xl leading-none">
                        {user?.fullName || "No name set"}
                      </p>
                      <p className="text-muted-foreground">
                        {user?.primaryEmailAddress?.emailAddress}
                      </p>
                      {user?.username && (
                        <p className="text-muted-foreground text-sm">
                          @{user.username}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clerk UserProfile Component for Management */}
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>Manage Profile</CardTitle>
                  <CardDescription>
                    Update your email, password, and other account settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex justify-center bg-card">
                    <UserProfile
                      path="/profile"
                      routing="path"
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "shadow-none border-0 w-full max-w-none",
                          pageScrollBox: "p-6",
                          formButtonPrimary:
                            "bg-primary text-primary-foreground hover:bg-primary/90",
                          formFieldInput:
                            "bg-background border-input text-foreground",
                          formFieldLabel: "text-foreground",
                          cardBox: "bg-card text-card-foreground",
                          headerTitle: "text-card-foreground font-title",
                          headerSubtitle: "text-muted-foreground",
                          identityPreviewText: "text-foreground",
                          identityPreviewEditButton: "text-muted-foreground",
                          formButtonReset: "text-muted-foreground",
                          footerActionLink: "text-primary",
                          navbarButton: "text-muted-foreground",
                          navbarButtonActive: "text-foreground",
                        },
                        variables: {
                          colorPrimary: "hsl(var(--primary))",
                          colorText: "hsl(var(--foreground))",
                          colorTextSecondary: "hsl(var(--muted-foreground))",
                          colorBackground: "hsl(var(--background))",
                          colorInputBackground: "hsl(var(--background))",
                          colorInputText: "hsl(var(--foreground))",
                          borderRadius: "0.5rem",
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Placeholder for Future Application-Specific Profile Fields */}
              <Card>
                <CardHeader>
                  <CardTitle>Game Profile</CardTitle>
                  <CardDescription>
                    Application-specific profile settings (coming soon)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md bg-muted p-6 text-center">
                    <p className="text-muted-foreground">
                      This section will be used for game-specific profile data
                      stored in our database, such as preferences, game
                      settings, and player statistics.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
