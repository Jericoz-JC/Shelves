import {
  BookMarked,
  BookOpenText,
  Heart,
  Home,
  Repeat2,
  UserRound,
  Users,
} from "lucide-react";

export interface SocialNavItem {
  id: string;
  label: string;
  path: string;
  count?: number;
  end?: boolean;
  icon: typeof Home;
}

export const socialPrimaryNav: SocialNavItem[] = [
  {
    id: "home",
    label: "Home",
    path: "/feed",
    end: true,
    icon: Home,
  },
  {
    id: "following",
    label: "Following",
    path: "/feed/following",
    icon: Users,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    path: "/feed/bookmarks",
    icon: BookMarked,
  },
  {
    id: "likes",
    label: "Likes",
    path: "/feed/likes",
    icon: Heart,
  },
  {
    id: "reposts",
    label: "Reposts",
    path: "/feed/reposts",
    icon: Repeat2,
  },
];

export const socialSecondaryNav: SocialNavItem[] = [
  {
    id: "library",
    label: "Library",
    path: "/library",
    icon: BookOpenText,
  },
  {
    id: "profile",
    label: "Profile",
    path: "/feed/profile/me",
    icon: UserRound,
  },
];

export const socialBottomPrimaryNav: SocialNavItem[] = [
  {
    id: "home",
    label: "Home",
    path: "/feed",
    end: true,
    icon: Home,
  },
  {
    id: "bookmarks",
    label: "Bookmarks",
    path: "/feed/bookmarks",
    icon: BookMarked,
  },
  {
    id: "likes",
    label: "Likes",
    path: "/feed/likes",
    icon: Heart,
  },
  {
    id: "profile",
    label: "Profile",
    path: "/feed/profile/me",
    icon: UserRound,
  },
  {
    id: "library",
    label: "Library",
    path: "/library",
    icon: BookOpenText,
  },
];
