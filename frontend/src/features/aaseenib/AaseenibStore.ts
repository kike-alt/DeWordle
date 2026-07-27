import { createContext } from "react";
import { AaseenibState, AaseenibData } from "./AaseenibTypes";

export interface AaseenibStore extends AaseenibState {
  toggleActive: () => void;
  setData: (data: AaseenibData[]) => void;
}

export const AaseenibStoreContext = createContext<AaseenibStore | undefined>(
  undefined,
);
