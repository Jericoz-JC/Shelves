export interface SocialUser {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Chronicle {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  likeCount: number;
  replyCount: number;
  repostCount: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
}

export type FeedTab = "forYou" | "following";
export type FeedView =
  | "home"
  | "following"
  | "bookmarks"
  | "likes"
  | "reposts";

export interface Reply {
  id: string;
  chronicleId: string;
  authorId: string;
  text: string;
  createdAt: number;
}

export interface UserProfile {
  displayName: string;
  handle: string;
  bio: string;
}

export interface MockBook {
  id: string;
  title: string;
  author: string;
  color: string;
}
