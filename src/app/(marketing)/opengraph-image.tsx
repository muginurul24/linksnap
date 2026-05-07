import {
  createLandingPreviewImage,
  landingPreviewSize,
} from "./landing-preview-image";

export const alt = "LinkSnap campaign dashboard preview";
export const size = landingPreviewSize;
export const contentType = "image/png";

export default function Image() {
  return createLandingPreviewImage();
}
