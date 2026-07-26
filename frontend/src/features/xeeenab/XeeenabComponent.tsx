import React from "react";
import { useXeeenab } from "./useXeeenab";
import { XeeenabData } from "./XeeenabTypes";

export const XeeenabComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useXeeenab();

  return (
    <div className="p-4 border rounded">
      <h2>Xeeenab Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: XeeenabData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
