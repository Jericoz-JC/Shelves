import { useEffect } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const usersApi = (api as unknown as { users: Record<string, unknown> }).users as {
  createOrGet: unknown;
  getMe: unknown;
};

export function useConvexUsers() {
  const { isAuthenticated } = useConvexAuth();
  const createOrGet = useMutation(usersApi.createOrGet as never);
  const me = useQuery(usersApi.getMe as never, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!isAuthenticated) return;
    void createOrGet({}).catch((err) => {
      console.error("[useConvexUsers] Failed to create/get user profile:", err);
    });
  }, [createOrGet, isAuthenticated]);

  return { me };
}
