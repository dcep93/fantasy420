import { useMemo, useState } from "react";

export default function PlayerStats() {
  const [nameFilter, updateNameFilter] = useState("");
  const data = useMemo(() => {
    alert("gotem");
  }, []);
  return (
    <div>
      <div>
        nameFilter:{" "}
        <input
          value={nameFilter}
          onChange={(e) => updateNameFilter(e.currentTarget.value)}
        />
      </div>
    </div>
  );
}
