import { createBrowserRouter, Navigate } from "react-router-dom";
import Library from "@/pages/Library";
import Reader from "@/pages/Reader";
import Feed from "@/pages/Feed";
import ReaderHarness from "@/pages/ReaderHarness";

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
  {
    path: "/reader-harness",
    element: <ReaderHarness />,
  },
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
