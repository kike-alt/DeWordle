import { createContext } from "react";
import { SubleeminoState, SubleeminoData } from "./SubleeminoTypes";

export interface SubleeminoStore extends SubleeminoState {
  toggleActive: () => void;
  setData: (data: SubleeminoData[]) => void;
}

export const SubleeminoStoreContext = createContext<
  SubleeminoStore | undefined
>(undefined);
