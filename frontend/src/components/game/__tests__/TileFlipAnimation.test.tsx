import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GameTile from "../../GameTile";
import { AccessibleGameBoard } from "../../AccessibleGameBoard";
import type { GameCell } from "../../AccessibleGameBoard";

describe("Tile flip animation (issue-1111)", () => {
  describe("GameTile", () => {
    it("adds the tile-flip class when a tile is evaluated", () => {
      const { container } = render(<GameTile letter="B" state="correct" />);
      const tile = container.firstChild as HTMLElement;
      expect(tile.className).toMatch(/tile-flip/);
    });

    it("does not add the tile-flip class to an empty tile", () => {
      const { container } = render(<GameTile letter="A" state="empty" />);
      const tile = container.firstChild as HTMLElement;
      expect(tile.className).not.toMatch(/tile-flip/);
    });

    it("honours an explicit flip delay via the --flip-delay custom property", () => {
      const { container } = render(
        <GameTile letter="B" state="present" flipDelayMs={250} />,
      );
      const tile = container.firstChild as HTMLElement;
      expect(tile.style.getPropertyValue("--flip-delay")).toBe("250ms");
    });
  });

  describe("AccessibleGameBoard", () => {
    const rows: GameCell[][] = [
      [
        { letter: "A", status: "correct" },
        { letter: "P", status: "present" },
        { letter: "P", status: "absent" },
        { letter: "E", status: "empty" },
      ],
    ];

    it("staggers evaluated tiles by 250ms per letter position", () => {
      render(
        <AccessibleGameBoard
          rows={rows}
          currentRow={0}
          maxGuesses={6}
          guessesUsed={0}
        />,
      );
      const cells = screen.getAllByRole("gridcell");
      expect(cells[0].className).toMatch(/tile-flip/);
      expect(cells[0].style.getPropertyValue("--flip-delay")).toBe("0ms");
      expect(cells[1].style.getPropertyValue("--flip-delay")).toBe("250ms");
      expect(cells[2].style.getPropertyValue("--flip-delay")).toBe("500ms");
    });

    it("does not animate empty tiles in the current row", () => {
      render(
        <AccessibleGameBoard
          rows={rows}
          currentRow={0}
          maxGuesses={6}
          guessesUsed={0}
        />,
      );
      const cells = screen.getAllByRole("gridcell");
      expect(cells[3].className).not.toMatch(/tile-flip/);
      expect(cells[3].style.getPropertyValue("--flip-delay")).toBe("");
    });

    it("reveals metadata categories only in practice and resets for a new puzzle", () => {
      const { rerender } = render(
        <AccessibleGameBoard
          rows={rows}
          currentRow={0}
          maxGuesses={6}
          guessesUsed={0}
          practiceMode
          practicePuzzleId="practice-1"
          practiceWord="apple"
          wordMetadata={{ apple: { category: "Nature" } }}
        />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Show Category Hint" }));
      expect(screen.getByRole("tooltip").textContent).toBe("Nature");

      rerender(
        <AccessibleGameBoard
          rows={rows}
          currentRow={0}
          maxGuesses={6}
          guessesUsed={0}
          practiceMode
          practicePuzzleId="practice-2"
          practiceWord="apple"
          wordMetadata={{ apple: { category: "Nature" } }}
        />,
      );
      expect(screen.queryByRole("tooltip")).toBeNull();

      rerender(
        <AccessibleGameBoard
          rows={rows}
          currentRow={0}
          maxGuesses={6}
          guessesUsed={0}
          practiceWord="apple"
          wordMetadata={{ apple: { category: "Nature" } }}
        />,
      );
      expect(screen.queryByRole("button", { name: "Show Category Hint" })).toBeNull();
    });
  });
});
