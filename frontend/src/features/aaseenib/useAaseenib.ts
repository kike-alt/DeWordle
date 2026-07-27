import { useState } from "react";
import { AaseenibData } from "./AaseenibTypes";

export const useAaseenib = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<AaseenibData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
