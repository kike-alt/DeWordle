import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IbdevlawalComponent } from "./IbdevlawalComponent";

describe("IbdevlawalComponent", () => {
  it("renders correctly", () => {
    render(<IbdevlawalComponent />);
    expect(screen.getByText("Ibdevlawal Feature")).toBeDefined();
  });
});
