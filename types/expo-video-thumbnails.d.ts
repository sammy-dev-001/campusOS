declare module 'expo-video-thumbnails' {
  // Minimal typings to satisfy TS; runtime handled via dynamic import in code
  export function getThumbnailAsync(
    sourceFilename: string,
    options?: { time?: number; headers?: Record<string, string> }
  ): Promise<{ uri: string }>;
}
