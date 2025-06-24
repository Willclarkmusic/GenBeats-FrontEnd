import * as motion from "motion/react-client";
import React, { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

import {
  GrPlay,
  GrPause,
  GrChapterNext,
  GrChapterPrevious,
} from "react-icons/gr";
import { BiLoader } from "react-icons/bi";

interface AudioCardProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface Song {
  title: string;
  filename: string;
  duration?: number;
}

function getRandomSong(exclude: Song[], pool: Song[]): Song {
  const filtered = pool.filter(
    (s) => !exclude.some((e) => e.filename === s.filename)
  );
  return filtered[Math.floor(Math.random() * filtered.length)];
}

export const AudioCard = ({ containerRef }: AudioCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // New state for prev, current, next
  const [prevSongs, setPrevSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [nextSongs, setNextSongs] = useState<Song[]>([]);

  const playerRef = useRef<Tone.Player | null>(null);
  const volumeRef = useRef<Tone.Volume | null>(null);
  const intervalRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const songListRef = useRef<HTMLDivElement>(null);
  const currentSongRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 768px)").matches;

  // Initialize Tone.js player with volume control
  useEffect(() => {
    volumeRef.current = new Tone.Volume(0).toDestination();
    playerRef.current = new Tone.Player().connect(volumeRef.current);

    // Test audio file accessibility
    const testAudioAccess = async () => {
      try {
        const testUrl = getAudioUrl("GeneratedTrack_1.mp3");
        const response = await fetch(testUrl, { method: "HEAD" });
        console.log(
          "Audio file accessibility test:",
          response.ok ? "SUCCESS" : "FAILED",
          testUrl
        );
        if (!response.ok) {
          console.error(
            "Audio files may not be accessible in production build"
          );
          // Try alternative paths
          const altPaths = [
            "/assets/audio/GeneratedTrack_1.mp3",
            "./audio/GeneratedTrack_1.mp3",
            "../audio/GeneratedTrack_1.mp3",
          ];
          for (const path of altPaths) {
            try {
              const altResponse = await fetch(path, { method: "HEAD" });
              console.log(
                "Alternative path test:",
                altResponse.ok ? "SUCCESS" : "FAILED",
                path
              );
            } catch (e) {
              console.log("Alternative path failed:", path, e);
            }
          }
        }
      } catch (error) {
        console.error("Audio file accessibility test failed:", error);
      }
    };

    testAudioAccess();

    return () => {
      if (playerRef.current) playerRef.current.dispose();
      if (volumeRef.current) volumeRef.current.dispose();
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  // On mount, initialize prev, current, next with unique songs
  useEffect(() => {
    const shuffled = [...songPool].sort(() => Math.random() - 0.5);
    setPrevSongs(shuffled.slice(0, 2));
    setCurrentSong(shuffled[2]);
    setNextSongs(shuffled.slice(3, 6));
  }, []);

  // Update current time display
  useEffect(() => {
    if (isPlaying && playerRef.current) {
      intervalRef.current = window.setInterval(() => {
        if (playerRef.current) {
          const elapsed =
            playerRef.current.context.currentTime - startTimeRef.current;
          if (duration > 0 && elapsed >= duration) {
            // Don't reset currentTime to 0, let it stay at duration
            setCurrentTime(duration);
            handleNext();
          } else {
            setCurrentTime(Math.max(0, Math.min(elapsed, duration)));

            // Start fade out 1.5 seconds before the end
            if (volumeRef.current && duration > 0) {
              const timeLeft = duration - elapsed;
              if (timeLeft <= 1.5 && timeLeft > 0) {
                // Calculate fade volume (1.0 to 0.0 over 1.5 seconds)
                const fadeVolume = timeLeft / 1.5;
                volumeRef.current.volume.value = Tone.gainToDb(fadeVolume);
              } else if (timeLeft > 1.5) {
                // Reset volume to full when not fading
                volumeRef.current.volume.value = 0; // 0dB = full volume
              }
            }
          }
        }
      }, 100);
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, duration]);

  // Scroll to current song when it changes
  useEffect(() => {
    if (currentSongRef.current && songListRef.current) {
      const container = songListRef.current;
      const currentSongElement = currentSongRef.current;

      if (container && currentSongElement) {
        const scrollTop =
          currentSongElement.offsetTop -
          container.offsetTop -
          container.clientHeight / 2 +
          currentSongElement.clientHeight / 2;

        container.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [currentSong]);

  // Utility function to get audio URL with fallbacks
  const getAudioUrl = (filename: string): string => {
    // Try multiple possible paths for production builds
    const possiblePaths = [
      `/audio/${encodeURIComponent(filename)}`,
      `/assets/audio/${encodeURIComponent(filename)}`,
      `./audio/${encodeURIComponent(filename)}`,
      `../audio/${encodeURIComponent(filename)}`,
    ];

    // For now, return the original path, but log for debugging
    console.log("Attempting to load audio from:", possiblePaths[0]);
    return possiblePaths[0];
  };

  // Play a song
  const loadAndPlaySong = async (song: Song) => {
    if (!playerRef.current) return;
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    try {
      await playerRef.current.stop();
      const audioUrl = getAudioUrl(song.filename);
      console.log("Loading audio file:", audioUrl);

      await playerRef.current.load(audioUrl);
      if (playerRef.current.buffer) {
        setDuration(playerRef.current.buffer.duration);
        console.log(
          "Audio loaded successfully, duration:",
          playerRef.current.buffer.duration
        );
      } else {
        console.error("Failed to load audio buffer for:", song.filename);
        throw new Error("Audio buffer not loaded");
      }

      // Reset volume to full
      if (volumeRef.current) {
        volumeRef.current.volume.value = 0; // 0dB = full volume
      }

      await Tone.start();
      await playerRef.current.start();
      setIsPlaying(true);
      setCurrentTime(0);
      if (playerRef.current) {
        startTimeRef.current = playerRef.current.context.currentTime;
      }

      // Start fade in
      if (volumeRef.current) {
        volumeRef.current.volume.setValueAtTime(
          Tone.gainToDb(0),
          playerRef.current.context.currentTime
        ); // Start at 0 volume
        volumeRef.current.volume.linearRampToValueAtTime(
          0,
          playerRef.current.context.currentTime + 2.0
        ); // Fade to full volume over 2.0s
      }
    } catch (error) {
      console.error("Error loading song:", song.filename, error);
      // Try to recover by moving to next song
      setTimeout(() => {
        handleNext();
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // When currentSong changes, load it but do not autoplay
  useEffect(() => {
    const loadSong = async () => {
      if (!playerRef.current || !currentSong) return;
      setIsLoading(true);
      try {
        await playerRef.current.stop();
        const audioUrl = getAudioUrl(currentSong.filename);
        console.log("Loading song for preview:", audioUrl);

        await playerRef.current.load(audioUrl);
        if (playerRef.current.buffer) {
          setDuration(playerRef.current.buffer.duration);
        } else {
          console.error(
            "Failed to load audio buffer for preview:",
            currentSong.filename
          );
        }

        // Reset volume to full
        if (volumeRef.current) {
          volumeRef.current.volume.value = 0; // 0dB = full volume
        }

        setCurrentTime(0);
      } catch (error) {
        console.error(
          "Error loading song for preview:",
          currentSong.filename,
          error
        );
      } finally {
        setIsLoading(false);
      }
    };
    if (currentSong) {
      if (!isPlaying) {
        loadSong();
      } else {
        loadAndPlaySong(currentSong);
      }
    }
    // eslint-disable-next-line
  }, [currentSong]);

  // Next song logic
  const handleNext = () => {
    if (!currentSong || nextSongs.length === 0) return;
    const newPrev = [...prevSongs, currentSong];
    if (newPrev.length > 2) newPrev.shift();
    const newCurrent = nextSongs[0];
    const exclude = [...newPrev, newCurrent, ...nextSongs.slice(1)];
    const newNext = [...nextSongs.slice(1), getRandomSong(exclude, songPool)];
    setPrevSongs(newPrev);
    setCurrentSong(newCurrent);
    setNextSongs(newNext);
  };

  // Previous song logic
  const handlePrevious = () => {
    if (!currentSong || prevSongs.length === 0) return;
    const newNext = [currentSong, ...nextSongs];
    if (newNext.length > 3) newNext.pop();
    const newCurrent = prevSongs[prevSongs.length - 1];
    const exclude = [...prevSongs.slice(0, -1), newCurrent, ...newNext];
    const newPrev = [
      getRandomSong(exclude, songPool),
      ...prevSongs.slice(0, -1),
    ];
    setPrevSongs(newPrev);
    setCurrentSong(newCurrent);
    setNextSongs(newNext);
  };

  // Only play when user presses play
  const togglePlayPause = async () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      await playerRef.current.stop();
      setIsPlaying(false);
      // Don't reset currentTime when pausing
    } else {
      if (playerRef.current.loaded) {
        // Resume from current position
        await playerRef.current.start(0, currentTime);
        startTimeRef.current =
          playerRef.current.context.currentTime - currentTime;
        setIsPlaying(true);

        // Start fade in
        if (volumeRef.current) {
          volumeRef.current.volume.setValueAtTime(
            0,
            playerRef.current.context.currentTime
          ); // Start at 0 volume
          volumeRef.current.volume.linearRampToValueAtTime(
            1,
            playerRef.current.context.currentTime + 2.0
          ); // Fade to full volume over 2.0s
        }
      } else if (currentSong) {
        await loadAndPlaySong(currentSong);
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      drag={!isMobile}
      dragConstraints={containerRef}
      dragElastic={0.1}
      className="flex flex-col w-[90vw] md:min-w-[350px] md:w-[20vw] z-10 bg-white/30 bg-opacity-10 backdrop-blur-lg border-1 rounded-sm p-4"
    >
      <div className="flex items-center justify-center mb-4">
        <button
          onClick={handlePrevious}
          className="text-4xl hover:text-blue-400 transition-colors cursor-pointer"
          disabled={isLoading || prevSongs.length === 0}
        >
          <GrChapterPrevious />
        </button>
        <button
          onClick={togglePlayPause}
          className="text-6xl p-6 hover:text-blue-400 transition-colors cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-ping rounded-full h-15 w-15">
              <BiLoader className="animate-spin" />
            </div>
          ) : isPlaying ? (
            <GrPause />
          ) : (
            <GrPlay />
          )}
        </button>
        <button
          onClick={handleNext}
          className="text-4xl hover:text-blue-400 transition-colors cursor-pointer"
          disabled={isLoading || nextSongs.length === 0}
        >
          <GrChapterNext />
        </button>
      </div>

      {/* Current song info */}
      <div className="text-center mb-4">
        <h3 className="font-semibold text-white mb-2">{currentSong?.title}</h3>
        <div className="text-sm text-gray-300">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-[95%] mx-auto bg-gray-700 rounded-full h-2 mb-4 relative">
        <div
          ref={progressBarRef}
          className="relative w-full h-full cursor-pointer"
          onClick={(e) => {
            if (!progressBarRef.current || !playerRef.current || !duration)
              return;

            const rect = progressBarRef.current.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const progressBarWidth = rect.width;
            const newTime = (clickX / progressBarWidth) * duration;

            // Clamp to valid range
            const clampedTime = Math.max(0, Math.min(newTime, duration));

            // Update player position
            if (playerRef.current.loaded) {
              if (isPlaying) {
                playerRef.current.stop();
                playerRef.current.start(0, clampedTime);
                startTimeRef.current =
                  playerRef.current.context.currentTime - clampedTime;
              } else {
                startTimeRef.current =
                  playerRef.current.context.currentTime - clampedTime;
              }
            }

            setCurrentTime(clampedTime);
          }}
        >
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-100"
            style={{
              width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Song list with fade overlays */}
      <div className="relative">
        <div
          className="overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)",
          }}
        >
          <SongList
            ref={songListRef}
            songs={[
              ...prevSongs,
              ...(currentSong ? [currentSong] : []),
              ...nextSongs,
            ]}
            currentSongIndex={2}
            currentSongRef={currentSongRef}
          />
        </div>
      </div>
    </motion.div>
  );
};

interface SongListProps {
  songs: Song[];
  currentSongIndex: number;
  currentSongRef: React.RefObject<HTMLDivElement | null>;
}

const SongList = React.forwardRef<HTMLDivElement, SongListProps>(
  ({ songs, currentSongIndex, currentSongRef }, ref) => {
    return (
      <div ref={ref} className="max-h-48 overflow-y-hidden scroll-smooth">
        {songs.map((song, index) => (
          <SongListItem
            key={`${song.filename}-${index}`}
            song={song}
            isActive={index === currentSongIndex}
            ref={index === currentSongIndex ? currentSongRef : undefined}
          />
        ))}
      </div>
    );
  }
);

SongList.displayName = "SongList";

interface SongListItemsProps {
  song: Song;
  isActive: boolean;
}

const SongListItem = React.forwardRef<HTMLDivElement, SongListItemsProps>(
  ({ song, isActive }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ y: 20 }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.3,
          ease: "easeOut",
          scale: { duration: 0.2 },
        }}
        className={`flex flex-col border border-gray-200 rounded-sm my-1 overflow-hidden ${
          isActive ? "bg-blue-500/20" : "bg-gray-100/20"
        }`}
      >
        <div className="p-1 bg-wite/20">
          <p className="w-full overflow-y-hidden h-5 text-g,ray-800 text-sm my-1 px-4">
            {song.title}
          </p>{" "}
        </div>
      </motion.div>
    );
  }
);

SongListItem.displayName = "SongListItem";

// Example song pool (replace with your dynamic song list)
const songPool: Song[] = [
  { title: "Simple Beats", filename: "GeneratedTrack_3.mp3" },
  { title: "Time Out Parade", filename: "GeneratedTrack_2.mp3" },
  { title: "Life Is Beautiful", filename: "GeneratedTrack_1.mp3" },
  { title: "Vaporwave", filename: "Vaporwave.mp3" },
  { title: "Lost In Thought", filename: "LostInThought.mp3" },
  { title: "Sunset Drive", filename: "SunsetDrive.mp3" },
  { title: "Galactic Groove", filename: "GalacticGroove.mp3" },
  { title: "Serene Soundscape", filename: "SereneSoundscape.mp3" },
  { title: "Zero Gravity", filename: "ZeroGravity.mp3" },
  { title: "Wavy", filename: "Wavy.mp3" },
  { title: "Sunday Morning", filename: "SundayMorning.mp3" },
  { title: "Afternoon Nap", filename: "AfternoonNap.mp3" },
  { title: "Mellow Morning", filename: "MellowMorning.mp3" },
  { title: "Parisian Stroll", filename: "ParisianStroll.mp3" },
  { title: "Morning Coffee", filename: "MorningCoffee.mp3" },
  { title: "Smooth Sailing", filename: "SmoothSailing.mp3" },
  { title: "Nostalgic Vibes", filename: "NostalgicVibes.mp3" },
  { title: "Tranquil Track", filename: "TranquilTrack.mp3" },
  { title: "Starlight Whisper", filename: "StarlightWhisper.mp3" },
  { title: "Chilled Cow", filename: "ChilledCow.mp3" },
  { title: "Daydream Disco", filename: "DaydreamDisco.mp3" },
  { title: "Eclipse Ease", filename: "EclipseEase.mp3" },
  { title: "Peaceful Mind", filename: "PeacefulMind.mp3" },
  { title: "Wanderlust", filename: "Wanderlust.mp3" },
  { title: "Cali Vibes", filename: "CaliVibes.mp3" },
  { title: "Moscow Mood", filename: "MoscowMood.mp3" },
  { title: "Ocean Breeze", filename: "OceanBreeze.mp3" },
  { title: "Autumn Leaves", filename: "AutumnLeaves.mp3" },
  { title: "Late Night Coding", filename: "LateNightCoding.mp3" },
  { title: "Dial Up Dreams", filename: "DialUpDreams.mp3" },
  { title: "Dreamy Daze", filename: "DreamyDaze.mp3" },
  { title: "Berlin Beat", filename: "BerlinBeat.mp3" },
  { title: "NY State Of Mind", filename: "NYStateOfMind.mp3" },
  { title: "Retro Rewind", filename: "RetroRewind.mp3" },
  { title: "City Lights", filename: "CityLights.mp3" },
  { title: "Floppy Disk Funk", filename: "FloppyDiskFunk.mp3" },
  { title: "Stillness Suite", filename: "StillnessSuite.mp3" },
  { title: "Zenith Zone", filename: "ZenithZone.mp3" },
  { title: "Kyoto Calm", filename: "KyotoCalm.mp3" },
  { title: "Keyboard Clicks", filename: "KeyboardClicks.mp3" },
  { title: "London Fog", filename: "LondonFog.mp3" },
  { title: "Neon Dreams", filename: "NeonDreams.mp3" },
  { title: "Quasar Quiet", filename: "QuasarQuiet.mp3" },
  { title: "Calm Canvas", filename: "CalmCanvas.mp3" },
  { title: "Rainy Day Jazz", filename: "RainyDayJazz.mp3" },
  { title: "Solstice Sonata", filename: "SolsticeSonata.mp3" },
  { title: "Interstellar Funk", filename: "InterstellarFunk.mp3" },
  { title: "Groovy Afternoon", filename: "GroovyAfternoon.mp3" },
  { title: "Bit Crushed", filename: "BitCrushed.mp3" },
  { title: "Study Time", filename: "StudyTime.mp3" },
  { title: "Peaceful Pulse", filename: "PeacefulPulse.mp3" },
  { title: "Focus Flow", filename: "FocusFlow.mp3" },
  { title: "Starry Skies", filename: "StarrySkies.mp3" },
  { title: "Future Funk", filename: "FutureFunk.mp3" },
  { title: "Pulsar Pop", filename: "PulsarPop.mp3" },
  { title: "Coastal Highway", filename: "CoastalHighway.mp3" },
  { title: "Black Hole Blues", filename: "BlackHoleBlues.mp3" },
  { title: "Spring Blossom", filename: "SpringBlossom.mp3" },
  { title: "Analog Warmth", filename: "AnalogWarmth.mp3" },
  { title: "Distant Memories", filename: "DistantMemories.mp3" },
  { title: "Supernova Soul", filename: "SupernovaSoul.mp3" },
  { title: "Cosmic Drift", filename: "CosmicDrift.mp3" },
  { title: "Dawn Ditty", filename: "DawnDitty.mp3" },
  { title: "Glitch Garden", filename: "GlitchGarden.mp3" },
  { title: "Cool Breeze", filename: "CoolBreeze.mp3" },
  { title: "Silent Focus", filename: "SilentFocus.mp3" },
  { title: "Winter Chill", filename: "WinterChill.mp3" },
  { title: "Electric Sheep", filename: "ElectricSheep.mp3" },
  { title: "Golden Hour", filename: "GoldenHour.mp3" },
  { title: "Lo Fi Leisure", filename: "LoFiLeisure.mp3" },
  { title: "Digital Nomad", filename: "DigitalNomad.mp3" },
  { title: "Cloud Watching", filename: "CloudWatching.mp3" },
  { title: "Fresh Feelings", filename: "FreshFeelings.mp3" },
  { title: "Lazy Sunday", filename: "LazySunday.mp3" },
  { title: "Zen Garden", filename: "ZenGarden.mp3" },
  { title: "Tokyo Drift", filename: "TokyoDrift.mp3" },
  { title: "Equinox Ease", filename: "EquinoxEase.mp3" },
  { title: "Pixel Perfect", filename: "PixelPerfect.mp3" },
  { title: "Twilight Tones", filename: "TwilightTones.mp3" },
  { title: "Easy Evening", filename: "EasyEvening.mp3" },
  { title: "Asteroid Ambience", filename: "AsteroidAmbience.mp3" },
  { title: "Warm Nights", filename: "WarmNights.mp3" },
  { title: "Vinyl Crackles", filename: "VinylCrackles.mp3" },
  { title: "Rome Reflection", filename: "RomeReflection.mp3" },
  { title: "Nadir Nod", filename: "NadirNod.mp3" },
  { title: "Comet Cruise", filename: "CometCruise.mp3" },
  { title: "Fireside Chat", filename: "FiresideChat.mp3" },
  { title: "Urban Glow", filename: "UrbanGlow.mp3" },
  { title: "Orbit Chill", filename: "OrbitChill.mp3" },
  { title: "Dark Chill", filename: "DarkChill.mp3" },
  { title: "Mindful Melody", filename: "MindfulMelody.mp3" },
  { title: "Empty Streets", filename: "EmptyStreets.mp3" },
  { title: "Tape Hiss", filename: "TapeHiss.mp3" },
  { title: "Midnight Lofi", filename: "MidnightLofi.mp3" },
  { title: "Cosmic Dust", filename: "CosmicDust.mp3" },
  { title: "Nebula Nights", filename: "NebulaNights.mp3" },
  { title: "Moonlit Path", filename: "MoonlitPath.mp3" },
  { title: "Summer Vibes", filename: "SummerVibes.mp3" },
  { title: "Synthwave Sunset", filename: "SynthwaveSunset.mp3" },
];
