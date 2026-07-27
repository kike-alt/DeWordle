import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BlegodwinComponent } from "./BlegodwinComponent";

describe("BlegodwinComponent", () => {
  it("renders correctly", () => {
    render(<BlegodwinComponent />);
    expect(screen.getByText("Blegodwin Feature")).toBeDefined();
  });
});
