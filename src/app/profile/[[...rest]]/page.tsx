"use client";

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
import { UserProfile, useUser } from "@clerk/nextjs";

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
              Profile Settings
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
                  <CardTitle>Manage Account</CardTitle>
                  <CardDescription>
                    Update your email, password, and security settings
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
                          navbar: "hidden", // Hide navbar to keep it simple/embedded
                        },
                      }}
                    />
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
