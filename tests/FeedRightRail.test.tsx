import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  readingClubs,
  suggestedReaders,
  trendingBooks,
} from "@/data/mockDiscovery";
import { FeedRightRail } from "@/components/social/FeedRightRail";

vi.mock("convex/react", () => ({
  useQuery: () => [],
}));

describe("FeedRightRail", () => {
  const renderRail = (ui: ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it("renders loading skeleton layout while discovery data is loading", () => {
    const { container } = renderRail(
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
    renderRail(
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
    renderRail(<FeedRightRail trending={[]} clubs={[]} suggested={[]} />);

    expect(screen.getByText("Trending Books")).toBeInTheDocument();
    expect(screen.getByText("Active Reading Clubs")).toBeInTheDocument();
    expect(screen.getByText("Suggested Readers")).toBeInTheDocument();
  });

  it("allows users to type in the search input", () => {
    vi.useFakeTimers();
    try {
      renderRail(
        <FeedRightRail
          trending={trendingBooks}
          clubs={readingClubs}
          suggested={suggestedReaders}
        />
      );

      const searchInput = screen.getByPlaceholderText(
        "Search reader handles"
      );
      fireEvent.change(searchInput, { target: { value: "pachinko" } });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(searchInput).toHaveValue("pachinko");
      expect(screen.getByText('No readers found for "pachinko".')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("closes search results on outside click", () => {
    vi.useFakeTimers();
    try {
      renderRail(
        <FeedRightRail
          trending={trendingBooks}
          clubs={readingClubs}
          suggested={suggestedReaders}
        />
      );

      const searchInput = screen.getByPlaceholderText("Search reader handles");
      fireEvent.change(searchInput, { target: { value: "pachinko" } });
      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(screen.getByText('No readers found for "pachinko".')).toBeInTheDocument();
      fireEvent.mouseDown(document.body);
      expect(screen.queryByText('No readers found for "pachinko".')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
