import { createContext } from "react";
import { IbdevlawalState, IbdevlawalData } from "./IbdevlawalTypes";

export interface IbdevlawalStore extends IbdevlawalState {
  toggleActive: () => void;
  setData: (data: IbdevlawalData[]) => void;
}

export const IbdevlawalStoreContext = createContext<
  IbdevlawalStore | undefined
>(undefined);
