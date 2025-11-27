"use client"

import { UserButton, UserProfile, useUser } from "@clerk/nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ProfilePage() {
  const { user, isLoaded } = useUser()

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-muted/20 py-12 md:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="font-bold text-3xl tracking-tight">Profile</h1>
          <UserButton />
        </div>

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
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20 border-2 border-muted">
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
                  <p className="text-muted-foreground text-sm">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                  {user?.username && (
                    <p className="text-muted-foreground text-xs">
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
                <p className="text-muted-foreground text-sm">
                  This section will be used for game-specific profile data
                  stored in our database, such as preferences, game settings,
                  and player statistics.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
