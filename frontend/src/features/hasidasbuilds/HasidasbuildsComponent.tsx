import React from "react";
import { useHasidasbuilds } from "./useHasidasbuilds";
import { HasidasbuildsData } from "./HasidasbuildsTypes";

export const HasidasbuildsComponent: React.FC = () => {
  const { isActive, toggleActive, data, refresh } = useHasidasbuilds();

  return (
    <div className="p-4 border rounded">
      <h2>Hasidasbuilds Feature</h2>
      <p>Status: {isActive ? "Active" : "Inactive"}</p>
      <button onClick={toggleActive} className="btn">
        Toggle
      </button>
      <button onClick={refresh} className="btn">
        Refresh Data
      </button>
      <ul>
        {data.map((item: HasidasbuildsData, i: number) => (
          <li key={i}>{JSON.stringify(item)}</li>
        ))}
      </ul>
    </div>
  );
};
