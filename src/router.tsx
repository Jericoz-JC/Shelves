import { createBrowserRouter, Navigate } from "react-router-dom";
import Library from "@/pages/Library";
import Reader from "@/pages/Reader";
import Feed from "@/pages/Feed";

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
    path: "/feed",
    element: <Feed />,
  },
  {
    path: "/feed/following",
    element: <Feed />,
  },
  {
    path: "/feed/bookmarks",
    element: <Feed />,
  },
  {
    path: "/feed/likes",
    element: <Feed />,
  },
  {
    path: "/feed/reposts",
    element: <Feed />,
  },
  {
    path: "/feed/profile/:userId",
    element: <Feed />,
  },
]);
