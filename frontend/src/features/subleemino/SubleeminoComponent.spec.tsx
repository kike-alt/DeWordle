import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SubleeminoComponent } from "./SubleeminoComponent";

describe("SubleeminoComponent", () => {
  it("renders correctly", () => {
    render(<SubleeminoComponent />);
    expect(screen.getByText("Subleemino Feature")).toBeDefined();
  });
});
