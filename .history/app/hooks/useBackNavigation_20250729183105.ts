// 1. Create a reusable hook (optional but recommended)
// Create a new file: app/hooks/useBackNavigation.ts

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

// 2. Usage in any page component:

// For Form Designer page:
import { useBackNavigation } from "../hooks/useBackNavigation";

export default function FormDesignerPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="Form Designer"
      subtitle="Customize your checkout form"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// For Visibility page:
export default function VisibilityPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="Visibility"
      subtitle="Control where your form appears"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// For Pixels page:
export default function PixelsPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="Pixels"
      subtitle="Manage tracking pixels"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// For Google Sheets page:
export default function GoogleSheetsPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="Google Sheets"
      subtitle="Export orders to Google Sheets"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// For Analytics page:
export default function AnalyticsPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="Analytics"
      subtitle="View your form performance"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// For User Blocking page:
export default function UserBlockingPage() {
  const goBack = useBackNavigation();
  
  return (
    <Page
      title="User Blocking"
      subtitle="Manage blocked users"
      backAction={{
        content: "Back",
        onAction: goBack
      }}
    >
      {/* Your page content */}
    </Page>
  );
}

// 3. Alternative: Direct implementation without hook
// If you don't want to create a hook, use this directly in each page:

<Page
  title="Your Page Title"
  subtitle="Your page subtitle"
  backAction={{
    content: "Back",
    onAction: () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/app";
      }
    }
  }}
>
  {/* Your page content */}
</Page>