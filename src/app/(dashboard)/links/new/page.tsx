import { ArrowLeft } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { CreateLinkForm } from "../link-form";

export default function NewLinkPage() {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Link</h1>
          <p className="text-sm text-muted-foreground">
            Shorten a destination and prepare optional routing settings.
          </p>
        </div>
        <ButtonLink href="/links" size="sm" variant="outline">
          <ArrowLeft className="size-4" />
          Back
        </ButtonLink>
      </div>

      <CreateLinkForm />
    </>
  );
}
