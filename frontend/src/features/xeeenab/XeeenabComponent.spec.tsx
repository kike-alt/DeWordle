import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { XeeenabComponent } from "./XeeenabComponent";

describe("XeeenabComponent", () => {
  it("renders correctly", () => {
    render(<XeeenabComponent />);
    expect(screen.getByText("Xeeenab Feature")).toBeDefined();
  });
});
