/**
 * Officer display-name hook.
 * Lazily fetches the officer profile name once and caches it in auth context.
 */

import { useEffect } from "react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export function useOfficerDisplayName() {
  const { displayName, setDisplayNameValue, role } = useAuth();

  useEffect(() => {
    if (displayName || role !== "OFFICER") return;
    api
      .get("/officer/me")
      .then((res) => {
        if (res.data?.full_name) {
          setDisplayNameValue(res.data.full_name);
        }
      })
      .catch(() => {
        // ignore; fallback to default label
      });
  }, [displayName, role, setDisplayNameValue]);

  return displayName;
}
