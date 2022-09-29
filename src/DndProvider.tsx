import type { PropsWithChildren } from "react";
import React, { createContext, useMemo, useReducer, useRef } from "react";
import {
  DndContext,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Entity, GlobalDndState } from "./dnd-state";
import { dndStateReducer, initialGlobalDndState } from "./dnd-state";
import type { DndOverlayProps } from "./DndOverlay";
import { DndOverlay } from "./DndOverlay";

export const GlobalDndContext = createContext<GlobalDndState<any>>(
  initialGlobalDndState
);

export const DragEventCallbacksContext = createContext(new Map());

/**
 * DndProvider
 */

type DndProviderProps<T> = PropsWithChildren<
  Pick<DndOverlayProps<T>, "renderEntity">
>;

function DndProviderComponent<T>({
  renderEntity,
  children,
}: DndProviderProps<T>) {
  const defaultSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  const [state, dispatch] = useReducer(dndStateReducer, initialGlobalDndState);

  // allow dnd nodes to register drag event functions, such as
  // onDrop, and onDragOver.
  const dragEventCallbacks = useRef(new Map()).current;

  const overlay = useMemo(() => {
    const showing = state.dragging.length > 0;

    return (
      <DndOverlay
        entities={state.dragging}
        isShowing={showing}
        renderEntity={renderEntity}
      />
    );
  }, [renderEntity, state]);

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragEnd={async (dragEvent) => {
        if (!dragEvent.over) {
          console.log("cannellled");
          dispatch({ type: "drag-canceled" });
          return;
        }

        const id = dragEvent.over.id;

        const fns = dragEventCallbacks.get(dragEvent.over.id);

        const hasDropCallback = fns?.onDrop;

        if (!hasDropCallback) {
          dispatch({ type: "drop-resolved", payload: { id: String(id) } });
          return;
        }

        dispatch({ type: "drop-pending" });

        try {
          await fns.onDrop(state);
          dispatch({ type: "drop-resolved", payload: { id: String(id) } });
        } catch (err) {
          console.error(err);
          dispatch({ type: "drop-canceled", payload: { id: String(id) } });
        }
      }}
      onDragOver={async (dragEvent) => {
        const id = dragEvent.over?.id;

        console.log("drag over", id);

        const fns = dragEventCallbacks.get(id);

        if (!id) {
          const hasLeaveCallback = fns?.onLeave;

          if (!hasLeaveCallback) {
            dispatch({
              type: "drag-leave",
              payload: { immediate: true },
            });
            return;
          }

          dispatch({ type: "drag-leave" });

          try {
            await fns.onLeave();
            dispatch({
              type: "drag-leave-resolved",
              payload: { id: String(id) },
            });
          } catch (err) {
            console.error(err);
            dispatch({
              type: "drag-leave-resolved",
              payload: { id: String(id) },
            });
          }

          return;
        }

        // prevent draggable entities from becoming droppable
        if (state.dragging.find((entity) => entity.id === id)) {
          return;
        }

        let enabled = true;

        // allow conditionally enabling drop targets depending
        // upon local registered function
        if (fns?.enableDrop) {
          enabled = fns.enableDrop(state);
        }

        if (enabled) {
          dispatch({
            type: "drag-over",
            payload: dragEvent.over.data.current.entities[0] as Entity<any>,
          });
        } else {
          dispatch({ type: "drag-leave" });
        }
      }}
      onDragStart={(dragEvent) => {
        const id = dragEvent.active?.id;

        const fns = dragEventCallbacks.get(id);

        let entities = dragEvent.active.data.current.entities;

        if (fns?.onDragStart) {
          const selected = fns.onDragStart(state);
          if (selected.length > 0) {
            entities = selected.map((sel) => ({
              id: sel.id,
              state: sel,
            }));
          }
        }

        dispatch({
          type: "drag-start",
          payload: entities,
        });
      }}
      sensors={defaultSensors}
    >
      <DragEventCallbacksContext.Provider value={dragEventCallbacks}>
        <GlobalDndContext.Provider value={state}>
          {children}
        </GlobalDndContext.Provider>
      </DragEventCallbacksContext.Provider>
      {overlay}
    </DndContext>
  );
}

export const DndProvider = React.memo(DndProviderComponent);
