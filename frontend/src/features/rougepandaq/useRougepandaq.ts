import { useState } from "react";
import { RougepandaqData } from "./RougepandaqTypes";

export const useRougepandaq = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<RougepandaqData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
