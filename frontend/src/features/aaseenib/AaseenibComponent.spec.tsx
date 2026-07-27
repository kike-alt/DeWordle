import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AaseenibComponent } from "./AaseenibComponent";

describe("AaseenibComponent", () => {
  it("renders correctly", () => {
    render(<AaseenibComponent />);
    expect(screen.getByText("Aaseenib Feature")).toBeDefined();
  });
});
