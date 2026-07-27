import { useState } from "react";
import { IbdevlawalData } from "./IbdevlawalTypes";

export const useIbdevlawal = () => {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [data, setData] = useState<IbdevlawalData[]>([]);

  const toggleActive = () => setIsActive((prev) => !prev);
  const refresh = () => {
    setData([{ id: 1, val: "refreshed" }]);
  };

  return { isActive, toggleActive, data, refresh };
};
