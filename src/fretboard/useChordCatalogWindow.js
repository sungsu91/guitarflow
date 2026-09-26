import { useCallback, useEffect, useRef, useState } from "react";

// Keep every card button (and its scroll position) in the catalog, but only
// mount diagrams near the visible row and horizontal scroll window.
export function useChordCatalogWindow(chords) {
  const gridRef = useRef(null);
  const [visibleChordIds, setVisibleChordIds] = useState(
    () => new Set(chords.slice(0, 3).map((chord) => chord.id)),
  );

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisibleChordIds(new Set(chords.map((chord) => chord.id)));
      return undefined;
    }

    let rowIsNear = null;
    let horizontalIds = null;
    const publish = () => {
      if (rowIsNear === null || horizontalIds === null) return;
      const next = rowIsNear ? new Set(horizontalIds) : new Set();
      setVisibleChordIds((previous) => (
        previous.size === next.size && [...next].every((id) => previous.has(id))
          ? previous
          : next
      ));
    };
    // A row can be inside the desktop catalog scroller or the mobile page.
    const rowObserver = new IntersectionObserver(([entry]) => {
      rowIsNear = entry.isIntersecting;
      publish();
    }, { rootMargin: "240px 0px" });
    const cardObserver = new IntersectionObserver((entries) => {
      horizontalIds ??= new Set();
      for (const entry of entries) {
        const id = entry.target.dataset.chordId;
        if (entry.isIntersecting) horizontalIds.add(id);
        else horizontalIds.delete(id);
      }
      publish();
    }, { root: grid, rootMargin: "0px 280px" });

    rowObserver.observe(grid);
    grid.querySelectorAll(":scope > .chordMiniCard").forEach((card) => cardObserver.observe(card));
    // Activity disconnects observers while another tab is open. The last window
    // stays in state so returning to chords can paint it immediately.
    return () => {
      rowObserver.disconnect();
      cardObserver.disconnect();
    };
  }, [chords]);

  const revealFocusedCard = useCallback((event) => {
    const id = event.target.closest(".chordMiniCard")?.dataset.chordId;
    if (!id) return;
    setVisibleChordIds((previous) => previous.has(id) ? previous : new Set([...previous, id]));
  }, []);

  return { gridRef, revealFocusedCard, visibleChordIds };
}
