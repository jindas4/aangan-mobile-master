// Remote image with size-variant loading + graceful fallback.
//
// Requests the resized WebP variant (thumb/medium/large) instead of the
// original upload — on 4G that's ~100 KB instead of a multi-MB camera photo.
// If the variant 404s (worker still rendering, or an old image), falls back
// to the original URL so the tile never goes blank. Given a `blur` preview, it
// is shown immediately so the frame is never empty while the photo downloads.
import { useEffect, useState } from "react";
import { Image, ImageProps } from "expo-image";
import { imageUrl, imageVariantUrl } from "@/lib/format";

type Props = Omit<ImageProps, "source" | "onError"> & {
  /** Raw URL as stored on the API object (absolute, relative, or scene://). */
  url: string;
  size?: "thumb" | "medium" | "large";
  /** Tiny data: URI preview of the photo, shown (soft and stretched) until the real one has loaded. */
  blur?: string | null;
};

export function RemoteImage({ url, size = "medium", blur, ...rest }: Props) {
  const original = imageUrl(url);
  const [src, setSrc] = useState(() => imageVariantUrl(original, size));
  useEffect(() => {
    setSrc(imageVariantUrl(original, size));
  }, [original, size]);

  if (!original) return null;
  return (
    <Image
      // A 20-pixel image stretched to fill the frame reads as a blur; the real
      // photo cross-fades over it.
      placeholder={blur && blur.startsWith("data:image/") ? { uri: blur } : undefined}
      placeholderContentFit="cover"
      transition={blur ? 250 : undefined}
      {...rest}
      source={{ uri: src }}
      onError={() => {
        if (src !== original) setSrc(original);
      }}
    />
  );
}
