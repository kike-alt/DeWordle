import React from "react";
import { useAaseenib } from "./useAaseenib";
import { AaseenibData } from "./AaseenibTypes";

export const AaseenibComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useAaseenib();

  return (
    <div className="p-4 border rounded">
      <h2>Aaseenib Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: AaseenibData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
