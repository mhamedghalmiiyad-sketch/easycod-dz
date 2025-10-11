// app/hooks/useBackNavigation.ts
import { useCallback } from "react";

export function useBackNavigation() {
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard if no history
      window.location.href = "/app";
    }
  }, []);

  return goBack;
}