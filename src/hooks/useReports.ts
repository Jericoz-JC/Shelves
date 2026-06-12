import { useClerk } from "@clerk/clerk-react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ReportReason } from "@/components/social/ReportDialog";

export function useReports() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { openSignIn } = useClerk();
  const createReport = useMutation(api.reports.create);

  const ensureAuthenticated = () => {
    if (isAuthenticated) return true;
    if (!isLoading) void openSignIn();
    return false;
  };

  return {
    reportChronicle: (chronicleId: string, reason: ReportReason) => {
      if (!ensureAuthenticated()) return;
      void createReport({
        targetType: "chronicle",
        chronicleId: chronicleId as Id<"chronicles">,
        reason,
      }).catch((err) => {
        console.error("[useReports] Failed to report chronicle:", err);
      });
    },

    reportUser: (targetClerkId: string, reason: ReportReason) => {
      if (!ensureAuthenticated()) return;
      void createReport({ targetType: "user", targetClerkId, reason }).catch((err) => {
        console.error("[useReports] Failed to report user:", err);
      });
    },
  };
}
