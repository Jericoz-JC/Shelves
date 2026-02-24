import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { FeedTab, FeedView, SocialUser, UserProfile } from "@/types/social";
import { mockUserBooks } from "@/data/mockReplies";
import { useConvexChronicles as useChronicles, type FeedType } from "@/hooks/useConvexChronicles";
import { useConvexFollows } from "@/hooks/useConvexFollows";
import { useConvexUsers } from "@/hooks/useConvexUsers";
import {
  readingClubs,
  suggestedReaders,
  trendingBooks,
} from "@/data/mockDiscovery";
import { useLibrary } from "@/hooks/useIndexedDB";
import { useRouteScrollRestoration } from "@/hooks/useRouteScrollRestoration";
import { useMobileBottomChromeMotion } from "@/hooks/useMobileBottomChromeMotion";
import { FeedHeader } from "@/components/social/FeedHeader";
import { ChronicleComposer } from "@/components/social/ChronicleComposer";
import { FeedTimeline } from "@/components/social/FeedTimeline";
import { FeedRightRail } from "@/components/social/FeedRightRail";
import { ProfileSidebar } from "@/components/social/ProfileSidebar";
import { SocialComposeButton } from "@/components/social/SocialComposeButton";
import { SocialLayout } from "@/components/social/SocialLayout";
import { UserAvatar } from "@/components/social/UserAvatar";
import { FollowToggleButton } from "@/components/social/FollowToggleButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { resolveCurrentUserId } from "@/lib/social/identity";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DISCOVERY_LOADING_DELAY_MS = 320;

type ConvexUserDoc = {
  clerkId: string;
  name?: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string;
};

function getFeedView(pathname: string): FeedView {
  if (pathname === "/feed/following") return "following";
  if (pathname === "/feed/bookmarks") return "bookmarks";
  if (pathname === "/feed/likes") return "likes";
  if (pathname === "/feed/reposts") return "reposts";
  return "home";
}

function toSocialUser(user: ConvexUserDoc | null | undefined): SocialUser | null {
  if (!user) return null;
  return {
    id: user.clerkId,
    displayName: user.name ?? "Reader",
    handle: user.handle ?? "reader",
    bio: user.bio,
    avatarUrl: user.avatarUrl,
  };
}

function toEditableProfile(user: SocialUser | null): UserProfile | undefined {
  if (!user) return undefined;
  return {
    displayName: user.displayName,
    handle: user.handle,
    bio: user.bio ?? "",
  };
}

