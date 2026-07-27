import React from "react";
import { useSubleemino } from "./useSubleemino";
import { SubleeminoData } from "./SubleeminoTypes";

export const SubleeminoComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useSubleemino();

  return (
    <div className="p-4 border rounded">
      <h2>Subleemino Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: SubleeminoData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
