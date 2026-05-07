import { createLandingPreviewImage } from "../landing-preview-image";

export const dynamic = "force-static";

export function GET() {
  return createLandingPreviewImage();
}