export default function Feed() {
  const { userId } = useAuth();
  const { me } = useConvexUsers();
  const { followedIds, toggleFollow } = useConvexFollows();
  const updateProfile = useMutation(api.users.updateProfile);

  const location = useLocation();
  const navigate = useNavigate();
  const { userId: routeProfileUserId } = useParams<{ userId: string }>();
  const currentUserId = resolveCurrentUserId(userId);

  const isProfileRoute = location.pathname.startsWith("/feed/profile/");
  const feedView = getFeedView(location.pathname);
  const activeTab: FeedTab = feedView === "following" ? "following" : "forYou";
  const chroniclesFeedType: FeedType = isProfileRoute
    ? "author"
    : feedView === "following"
      ? "following"
      : feedView === "bookmarks"
        ? "bookmarks"
        : feedView === "likes"
          ? "likes"
          : feedView === "reposts"
            ? "reposts"
            : "forYou";

  const {
    chronicles: posts,
    replies,
    addChronicle,
    likeChronicle,
    repostChronicle,
    bookmarkChronicle,
    deleteChronicle,
    addReply,
  } = useChronicles(chroniclesFeedType, {
    authorId: routeProfileUserId ?? null,
  });

  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  const { books: libraryBooks } = useLibrary();
  const {
    navRef,
    offsetPx: navTranslateYPx,
    composeTranslatePx,
    anchorBottomPx,
    reservedBottomPx,
  } = useMobileBottomChromeMotion({
    peekPx: 0,
  });

  useRouteScrollRestoration(location.pathname);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDiscoveryLoading(false),
      DISCOVERY_LOADING_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, []);

  const profileUserDoc = useQuery(
    api.users.getByClerkId,
    profileUserId ? { clerkId: profileUserId } : "skip"
  ) as ConvexUserDoc | null | undefined;

  const routeProfileUserDoc = useQuery(
    api.users.getByClerkId,
    routeProfileUserId ? { clerkId: routeProfileUserId } : "skip"
  ) as ConvexUserDoc | null | undefined;

  const meUser = toSocialUser(me as ConvexUserDoc | null | undefined);

  const handlePost = (text: string) => {
    addChronicle({ text });
    setComposeOpen(false);
    navigate("/feed");
  };

  const handleAvatarClick = (selectedUserId: string) => {
    setProfileUserId(selectedUserId);
    setProfileOpen(true);
  };

  const handleSaveProfile = (profile: UserProfile) => {
    void updateProfile({
      name: profile.displayName,
      handle: profile.handle,
      bio: profile.bio,
    }).catch((err) => {
      console.error("[Feed] Failed to update profile:", err);
    });
  };

  const filteredPosts = useMemo(() => {
    if (isProfileRoute) {
      if (!routeProfileUserId) return [];
      return posts;
    }

    return posts;
  }, [isProfileRoute, posts, routeProfileUserId]);

  const emptyMessage = useMemo(() => {
    if (isProfileRoute) {
      return routeProfileUserId === currentUserId
        ? "You have not posted any chronicles yet."
        : "This reader has not posted any chronicles yet.";
    }
    if (feedView === "following") {
      return "Follow some readers to see their chronicles here.";
    }
    if (feedView === "bookmarks") {
      return "No bookmarks yet. Save chronicles you want to revisit.";
    }
    if (feedView === "likes") {
      return "No liked chronicles yet.";
    }
    if (feedView === "reposts") {
      return "No reposted chronicles yet.";
    }

    return "No chronicles yet. Be the first to post.";
  }, [currentUserId, feedView, isProfileRoute, routeProfileUserId]);

  const profileUser = useMemo(() => {
    if (!profileUserId) return null;
    if (profileUserId === currentUserId) return meUser;
    return toSocialUser(profileUserDoc);
  }, [currentUserId, meUser, profileUserDoc, profileUserId]);

  const isCurrentUser = profileUserId === currentUserId;

  const profileBooks = useMemo(() => {
    if (isCurrentUser) return libraryBooks;
    if (profileUserId) return mockUserBooks[profileUserId] || [];
    return [];
  }, [isCurrentUser, profileUserId, libraryBooks]);

  const profileRouteUser = useMemo(() => {
    if (!routeProfileUserId) return null;
    if (routeProfileUserId === currentUserId) return meUser;
    return toSocialUser(routeProfileUserDoc);
  }, [currentUserId, meUser, routeProfileUserDoc, routeProfileUserId]);

  const isProfileCurrentUser = routeProfileUserId === currentUserId;

  const headerTitle = useMemo(() => {
    if (isProfileRoute) return profileRouteUser?.displayName || "Profile";
    if (feedView === "following") return "Following";
    if (feedView === "bookmarks") return "Bookmarks";
    if (feedView === "likes") return "Liked Chronicles";
    if (feedView === "reposts") return "Reposted Chronicles";
    return "Chronicles";
  }, [feedView, isProfileRoute, profileRouteUser?.displayName]);

  const headerSubtitle = useMemo(() => {
    if (isProfileRoute) {
      if (!profileRouteUser) return "Reader not found";
      const profileCount = posts.filter((post) => post.authorId === profileRouteUser.id).length;
      return `@${profileRouteUser.handle} | ${profileCount} chronicles`;
    }
    if (feedView === "home") return "For You";
    if (feedView === "following") return "From readers you follow";
    if (feedView === "bookmarks") return "Saved to revisit";
    if (feedView === "likes") return "Chronicles you liked";
    if (feedView === "reposts") return "Chronicles you reposted";
    return undefined;
  }, [feedView, isProfileRoute, posts, profileRouteUser]);

  const navCounts = useMemo(
    () => ({
      following: posts.filter(
        (post) => post.authorId !== currentUserId && followedIds.has(post.authorId)
      ).length,
      bookmarks: posts.filter((post) => post.isBookmarked).length,
      likes: posts.filter((post) => post.isLiked).length,
      reposts: posts.filter((post) => post.isReposted).length,
    }),
    [currentUserId, followedIds, posts]
  );

  const showTabs =
    !isProfileRoute && (feedView === "home" || feedView === "following");
  const showInlineComposer = !isProfileRoute || isProfileCurrentUser;
  const showComposeButton = !isProfileRoute || isProfileCurrentUser;

  return (
    <PageTransition preserveViewportFixed>
      <SocialLayout
        navCounts={navCounts}
        onComposeClick={() => setComposeOpen(true)}
        navTranslateYPx={navTranslateYPx}
        navAnchorBottomPx={anchorBottomPx}
        mobileBottomReservePx={reservedBottomPx}
        navRef={navRef}
        rightRail={
          <FeedRightRail
            trending={trendingBooks}
            clubs={readingClubs}
            suggested={suggestedReaders}
            loading={discoveryLoading}
          />
        }
      >
        <FeedHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          showTabs={showTabs}
          activeTab={activeTab}
          onTabChange={(tab) =>
            navigate(tab === "following" ? "/feed/following" : "/feed")
          }
        />

        {isProfileRoute && profileRouteUser && (
          <section className="border-b border-border/50 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  displayName={profileRouteUser.displayName}
                  avatarUrl={profileRouteUser.avatarUrl}
                  size="default"
                  onClick={() => handleAvatarClick(profileRouteUser.id)}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {profileRouteUser.displayName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{profileRouteUser.handle}
                  </p>
                  {profileRouteUser.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {profileRouteUser.bio}
                    </p>
                  )}
                </div>
              </div>
              {!isProfileCurrentUser && routeProfileUserId && (
                <FollowToggleButton
                  isFollowing={followedIds.has(routeProfileUserId)}
                  onToggle={() => toggleFollow(routeProfileUserId)}
                />
              )}
            </div>
          </section>
        )}

        {showInlineComposer && (
          <div className="hidden md:block">
            <ChronicleComposer
              onPost={handlePost}
              onAvatarClick={() => handleAvatarClick(currentUserId)}
            />
          </div>
        )}

        <FeedTimeline
          chronicles={filteredPosts}
          replies={replies}
          currentUserId={currentUserId}
          emptyMessage={emptyMessage}
          onLike={likeChronicle}
          onRepost={repostChronicle}
          onReply={addReply}
          onAvatarClick={handleAvatarClick}
          onBookmark={bookmarkChronicle}
          onDelete={deleteChronicle}
        />
      </SocialLayout>

      {showComposeButton && (
        <SocialComposeButton
          onClick={() => setComposeOpen(true)}
          translateYPx={composeTranslatePx}
          anchorBottomPx={anchorBottomPx}
        />
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-xl p-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle>Write a chronicle</DialogTitle>
            <DialogDescription>
              Share what you are reading with your followers.
            </DialogDescription>
          </DialogHeader>
          <ChronicleComposer
            onPost={handlePost}
            onAvatarClick={() => handleAvatarClick(currentUserId)}
            className="border-none pb-4"
            autoFocus
          />
        </DialogContent>
      </Dialog>

      <ProfileSidebar
        user={profileUser}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        chronicles={posts}
        books={profileBooks}
        isCurrentUser={isCurrentUser}
        userProfile={toEditableProfile(isCurrentUser ? meUser : null)}
        onSaveProfile={isCurrentUser ? handleSaveProfile : undefined}
        isFollowing={profileUserId ? followedIds.has(profileUserId) : undefined}
        onToggleFollow={
          profileUserId && !isCurrentUser ? () => toggleFollow(profileUserId) : undefined
        }
      />
    </PageTransition>
  );
}
