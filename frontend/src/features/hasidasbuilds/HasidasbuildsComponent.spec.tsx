import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HasidasbuildsComponent } from "./HasidasbuildsComponent";

describe("HasidasbuildsComponent", () => {
  it("renders correctly", () => {
    render(<HasidasbuildsComponent />);
    expect(screen.getByText("Hasidasbuilds Feature")).toBeDefined();
  });
});
