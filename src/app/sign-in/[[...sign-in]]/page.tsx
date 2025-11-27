import { SignIn } from "@clerk/nextjs"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Sign In</CardTitle>
          <CardDescription>
            Sign in to your account to continue your adventure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignIn
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border-0",
                headerTitle: "font-title",
              },
            }}
          />
        </CardContent>
      </Card>
    </main>
  )
}
