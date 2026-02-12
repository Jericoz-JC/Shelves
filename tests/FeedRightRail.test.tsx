import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  readingClubs,
  suggestedReaders,
  trendingBooks,
} from "@/data/mockDiscovery";
import { FeedRightRail } from "@/components/social/FeedRightRail";

describe("FeedRightRail", () => {
  it("renders loading skeleton layout while discovery data is loading", () => {
    const { container } = render(
      <FeedRightRail
        trending={trendingBooks}
        clubs={readingClubs}
        suggested={suggestedReaders}
        loading
      />
    );

    expect(screen.getByLabelText("Loading discovery widgets")).toHaveAttribute(
      "aria-busy",
      "true"
    );
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Trending Books")).not.toBeInTheDocument();
  });

  it("renders discovery widgets when loading completes", () => {
    render(
      <FeedRightRail
        trending={trendingBooks}
        clubs={readingClubs}
        suggested={suggestedReaders}
      />
    );

    expect(screen.getByText("Trending Books")).toBeInTheDocument();
    expect(screen.getByText("Active Reading Clubs")).toBeInTheDocument();
    expect(screen.getByText("Suggested Readers")).toBeInTheDocument();
  });

  it("renders widget shells with empty data arrays", () => {
    render(<FeedRightRail trending={[]} clubs={[]} suggested={[]} />);

    expect(screen.getByText("Trending Books")).toBeInTheDocument();
    expect(screen.getByText("Active Reading Clubs")).toBeInTheDocument();
    expect(screen.getByText("Suggested Readers")).toBeInTheDocument();
  });

  it("allows users to type in the search input", () => {
    render(
      <FeedRightRail
        trending={trendingBooks}
        clubs={readingClubs}
        suggested={suggestedReaders}
      />
    );

    const searchInput = screen.getByPlaceholderText(
      "Search readers, books, chronicles"
    );
    fireEvent.change(searchInput, { target: { value: "pachinko" } });

    expect(searchInput).toHaveValue("pachinko");
    expect(screen.getByText("Search results are coming soon.")).toBeInTheDocument();
  });
});
