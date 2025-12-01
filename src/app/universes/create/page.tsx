"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TimeframeEnum,
  MagicLevelEnum,
  PhysicsEnum,
  MetaphysicsEnum,
  SocialStructureEnum,
  type CreateUniverseInput,
} from "@/lib/db/schemas/universe";
import { createUniverseAction } from "@/app/actions/universe";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles } from "lucide-react";

export default function CreateUniversePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultValues: CreateUniverseInput = {
    ontology: {
      timeframe: "Medieval",
      magicLevel: "Rare (Ritualistic)",
      physics: "Hard Physics",
      metaphysics: "Materialist (No Gods)",
      socialStructure: "Feudal",
    },
    additionalPrompts: "",
    isPublic: false,
  };

  const [formData, setFormData] = useState<CreateUniverseInput>(defaultValues);

  const handleSelectChange = (
    category: keyof CreateUniverseInput["ontology"],
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      ontology: {
        ...prev.ontology,
        [category]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createUniverseAction(formData);

      if (!result.success) {
        throw new Error(result.error || "Failed to create universe");
      }

      router.push("/universes");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-primary">
          Forge a New Universe
        </h1>
        <p className="text-muted-foreground">
          Define the fundamental laws of reality, and let the cosmos take shape.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle>Ontological Parameters</CardTitle>
          <CardDescription>
            Select the core axioms that define this reality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select
                value={formData.ontology.timeframe}
                onValueChange={(val) => handleSelectChange("timeframe", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TimeframeEnum.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Magic Level</Label>
              <Select
                value={formData.ontology.magicLevel}
                onValueChange={(val) => handleSelectChange("magicLevel", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MagicLevelEnum.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Physics Reality</Label>
              <Select
                value={formData.ontology.physics}
                onValueChange={(val) => handleSelectChange("physics", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PhysicsEnum.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Metaphysics</Label>
              <Select
                value={formData.ontology.metaphysics}
                onValueChange={(val) => handleSelectChange("metaphysics", val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MetaphysicsEnum.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Social Structure</Label>
              <Select
                value={formData.ontology.socialStructure}
                onValueChange={(val) =>
                  handleSelectChange("socialStructure", val)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SocialStructureEnum.options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="additionalPrompts">
              Additional Description (Optional)
            </Label>
            <Textarea
              id="additionalPrompts"
              placeholder="Describe specific themes, factions, or any other details you'd like to see in this universe..."
              value={formData.additionalPrompts || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  additionalPrompts: e.target.value,
                }))
              }
              className="h-32"
            />
            <p className="text-xs text-muted-foreground">
              The AI will use this description to guide the generation of
              history, factions, and locations.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="public-mode"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, isPublic: checked }))
              }
            />
            <Label htmlFor="public-mode" className="cursor-pointer">
              Make this universe Public (visible to community)
            </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            size="lg"
            className="w-full text-lg gap-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating Universe...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Universe
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
