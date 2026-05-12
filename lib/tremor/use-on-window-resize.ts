// Tremor useOnWindowResize [v0.0.2]
// Fuente: tremorlabs/tremor — src/hooks/useOnWindowResize.ts (copy-paste textual).

import * as React from "react";

export const useOnWindowResize = (handler: () => void) => {
  React.useEffect(() => {
    const handleResize = () => {
      handler();
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [handler]);
};
