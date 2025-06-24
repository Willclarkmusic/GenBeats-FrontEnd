/**
 * Utility to dynamically scan for video files in the public/art folder
 * Uses multiple approaches to detect video files automatically
 */

// Utility function to get video URL with fallbacks
const getVideoUrl = (filename: string): string => {
  // Try multiple possible paths for production builds
  const possiblePaths = [
    `/art/${encodeURIComponent(filename)}`,
    `/assets/art/${encodeURIComponent(filename)}`,
    `./art/${encodeURIComponent(filename)}`,
    `../art/${encodeURIComponent(filename)}`,
  ];

  // For now, return the original path, but log for debugging
  console.log("Attempting to load video from:", possiblePaths[0]);
  return possiblePaths[0];
};

export const scanForVideos = async (): Promise<string[]> => {
  try {
    // Method 1: Try to get a list from a potential API endpoint
    // This would require a server endpoint, but we'll try it first
    try {
      const response = await fetch("/api/videos", { method: "GET" });
      if (response.ok) {
        const videos = await response.json();
        const videoPaths = videos.map((video: string) => getVideoUrl(video));
        console.log("Videos from API:", videoPaths);
        return videoPaths;
      }
    } catch (error) {
      console.log("No API endpoint found, using fallback method");
    }

    // Method 2: Only check for the known existing video files
    const knownVideos = ["RoofStudy.mp4", "RoofStudy2.mp4", "study_cat1.mp4"];

    const existingVideos: string[] = [];

    // Test each known video file
    for (const videoFile of knownVideos) {
      try {
        const videoUrl = getVideoUrl(videoFile);
        const response = await fetch(videoUrl, {
          method: "HEAD",
          cache: "no-cache",
        });

        if (response.ok) {
          existingVideos.push(videoUrl);
          console.log("Found video:", videoUrl);
        } else {
          console.log("Video not found:", videoUrl, response.status);
        }
      } catch (error) {
        console.log(`Video ${videoFile} not found:`, error);
      }
    }

    console.log("Found videos:", existingVideos);
    return existingVideos.length > 0
      ? existingVideos
      : [getVideoUrl("study_cat1.mp4")];
  } catch (error) {
    console.error("Error scanning for videos:", error);
    return [getVideoUrl("study_cat1.mp4")];
  }
};

/**
 * Get a random video from the available videos, avoiding the current one if possible
 */
export const getRandomVideo = (
  availableVideos: string[],
  currentVideo: string
): string => {
  if (availableVideos.length === 0) return currentVideo;
  if (availableVideos.length === 1) return availableVideos[0];

  // Filter out the current video to avoid selecting the same one
  const otherVideos = availableVideos.filter((video) => video !== currentVideo);

  // If no other videos available, return current video
  if (otherVideos.length === 0) return currentVideo;

  // Return a random video from the filtered list
  return otherVideos[Math.floor(Math.random() * otherVideos.length)];
};
