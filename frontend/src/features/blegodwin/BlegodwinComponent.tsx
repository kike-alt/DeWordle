import React from "react";
import { useBlegodwin } from "./useBlegodwin";
import { BlegodwinData } from "./BlegodwinTypes";

export const BlegodwinComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useBlegodwin();

  return (
    <div className="p-4 border rounded">
      <h2>Blegodwin Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: BlegodwinData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
