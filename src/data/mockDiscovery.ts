export interface TrendingBook {
  id: string;
  title: string;
  author: string;
  chronicles: number;
}

export interface ReadingClub {
  id: string;
  name: string;
  currentBook: string;
  members: number;
}

export interface SuggestedReader {
  id: string;
  reason: string;
}

export const trendingBooks: TrendingBook[] = [
  {
    id: "tb1",
    title: "Pachinko",
    author: "Min Jin Lee",
    chronicles: 41,
  },
  {
    id: "tb2",
    title: "Project Hail Mary",
    author: "Andy Weir",
    chronicles: 36,
  },
  {
    id: "tb3",
    title: "The Secret History",
    author: "Donna Tartt",
    chronicles: 29,
  },
];

export const readingClubs: ReadingClub[] = [
  {
    id: "rc1",
    name: "Sunday Slow Readers",
    currentBook: "Normal People",
    members: 218,
  },
  {
    id: "rc2",
    name: "Sci-Fi Night Shift",
    currentBook: "Project Hail Mary",
    members: 156,
  },
  {
    id: "rc3",
    name: "Classics Revisited",
    currentBook: "The Remains of the Day",
    members: 102,
  },
];

export const suggestedReaders: SuggestedReader[] = [
  {
    id: "u1",
    reason: "Literary fiction picks",
  },
  {
    id: "u3",
    reason: "Historical fiction thread",
  },
  {
    id: "u5",
    reason: "Library-first recommendations",
  },
];
