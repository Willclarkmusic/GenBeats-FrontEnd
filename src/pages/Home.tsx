import { useRef } from "react";
import * as motion from "motion/react-client";

import { ArtCard } from "../components/ArtCard";
import { AudioCard } from "../components/AudioCard";
import { Background } from "../components/Background";

export const Home = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div ref={containerRef} className="size-full overflow-hidden">
      <Background />
      <h1 className="text-4xl">Home</h1>

      <div className="flex flex-col md:grid md:grid-cols-2 md:m-4 md:p-4 items-center justify-center ">
        <div className="col-span-1 md:p-4 pt-4">
          <ArtCard containerRef={containerRef} />
        </div>
        <div className="col-span-1 md:p-4 pt-4">
          <AudioCard containerRef={containerRef} />
        </div>
      </div>
    </motion.div>
  );
};
