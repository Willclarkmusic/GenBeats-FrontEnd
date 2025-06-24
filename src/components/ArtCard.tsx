import * as motion from "motion/react-client";
import { useState, useEffect, useRef } from "react";
import { IoReload } from "react-icons/io5";
import { scanForVideos, getRandomVideo } from "../utils/videoScanner";

interface ArtCardProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export const ArtCard = ({ containerRef }: ArtCardProps) => {
  const [art, setArt] = useState<string>("/art/study_cat1.mp4");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [availableVideos, setAvailableVideos] = useState<string[]>([]);
  const [videoError, setVideoError] = useState<boolean>(false);
  const autoReloadIntervalRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  const loadAvailableVideos = async () => {
    try {
      const videos = await scanForVideos();
      setAvailableVideos(videos);
      console.log("Available videos loaded:", videos.length);

      if (videos.length > 0 && !art) {
        setArt(videos[0]);
      }
    } catch (error) {
      console.error("Error scanning for videos:", error);
      // Fallback to default video
      setAvailableVideos(["/art/RoofStudy2.mp4"]);
    }
  };

  const reloadArt = () => {
    if (availableVideos.length === 0) return;

    setIsLoading(true);
    setVideoError(false);

    const randomVideo = getRandomVideo(availableVideos, art);
    console.log("Loading new video:", randomVideo);
    setArt(randomVideo);

    // Add a small delay to show loading state
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  // Handle video loading events
  const handleVideoLoad = () => {
    console.log("Video loaded successfully:", art);
    setVideoError(false);
    setIsLoading(false);
  };

  const handleVideoError = (
    e: React.SyntheticEvent<HTMLVideoElement, Event>
  ) => {
    console.error("Video failed to load:", art, e);
    setVideoError(true);
    setIsLoading(false);

    // Try to load a different video if this one fails
    setTimeout(() => {
      if (availableVideos.length > 1) {
        reloadArt();
      }
    }, 1000);
  };

  // Scan for available videos on component mount
  useEffect(() => {
    loadAvailableVideos();
  }, []);

  // Load a random video once we have available videos
  useEffect(() => {
    if (availableVideos.length > 0) {
      reloadArt();
    }
  }, [availableVideos]);

  // Set up automatic reload every 10 minutes
  useEffect(() => {
    // Start the auto-reload timer (10 minutes = 600,000 milliseconds)
    autoReloadIntervalRef.current = window.setInterval(() => {
      console.log("Auto-reloading art...");
      reloadArt();
    }, 600000); // 10 minutes

    // Cleanup function to clear the interval when component unmounts
    return () => {
      if (autoReloadIntervalRef.current) {
        window.clearInterval(autoReloadIntervalRef.current);
      }
    };
  }, [availableVideos]); // Re-run when availableVideos changes

  return (
    <motion.div
      drag={!isMobile}
      dragConstraints={containerRef}
      dragElastic={0.2}
      className="h-[40vh] md:h-[50vh] min-w-[200px] w-[100vw] md:w-[45vw] bg-white/30  backdrop-blur-lg border-1 rounded-md p-4"
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className=" rounded-full h-12 w-12 border-b-2 border-white">
            <IoReload className="animate-spin" />
          </div>
        </div>
      )}
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <p>Video failed to load</p>
            <button
              onClick={reloadArt}
              className="mt-2 px-4 py-2 bg-blue-500 rounded"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div className="absolute bottom-5 left-5 z-15">
        <button onClick={reloadArt} className="hover:cursor-pointer">
          <IoReload className="text-white text-2xl" />
        </button>
      </div>
      {/* Video */}
      <video
        ref={videoRef}
        src={art}
        autoPlay
        muted
        loop
        playsInline
        onLoadStart={() => console.log("Video load started:", art)}
        onLoadedData={handleVideoLoad}
        onError={handleVideoError}
        className="object-cover absolute h-full w-full z-10 top-0 left-0"
      />

      {/* Content */}
    </motion.div>
  );
};
