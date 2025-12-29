import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center">
        <div className="container">
          <div className="mx-auto max-w-2xl">
            <Card className="border-glow/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="text-center">
                <CardTitle className="mb-4 font-semibold font-title text-6xl md:text-7xl">
                  404
                </CardTitle>
                <CardDescription className="text-muted-foreground text-lg">
                  The page you're looking for doesn't exist
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <p className="text-muted-foreground">
                  The resource you're trying to access may have been moved,
                  deleted, or never existed. Return to one of these pages to
                  continue your adventure.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
                  <Button
                    asChild
                    size="lg"
                    className="glow-border border-2 border-glow bg-background/80 px-6 py-5 font-title text-foreground tracking-wider backdrop-blur-sm transition-all duration-300 hover:bg-glow/20"
                  >
                    <Link href="/">Home</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-glow/20 px-6 py-5 font-title tracking-wider transition-all duration-300 hover:border-glow/40 hover:bg-glow/10"
                  >
                    <Link href="/runs">Runs</Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-glow/20 px-6 py-5 font-title tracking-wider transition-all duration-300 hover:border-glow/40 hover:bg-glow/10"
                  >
                    <Link href="/campaigns">Campaigns</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
