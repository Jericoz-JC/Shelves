import { createBrowserRouter, Navigate } from "react-router-dom";
import Library from "@/pages/Library";
import Reader from "@/pages/Reader";
import Feed from "@/pages/Feed";

const devRoutes = import.meta.env.DEV
  ? [
      {
        path: "/reader-harness",
        lazy: async () => ({ Component: (await import("@/pages/ReaderHarness")).default }),
      },
    ]
  : [];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/library" replace />,
  },
  {
    path: "/library",
    element: <Library />,
  },
  {
    path: "/read/:bookId",
    element: <Reader />,
  },
  ...devRoutes,
  {
    path: "/feed",
    children: [
      {
        index: true,
        element: <Feed />,
      },
      {
        path: "following",
        element: <Feed />,
      },
      {
        path: "bookmarks",
        element: <Feed />,
      },
      {
        path: "likes",
        element: <Feed />,
      },
      {
        path: "reposts",
        element: <Feed />,
      },
      {
        path: "profile/:userId",
        element: <Feed />,
      },
    ],
  },
]);
