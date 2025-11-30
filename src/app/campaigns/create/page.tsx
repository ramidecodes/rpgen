import { db } from "@/lib/db";
import { universes } from "@/lib/db/schema";
import { CampaignCreationForm } from "@/components/campaign/campaign-creation-form";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export default async function CreateCampaignPage() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    redirect("/sign-in");
  }

  // We need the internal user ID to fetch their private universes
  // But for public universes, we don't strictly need it.
  // However, let's assume we fetch user's created universes AND public ones.
  // For MVP, let's just fetch all public universes + user's own private ones.
  
  // Ideally we need to resolve clerkUserId to internal ID first.
  // Or just fetch all public ones for now to simplify or use a query that joins user profile.
  
  // Let's assume we want to show universes the user can play in.
  // This includes:
  // 1. Their own universes
  // 2. Public universes created by others (maybe limit to popular ones later)
  // 3. Official premade universes (if any)

  // Since we don't have a handy "getUserUniverses" yet, let's do a direct query here
  // or create a query function. Direct query for now.

  // First get internal user id? No, we can join userProfiles to filter by clerkId if needed,
  // but `universes` table uses internal uuid.
  
  // Let's look up the user profile first.
  const userProfile = await db.query.userProfiles.findFirst({
      where: (userProfiles, { eq }) => eq(userProfiles.clerkUserId, clerkUserId)
  });

  if (!userProfile) {
      // Handle case where user profile doesn't exist yet (should exist if they passed auth middleware usually)
      redirect("/sign-in"); 
  }

  const availableUniverses = await db
    .select({
      id: universes.id,
      name: universes.name,
      description: universes.description
    })
    .from(universes)
    .where(
        eq(universes.userId, userProfile.id)
        // We can add OR isPublic later
    );
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-12 md:py-20 bg-muted/30">
        <div className="container px-4 md:px-6">
          <CampaignCreationForm universes={availableUniverses} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

