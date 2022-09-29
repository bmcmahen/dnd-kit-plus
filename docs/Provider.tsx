import React, { useCallback } from "react";
import { DndProvider } from "../src";
import "./Overlay.css";

export function Provider({ children }) {
  const renderOverlayEntity = useCallback((entity) => {
    return <div className="entity">{entity.id}</div>;
  }, []);

  return (
    <DndProvider renderEntity={renderOverlayEntity}>{children}</DndProvider>
  );
}
