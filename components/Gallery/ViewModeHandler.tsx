"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ViewModeHandler({ view }) {
  const size = useWindowSize();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (view === "column") {
      return;
    }
    if (size.width < 1280) {
      const params = new URLSearchParams(searchParams.toString());
      if (params.get("view") !== "column") {
        params.set("view", "column");
        router.replace(`/?${params.toString()}`);
      }
    }
  }, [size]);
  return <></>;
}

// Hook
function useWindowSize() {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    // only execute all the code below in client side
    // Handler to call on window resize
    function handleResize() {
      // Set window width/height to state
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  return windowSize;
}
