import { createContext } from "react";
import { XeeenabState, XeeenabData } from "./XeeenabTypes";

export interface XeeenabStore extends XeeenabState {
  toggleActive: () => void;
  setData: (data: XeeenabData[]) => void;
}

export const XeeenabStoreContext = createContext<XeeenabStore | undefined>(
  undefined,
);
