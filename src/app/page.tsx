import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <div className="mb-8 flex w-full items-center justify-between">
          <h1 className="font-bold text-4xl">Generative Deep Neural Dungeon</h1>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>

        <SignedIn>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Welcome back! Your AI-driven RPG adventure awaits.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/profile">View Profile</Link>
              </Button>
            </div>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground">
              Welcome to your AI-driven RPG adventure. Sign in to get started!
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sign-up">Sign Up</Link>
              </Button>
            </div>
          </div>
        </SignedOut>
      </div>
    </main>
  )
}
