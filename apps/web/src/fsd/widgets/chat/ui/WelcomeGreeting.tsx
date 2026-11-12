"use client";
import { useEffect, useState } from "react";
import { useSessionProfile } from "@/entities/session";

function partOfDay(hour: number) {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Time-aware greeting; the hour is read after hydration to match the server render. */
export function WelcomeGreeting() {
  const profile = useSessionProfile();
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const update = () => setGreeting(partOfDay(new Date().getHours()));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  const name = profile?.name?.split(" ")[0];
  if (!greeting || !name) return <span className="gx-greeting">What can we create together?</span>;
  return <span className="gx-greeting">{greeting}, <span className="gx-greeting-name">{name}</span></span>;
}
