import { useState } from "react";
import { XeeenabData } from "./XeeenabTypes";

export const useXeeenab = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<XeeenabData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
