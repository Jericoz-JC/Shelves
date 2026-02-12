import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FeedTab } from "@/types/social";

interface FeedHeaderProps {
  title: string;
  subtitle?: string;
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  showTabs?: boolean;
}

export function FeedHeader({
  title,
  subtitle,
  activeTab,
  onTabChange,
  showTabs = true,
}: FeedHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg font-semibold">{title}</h1>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {showTabs && (
        <div>
          <Tabs
            value={activeTab}
            onValueChange={(v) => onTabChange(v as FeedTab)}
          >
            <TabsList variant="line" className="w-full px-2">
              <TabsTrigger
                value="forYou"
                className="text-[15px] font-medium after:bg-accent data-[state=active]:text-foreground"
              >
                For You
              </TabsTrigger>
              <TabsTrigger
                value="following"
                className="text-[15px] font-medium after:bg-accent data-[state=active]:text-foreground"
              >
                Following
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
    </header>
  );
}
