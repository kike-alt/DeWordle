import { useState } from "react";
import { HasidasbuildsData } from "./HasidasbuildsTypes";

export const useHasidasbuilds = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<HasidasbuildsData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
