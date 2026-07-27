import React from "react";
import { useRougepandaq } from "./useRougepandaq";
import { RougepandaqData } from "./RougepandaqTypes";

export const RougepandaqComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useRougepandaq();

  return (
    <div className="p-4 border rounded">
      <h2>Rougepandaq Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: RougepandaqData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
