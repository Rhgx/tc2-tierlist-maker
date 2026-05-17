import { useEffect, useState } from "react";
import { isProfileEnabled } from "../lib/profile";

export function ProfileOutput() {
  const [profileEvents, setProfileEvents] = useState<string[]>([]);

  useEffect(() => {
    if (!isProfileEnabled()) return;
    const handleProfileEvent = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setProfileEvents((events) => [...events.slice(-80), detail]);
    };
    window.addEventListener("tc2-profile", handleProfileEvent);
    return () => window.removeEventListener("tc2-profile", handleProfileEvent);
  }, []);

  if (!isProfileEnabled()) return null;

  return (
    <pre className="profile-output" aria-label="Profiler output">
      {profileEvents.join("\n")}
    </pre>
  );
}
