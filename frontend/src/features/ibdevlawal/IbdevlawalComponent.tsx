import React from "react";
import { useIbdevlawal } from "./useIbdevlawal";
import { IbdevlawalData } from "./IbdevlawalTypes";

export const IbdevlawalComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useIbdevlawal();

  return (
    <div className="p-4 border rounded">
      <h2>Ibdevlawal Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: IbdevlawalData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
