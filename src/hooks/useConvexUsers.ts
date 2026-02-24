import { useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useConvexUsers() {
  const { isAuthenticated } = useConvexAuth();
  const createOrGet = useMutation(api.users.createOrGet);
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    void createOrGet({}).catch((err) => {
      console.error("[useConvexUsers] Failed to create/get user profile:", err);
    });
  }, [createOrGet, isAuthenticated]);

  return { me };
}
