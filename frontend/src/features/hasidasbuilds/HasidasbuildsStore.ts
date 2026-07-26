import { createContext } from "react";
import { HasidasbuildsState, HasidasbuildsData } from "./HasidasbuildsTypes";

export interface HasidasbuildsStore extends HasidasbuildsState {
  toggleActive: () => void;
  setData: (data: HasidasbuildsData[]) => void;
}

export const HasidasbuildsStoreContext = createContext<
  HasidasbuildsStore | undefined
>(undefined);
