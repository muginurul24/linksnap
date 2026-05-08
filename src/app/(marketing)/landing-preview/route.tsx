import { createLandingPreviewImage } from "@/app/(marketing)/landing-preview-image";

export const dynamic = "force-static";

export function GET() {
  return createLandingPreviewImage();
}
