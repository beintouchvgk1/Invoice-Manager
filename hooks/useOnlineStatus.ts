"use client";
import { useEffect, useState } from "react";
import { getOnlineStatus, initConnectivityWatcher, subscribeOnlineStatus } from "@/lib/offline/connectivity";

export function useOnlineStatus(): boolean {
  const [online, setOnlineState] = useState(getOnlineStatus());

  useEffect(() => {
    initConnectivityWatcher();
    return subscribeOnlineStatus(setOnlineState);
  }, []);

  return online;
}
