import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  Chronicle,
  FeedTab,
  FeedView,
  Reply,
  UserProfile,
} from "@/types/social";
import { mockChronicles, getUserById } from "@/data/mockFeed";
import { mockReplies, mockUserBooks } from "@/data/mockReplies";
import {
  readingClubs,
  suggestedReaders,
  trendingBooks,
} from "@/data/mockDiscovery";
import { useLibrary } from "@/hooks/useIndexedDB";
import { useRouteScrollRestoration } from "@/hooks/useRouteScrollRestoration";
import { useScrollDirection } from "@/hooks/useScrollDirection";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CURRENT_USER_ID = "me";
const DISCOVERY_LOADING_DELAY_MS = 320;

function createLocalId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFeedView(pathname: string): FeedView {
  if (pathname === "/feed/following") return "following";
  if (pathname === "/feed/bookmarks") return "bookmarks";
  if (pathname === "/feed/likes") return "likes";
  if (pathname === "/feed/reposts") return "reposts";
  return "home";
}

export default function Feed() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId: routeProfileUserId } = useParams<{ userId: string }>();

  const isProfileRoute = location.pathname.startsWith("/feed/profile/");
  const feedView = getFeedView(location.pathname);
  const activeTab: FeedTab = feedView === "following" ? "following" : "forYou";

  const [posts, setPosts] = useState<Chronicle[]>(mockChronicles);

  // TODO: Extract feed/follow/profile concerns into dedicated hooks as backend wiring lands.
  // Profile sidebar state
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  // User profile (editable)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "You",
    handle: "you",
    bio: "Avid reader and book lover.",
  });

  // Replies state initialized from mock data
  const [replies, setReplies] = useState<Record<string, Reply[]>>(() => {
    const map: Record<string, Reply[]> = {};
    for (const reply of mockReplies) {
      if (!map[reply.chronicleId]) map[reply.chronicleId] = [];
      map[reply.chronicleId].push(reply);
    }
    return map;
  });

  // Follows default: all mock users
  const [followedIds, setFollowedIds] = useState<Set<string>>(
    new Set(["u1", "u2", "u3", "u4", "u5"])
  );

  // Real books from IndexedDB for current user
  const { books: libraryBooks } = useLibrary();

  const { offset: navOffset, navRef } = useScrollDirection();

  useRouteScrollRestoration(location.pathname);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDiscoveryLoading(false),
      DISCOVERY_LOADING_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, []);

  const handlePost = (text: string) => {
    const newChronicle: Chronicle = {
      id: createLocalId("c"),
      authorId: CURRENT_USER_ID,
      text,
      createdAt: Date.now(),
      likeCount: 0,
      replyCount: 0,
      repostCount: 0,
      isLiked: false,
      isReposted: false,
      isBookmarked: false,
    };

    setPosts((prev) => [newChronicle, ...prev]);
    setComposeOpen(false);
    navigate("/feed");
  };

  const handleLike = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1,
            }
          : p
      )
    );
  };

  const handleRepost = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              isReposted: !p.isReposted,
              repostCount: p.isReposted
                ? p.repostCount - 1
                : p.repostCount + 1,
            }
          : p
      )
    );
  };

  const handleReply = (chronicleId: string, text: string) => {
    const newReply: Reply = {
      id: createLocalId("r"),
      chronicleId,
      authorId: CURRENT_USER_ID,
      text,
      createdAt: Date.now(),
    };

    setReplies((prev) => ({
      ...prev,
      [chronicleId]: [newReply, ...(prev[chronicleId] || [])],
    }));

    setPosts((prev) =>
      prev.map((p) =>
        p.id === chronicleId ? { ...p, replyCount: p.replyCount + 1 } : p
      )
    );
  };

  const handleBookmark = (id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p
      )
    );
  };

  const handleToggleFollow = (userId: string) => {
    setFollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleDelete = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setReplies((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleAvatarClick = (userId: string) => {
    setProfileUserId(userId);
    setProfileOpen(true);
  };

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
  };

  const filteredPosts = useMemo(() => {
    if (isProfileRoute) {
      if (!routeProfileUserId) return [];
      return posts.filter((post) => post.authorId === routeProfileUserId);
    }

    if (feedView === "following") {
      return posts.filter(
        (post) => post.authorId === CURRENT_USER_ID || followedIds.has(post.authorId)
      );
    }
    if (feedView === "bookmarks") {
      return posts.filter((post) => post.isBookmarked);
    }
    if (feedView === "likes") {
      return posts.filter((post) => post.isLiked);
    }
    if (feedView === "reposts") {
      return posts.filter((post) => post.isReposted);
    }

    return posts;
  }, [feedView, followedIds, isProfileRoute, posts, routeProfileUserId]);

  const emptyMessage = useMemo(() => {
    if (isProfileRoute) {
      return routeProfileUserId === CURRENT_USER_ID
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
  }, [feedView, isProfileRoute, routeProfileUserId]);

  // Derive profile sidebar data
  const profileUser = profileUserId ? (getUserById(profileUserId) ?? null) : null;
  const isCurrentUser = profileUserId === CURRENT_USER_ID;

  const profileBooks = useMemo(() => {
    if (isCurrentUser) return libraryBooks;
    if (profileUserId) return mockUserBooks[profileUserId] || [];
    return [];
  }, [isCurrentUser, profileUserId, libraryBooks]);

  const profileUserWithEdits = useMemo(
    () =>
      profileUser && isCurrentUser
        ? {
            ...profileUser,
            displayName: userProfile.displayName,
            handle: userProfile.handle,
            bio: userProfile.bio,
          }
        : profileUser,
    [isCurrentUser, profileUser, userProfile.bio, userProfile.displayName, userProfile.handle]
  );

  const profileRouteUser = routeProfileUserId
    ? (getUserById(routeProfileUserId) ?? null)
    : null;
  const isProfileCurrentUser = routeProfileUserId === CURRENT_USER_ID;

  const profileRouteUserWithEdits = useMemo(
    () =>
      profileRouteUser && isProfileCurrentUser
        ? {
            ...profileRouteUser,
            displayName: userProfile.displayName,
            handle: userProfile.handle,
            bio: userProfile.bio,
          }
        : profileRouteUser,
    [
      isProfileCurrentUser,
      profileRouteUser,
      userProfile.bio,
      userProfile.displayName,
      userProfile.handle,
    ]
  );

  const headerTitle = useMemo(() => {
    if (isProfileRoute) return profileRouteUserWithEdits?.displayName || "Profile";
    if (feedView === "following") return "Following";
    if (feedView === "bookmarks") return "Bookmarks";
    if (feedView === "likes") return "Liked Chronicles";
    if (feedView === "reposts") return "Reposted Chronicles";
    return "Chronicles";
  }, [feedView, isProfileRoute, profileRouteUserWithEdits?.displayName]);

  const headerSubtitle = useMemo(() => {
    if (isProfileRoute) {
      if (!profileRouteUserWithEdits) return "Reader not found";
      const profileCount = posts.filter(
        (post) => post.authorId === profileRouteUserWithEdits.id
      ).length;
      return `@${profileRouteUserWithEdits.handle} | ${profileCount} chronicles`;
    }
    if (feedView === "home") return "For You";
    if (feedView === "following") return "From readers you follow";
    if (feedView === "bookmarks") return "Saved to revisit";
    if (feedView === "likes") return "Chronicles you liked";
    if (feedView === "reposts") return "Chronicles you reposted";
    return undefined;
  }, [feedView, isProfileRoute, posts, profileRouteUserWithEdits]);

  const navCounts = useMemo(
    () => ({
      following: posts.filter(
        (post) => post.authorId !== CURRENT_USER_ID && followedIds.has(post.authorId)
      ).length,
      bookmarks: posts.filter((post) => post.isBookmarked).length,
      likes: posts.filter((post) => post.isLiked).length,
      reposts: posts.filter((post) => post.isReposted).length,
    }),
    [followedIds, posts]
  );

  const showTabs =
    !isProfileRoute && (feedView === "home" || feedView === "following");
  const showInlineComposer = !isProfileRoute || isProfileCurrentUser;
  const showComposeButton = !isProfileRoute || isProfileCurrentUser;

  return (
    <PageTransition>
      <SocialLayout
        navCounts={navCounts}
        onComposeClick={() => setComposeOpen(true)}
        navOffset={navOffset}
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

        {isProfileRoute && profileRouteUserWithEdits && (
          <section className="border-b border-border/50 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar
                  displayName={profileRouteUserWithEdits.displayName}
                  size="default"
                  onClick={() => handleAvatarClick(profileRouteUserWithEdits.id)}
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">
                    {profileRouteUserWithEdits.displayName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{profileRouteUserWithEdits.handle}
                  </p>
                  {profileRouteUserWithEdits.bio && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {profileRouteUserWithEdits.bio}
                    </p>
                  )}
                </div>
              </div>
              {!isProfileCurrentUser && routeProfileUserId && (
                <FollowToggleButton
                  isFollowing={followedIds.has(routeProfileUserId)}
                  onToggle={() => handleToggleFollow(routeProfileUserId)}
                />
              )}
            </div>
          </section>
        )}

        {showInlineComposer && (
          <div className="hidden md:block">
            <ChronicleComposer
              onPost={handlePost}
              onAvatarClick={() => handleAvatarClick(CURRENT_USER_ID)}
            />
          </div>
        )}

        <FeedTimeline
          chronicles={filteredPosts}
          replies={replies}
          currentUserId={CURRENT_USER_ID}
          emptyMessage={emptyMessage}
          onLike={handleLike}
          onRepost={handleRepost}
          onReply={handleReply}
          onAvatarClick={handleAvatarClick}
          onBookmark={handleBookmark}
          onDelete={handleDelete}
        />
      </SocialLayout>

      {showComposeButton && (
        <SocialComposeButton onClick={() => setComposeOpen(true)} navOffset={navOffset} />
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
            onAvatarClick={() => handleAvatarClick(CURRENT_USER_ID)}
            className="border-none pb-4"
            autoFocus
          />
        </DialogContent>
      </Dialog>

      <ProfileSidebar
        user={profileUserWithEdits}
        open={profileOpen}
        onOpenChange={setProfileOpen}
        chronicles={posts}
        books={profileBooks}
        isCurrentUser={isCurrentUser}
        userProfile={userProfile}
        onSaveProfile={handleSaveProfile}
        isFollowing={profileUserId ? followedIds.has(profileUserId) : undefined}
        onToggleFollow={
          profileUserId && !isCurrentUser
            ? () => handleToggleFollow(profileUserId)
            : undefined
        }
      />
    </PageTransition>
  );
}
