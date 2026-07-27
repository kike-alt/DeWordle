import { useState } from "react";
import { SubleeminoData } from "./SubleeminoTypes";

export const useSubleemino = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<SubleeminoData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
