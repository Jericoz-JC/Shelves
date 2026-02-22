type RelocatedPayload = {
  start: {
    cfi: string;
    index?: number;
    percentage: number;
    displayed?: { page: number; total: number };
  };
};

type RelocatedHandler = (payload: RelocatedPayload) => void;

export class FakeRendition {
  private relocatedHandlers = new Set<RelocatedHandler>();
  public displayedCfi: string | null = null;

  on(event: string, handler: RelocatedHandler) {
    if (event === "relocated") {
      this.relocatedHandlers.add(handler);
    }
  }

  off(event: string, handler: RelocatedHandler) {
    if (event === "relocated") {
      this.relocatedHandlers.delete(handler);
    }
  }

  display(cfi: string) {
    this.displayedCfi = cfi;
  }

  emitRelocated(payload: RelocatedPayload) {
    this.relocatedHandlers.forEach((handler) => handler(payload));
  }
}
