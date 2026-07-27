import { useState } from "react";
import { BlegodwinData } from "./BlegodwinTypes";

export const useBlegodwin = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<BlegodwinData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
