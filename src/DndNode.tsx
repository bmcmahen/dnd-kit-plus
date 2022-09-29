import type { PropsWithChildren } from "react";
import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { mergeRefs } from "react-merge-refs";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { mergeProps } from "@react-aria/utils";
import type { Entity } from "./dnd-state";
import { DragEventCallbacksContext, GlobalDndContext } from "./DndProvider";

const EMPTY_ARRAY = [];

type EnableDrag = boolean;

type EnableDropCallback<T> = (entities: Array<Entity<T>>) => boolean;

type OnDropCallback<T> = (entities: Array<Entity<T>>) => Promise<any>;

type DragStatus =
  | "idle"
  | "dragging"
  | "over"
  | "over-pending"
  | "over-resolved";

type DndNodeProps<T> = PropsWithChildren<{
  getStyle?: any;
  /** the unique id of the node */
  id: string;
  /**
   * the namespace for the dnd node. e.g., Finder, ProjectNav. Used
   * to help identify the source of actions.
   */
  namespace: string;
  /** Enable drop callback */
  enableDrag?: EnableDrag;
  /** Enable drag callback */
  enableDrop?: EnableDropCallback<T>;
  /** handle drop */
  onDrop?: OnDropCallback<T>;
  /**
   * The state to pass to droppable entities, used to render
   * overlays and enableDrop callbacks.
   */
  state?: Entity<T>;
}> &
  React.HTMLAttributes<HTMLDivElement>;

/**
 * Primary DND interface
 * @usage
 *
 * const enableDrop = (entities) => true;
 *
 * const onDrop = (entities) => console.log(entities)
 *
 * <DndNode onDrop={onDrop} enableDrop={enableDrop}>
 *   {children}
 * </DndNode>
 */

export function DndNode<T>({
  id: idProp,
  namespace,
  enableDrag = true,
  enableDrop,
  onDragStart,
  onDrop,
  children,
  getStyle,
  style: styleProp,
  state,
  ...other
}: DndNodeProps<T>) {
  const id = `${namespace}-${idProp}`;

  const onDropPromise = useRef(null);

  const onLeavePromise = useRef(null);

  const {
    isDragging: isDraggingState,
    setNodeRef: setDragRef,
    attributes,
    listeners,
  } = useDraggable({
    id,
    disabled: !enableDrag,
    data: {
      entities: [{ id, state, namespace }],
    },
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id,
    disabled: isDraggingState,
    data: {
      entities: [{ id, state, namespace }],
    },
  });

  /**
   * Register event handlers
   */

  const callbacks = useContext(DragEventCallbacksContext);

  useLayoutEffect(() => {
    const handleDragState = (...args) => {
      if (onDragStart) {
        const ents = onDragStart(...args);
        return ents.map((ent) => ({
          state: ent,
          id: `${namespace}-${ent.id}`,
          namespace,
        }));
      }

      // register handledrop that listens for both animation
      // promises, and mutation promises. and only resolve
      // the callback when all registered promises finish

      return {
        state,
        id,
        namespace,
      };
    };

    const handleDrop = (...args) => {
      return Promise.all([onDrop(...args), onDropPromise.current()]);
    };

    callbacks.set(id, {
      enableDrop,
      onLeave: onLeavePromise.current ? onLeavePromise.current() : undefined,
      onDrop: handleDrop,
      onDragStart: handleDragState,
    });

    return () => {
      callbacks.delete(id);
    };
  }, [enableDrop, id, onDragStart, callbacks, onDrop, namespace, state]);

  /**
   * Prepare component drag context
   */

  const dndContext = useContext(GlobalDndContext);

  const { status, dragging } = useMemo(() => {
    // Something is being dragged over this element
    const isOver = dndContext.over.has(id);

    if (isOver) {
      return {
        status: "over",
        dragging: dndContext.dragging,
      };
    }

    // This element is being dragged, and is visible in the overlay
    const isDragging = dndContext.dragging.some((entity) => entity.id === id);

    if (isDragging) {
      return {
        status: "dragging",
        dragging: dndContext.dragging,
      };
    }

    // Something has been dropped on this dropzone, and a mutation
    // is pending
    const pending = dndContext.dropping.find((pending) => {
      return pending.over.id === id;
    });

    if (pending) {
      return {
        status: "over-pending",
        dragging: pending.dragging,
      };
    }

    // Nothing dnd related is happening to this element
    return {
      status: "idle",
      dragging: EMPTY_ARRAY,
    };
  }, [id, dndContext]);

  /**
   * Allow element to be styled based upon
   * component drag status
   */

  let style = styleProp;

  if (getStyle) {
    style = {
      ...style,
      ...getStyle(status),
    };
  }

  const mergedProps = mergeProps(
    {
      ...attributes,
      ...listeners,
    },
    other
  );

  const ref = mergeRefs([setDropRef, setDragRef]);

  return (
    <RegisterLeavePromiseContext.Provider value={onLeavePromise}>
      <RegisterDropPromiseContext.Provider value={onDropPromise}>
        <DragSourceContext.Provider value={dragging}>
          <DragStatusContext.Provider value={status as DragStatus}>
            <div
              ref={ref}
              data-drag-state={status}
              style={{
                outline: "none",
                userSelect: "none",
                ...style,
              }}
              {...mergedProps}
            >
              {children}
            </div>
          </DragStatusContext.Provider>
        </DragSourceContext.Provider>
      </RegisterDropPromiseContext.Provider>
    </RegisterLeavePromiseContext.Provider>
  );
}

const RegisterLeavePromiseContext = createContext(null);

export const useRegisterLeavePromise = (fn) => {
  const context = useContext(RegisterLeavePromiseContext);

  useLayoutEffect(() => {
    if (context) {
      context.current = fn;
    }
  });
};

const RegisterDropPromiseContext = createContext(null);

const DragSourceContext = createContext(EMPTY_ARRAY);

const DragStatusContext = createContext<DragStatus>("idle");

export const useRegisterDropPromise = (fn) => {
  const context = useContext(RegisterDropPromiseContext);

  useLayoutEffect(() => {
    if (context) {
      context.current = fn;
    }
  });
};

export const useDragStatus = () => {
  return useContext(DragStatusContext);
};

export const useDragSource = () => {
  return useContext(DragSourceContext);
};

export const useDndNodeContext = () => {
  return {
    active: useDragSource(),
    status: useDragStatus(),
  };
};
