import { createBrowserRouter, Navigate } from "react-router-dom";
import Library from "@/pages/Library";
import Reader from "@/pages/Reader";

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
]);
