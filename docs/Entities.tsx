import React from "react";
import { DndNode } from "../src";
import "./Entities.css";

function enableDrop(entities) {
  console.log(entities);
  return true;
}

export function Entities() {
  return (
    <>
      <DndNode enableDrag className="entity" namespace="grid" id="drag">
        drag
      </DndNode>
      <DndNode
        enableDrag={false}
        enableDrop={enableDrop}
        className="entity"
        namespace="grid"
        id="drop"
      >
        drop
      </DndNode>
    </>
  );
}
