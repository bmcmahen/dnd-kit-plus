export type Entity<T> = {
  id: string;
  namespace: string;
  state: T;
};

type DragState<T> = {
  dragging: Array<Entity<T>>;
  over: Map<string, Entity<T>>;
};

export type GlobalDndState<T> = DragState<T> & {
  dropping: Array<DragState<T>>;
};

type GlobalDndAction<T> =
  /** User initiates a drag */
  | {
      type: "drag-start";
      payload: Array<Entity<T>>;
    }
  /** User drags an element over a viable drop target */
  | {
      type: "drag-over";
      payload: Entity<T>;
    }
  /** User leaves a viable drop target */
  | {
      type: "drag-leave";
    }
  | {
      type: "drag-leave-resolved";
      payload: {
        id: string;
      };
    }
  /** User cancels dragging by dropping outside of a drop zone */
  | {
      type: "drag-canceled";
    }
  /** A drop is initiated by the user, with a mutation expected */
  | {
      type: "drop-pending";
    }
  /** The drop mutation has resolved */
  | {
      type: "drop-resolved";
      payload: {
        id: string;
      };
    }
  /** The drop mutation has been cancelled or has errored */
  | {
      type: "drop-canceled";
      payload: {
        id: string;
      };
    };

export const initialGlobalDndState: GlobalDndState<any> = {
  dragging: [],
  over: new Map(),
  dropping: [],
};

export function dndStateReducer<T>(
  state: GlobalDndState<T>,
  action: GlobalDndAction<T>
): GlobalDndState<T> {
  switch (action.type) {
    case "drag-start":
      return {
        ...state,
        dragging: action.payload,
      };

    case "drag-canceled":
      return {
        ...state,
        dragging: [],
      };

    case "drag-over":
      return {
        ...state,
        over: new Map(
          state.over.set(action.payload.id, {
            status: "over",
            entity: action.payload,
          })
        ),
      };

    case "drag-leave": {
      const current = state.over.get(action.payload.id);

      return {
        ...state,
        over: new Map(
          state.over.set(action.payload.id, {
            ...current,
            status: "leave",
          })
        ),
      };
    }

    case "drag-leave-resolved":
      return {
        ...state,
        over: new Map(state.over.delete(action.payload.id)),
      };

    case "drop-pending":
      return {
        ...state,
        dragging: [],
        over: null,
        dropping: [
          ...state.dropping,
          {
            dragging: state.dragging,
            over: state.over,
          },
        ],
      };

    case "drop-resolved":
    case "drop-canceled":
      return {
        ...state,
        dropping: state.dropping.filter(
          (drop) => drop.over.id !== action.payload.id
        ),
      };

    default:
      return state;
  }
}
