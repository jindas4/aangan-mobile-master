// expo-video and expo-video-thumbnails are native modules: an app binary built
// before they were added doesn't have them, and an over-the-air update can
// still reach it. Load them only if present; callers fall back (open the video
// in the browser, upload without a cover image).
let video: typeof import("expo-video") | null = null;
let thumbs: typeof import("expo-video-thumbnails") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { requireOptionalNativeModule } = require("expo-modules-core");
  if (requireOptionalNativeModule("ExpoVideo")) video = require("expo-video");
  if (requireOptionalNativeModule("ExpoVideoThumbnails")) thumbs = require("expo-video-thumbnails");
} catch {
  video = null;
  thumbs = null;
}

export const expoVideo = video;
export const videoThumbnails = thumbs;
