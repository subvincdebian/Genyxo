"use client";
import type { SyntheticEvent } from "react";

import { SupportContent } from "@/features/support";

export function SupportSupportContainer({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return <SupportContent />;
}
