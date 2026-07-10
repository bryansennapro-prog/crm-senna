"use client";

import { useAsync } from "./use-async";
import { getProfile } from "@/services/profile";

export function useProfile() {
  return useAsync(() => getProfile(), []);
}
