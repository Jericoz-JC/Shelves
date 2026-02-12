import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { UserProfile } from "@/types/social";
import { Button } from "@/components/ui/button";

interface ProfileSettingsProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onBack: () => void;
}

export function ProfileSettings({ profile, onSave, onBack }: ProfileSettingsProps) {
  const [form, setForm] = useState<UserProfile>({ ...profile });

  const handleSave = () => {
    const normalizedHandle = form.handle.trim().replace(/^@+/, "");

    onSave({
      displayName: form.displayName.trim() || profile.displayName,
      handle: normalizedHandle || profile.handle,
      bio: form.bio.trim(),
    });
    onBack();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
        <button
          onClick={onBack}
          aria-label="Go back"
          className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">Settings</h2>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Display Name
          </label>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Handle
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <input
              type="text"
              value={form.handle}
              onChange={(e) => setForm((f) => ({ ...f, handle: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        <Button
          onClick={handleSave}
          className="w-full bg-accent text-accent-foreground rounded-full h-10 font-semibold hover:bg-accent/90"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
