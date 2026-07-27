import { createContext } from "react";
import { BlegodwinState, BlegodwinData } from "./BlegodwinTypes";

export interface BlegodwinStore extends BlegodwinState {
  toggleActive: () => void;
  setData: (data: BlegodwinData[]) => void;
}

export const BlegodwinStoreContext = createContext<BlegodwinStore | undefined>(
  undefined,
);
