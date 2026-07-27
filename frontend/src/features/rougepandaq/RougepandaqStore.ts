import { createContext } from "react";
import { RougepandaqState, RougepandaqData } from "./RougepandaqTypes";

export interface RougepandaqStore extends RougepandaqState {
  toggleActive: () => void;
  setData: (data: RougepandaqData[]) => void;
}

export const RougepandaqStoreContext = createContext<
  RougepandaqStore | undefined
>(undefined);
