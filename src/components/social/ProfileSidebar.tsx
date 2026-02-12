import { useState } from "react";
import { Settings } from "lucide-react";
import type { SocialUser, Chronicle, UserProfile, MockBook } from "@/types/social";
import type { BookMetadata } from "@/types/book";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { UserAvatar } from "./UserAvatar";
import { ProfileSettings } from "./ProfileSettings";
import { ProfileBookGrid } from "./ProfileBookGrid";
import { FollowToggleButton } from "./FollowToggleButton";
import { relativeTime } from "@/lib/utils/relativeTime";

interface ProfileSidebarProps {
  user: SocialUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chronicles: Chronicle[];
  books: MockBook[] | BookMetadata[];
  isCurrentUser: boolean;
  userProfile?: UserProfile;
  onSaveProfile?: (profile: UserProfile) => void;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
}

export function ProfileSidebar({
  user,
  open,
  onOpenChange,
  chronicles,
  books,
  isCurrentUser,
  userProfile,
  onSaveProfile,
  isFollowing,
  onToggleFollow,
}: ProfileSidebarProps) {
  const [view, setView] = useState<"profile" | "settings">("profile");

  if (!user) return null;

  const displayName = isCurrentUser && userProfile ? userProfile.displayName : user.displayName;
  const handle = isCurrentUser && userProfile ? userProfile.handle : user.handle;
  const bio = isCurrentUser && userProfile ? userProfile.bio : user.bio || "";

  const userChronicles = chronicles.filter((c) => c.authorId === user.id);

  const handleOpenChange = (open: boolean) => {
    if (!open) setView("profile");
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetTitle className="sr-only">
          {displayName}&apos;s Profile
        </SheetTitle>

        {view === "settings" && isCurrentUser && userProfile && onSaveProfile ? (
          <ProfileSettings
            profile={userProfile}
            onSave={onSaveProfile}
            onBack={() => setView("profile")}
          />
        ) : (
          <div className="flex flex-col h-full">
            {/* Profile header */}
            <div className="flex flex-col items-center pt-8 pb-4 px-4 border-b border-border/50">
              <UserAvatar displayName={displayName} size="lg" />
              <h2 className="text-xl font-bold mt-3">{displayName}</h2>
              <p className="text-sm text-muted-foreground">@{handle}</p>
              {bio && (
                <p className="text-sm text-center mt-2 text-muted-foreground max-w-xs">
                  {bio}
                </p>
              )}
              {!isCurrentUser && onToggleFollow && (
                <FollowToggleButton
                  isFollowing={Boolean(isFollowing)}
                  onToggle={onToggleFollow}
                  className="mt-3"
                />
              )}
            </div>

            {/* Tabs */}
            {/* TODO: Add a "Reposts" tab here to show chronicles this user retweeted/reposted. */}
            <Tabs defaultValue="chronicles" className="flex-1 flex flex-col min-h-0">
              <TabsList variant="line" className="px-4">
                <TabsTrigger value="chronicles">Chronicles</TabsTrigger>
                <TabsTrigger value="books">Books</TabsTrigger>
              </TabsList>

              <TabsContent value="chronicles" className="flex-1 overflow-y-auto mt-0">
                {userChronicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No chronicles yet
                  </p>
                ) : (
                  <div>
                    {userChronicles.map((chronicle) => (
                      <div
                        key={chronicle.id}
                        className="px-4 py-3 border-b border-border/30"
                      >
                        <p className="text-[14px] leading-relaxed">
                          {chronicle.text}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-1">
                          {relativeTime(chronicle.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="books" className="flex-1 overflow-y-auto mt-0">
                <ProfileBookGrid books={books} isCurrentUser={isCurrentUser} />
              </TabsContent>
            </Tabs>

            {/* Settings button (only for current user) */}
            {isCurrentUser && (
              <div className="border-t border-border/50 p-4">
                <button
                  onClick={() => setView("settings")}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
