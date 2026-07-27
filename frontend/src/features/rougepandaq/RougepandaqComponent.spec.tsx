import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RougepandaqComponent } from "./RougepandaqComponent";

describe("RougepandaqComponent", () => {
  it("renders correctly", () => {
    render(<RougepandaqComponent />);
    expect(screen.getByText("Rougepandaq Feature")).toBeDefined();
  });
});
