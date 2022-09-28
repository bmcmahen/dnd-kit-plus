/* eslint-disable no-param-reassign */
import type { PropsWithChildren } from "react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useMotionValue, useSpring } from "framer-motion";
import type { Entity } from "./dnd-state";

export type DndOverlayProps<T> = {
  /**
   * Toggle the visibility of the overlay. Use this instead
   * of conditionally rendering the overlay.
   */
  isShowing: boolean;
} & DndOverlayContentProps<T>;

/**
 * Dnd Overlay
 *
 * @usage
 *
 * const renderEntity = useCallback((entity) => {
 *  return <AssetCard isOverlay />
 * }, [])
 *
 * <DndOverlay
 *  isShowing={status === 'dragging'}
 *  renderEntity={renderEntity}
 *  entities={entities}
 * />
 *
 * @returns
 */
export function DndOverlay<T>({
  isShowing = false,
  ...other
}: DndOverlayProps<T>) {
  return (
    <>
      {isShowing &&
        ReactDOM.createPortal(<DndOverlayContent {...other} />, document.body)}
    </>
  );
}

export type DndOverlayContentProps<T> = {
  /** Entites which are being dragged. */
  entities: Array<Entity<T>>;
  /** Max entities to render in the overlay. */
  maxEntityCount?: number;
  /**
   * Render an entity. This function should be wrapped in a `useCallback`
   * to ensure that it doesn't break memoization.
   */
  renderEntity: (entity: Entity<T>) => React.ReactNode;
};

export function DndOverlayContent<T>({
  maxEntityCount = 5,
  entities,
  renderEntity,
}: DndOverlayContentProps<T>) {
  const { positions, mouseX, mouseY, hasValue } = useMotionValueMousePosition();

  const totalEntityLength = entities.length;

  const entitiesToRender = useMemo(
    () => entities.slice(0, maxEntityCount),
    [maxEntityCount, entities]
  );

  const renderedEntities = useMemo(() => {
    return entitiesToRender.map((entity, i) => {
      return (
        <MountAnimation key={entity.id}>
          {renderEntity(entity)}
          {i === 0 && totalEntityLength > 1 && (
            <div data-dndoverlay-badge>{totalEntityLength}</div>
          )}
        </MountAnimation>
      );
    });
  }, [entitiesToRender, totalEntityLength, renderEntity]);

  if (!hasValue) {
    return null;
  }

  return (
    <>
      {entitiesToRender.map((entity, i) => {
        return (
          <PositionedEntity
            key={entity.id}
            i={i}
            mouseX={mouseX}
            mouseY={mouseY}
            positions={positions}
          >
            {renderedEntities[i]}
          </PositionedEntity>
        );
      })}
    </>
  );
}

/**
 * Similar to useMousePosition, but returns motion values
 * for use with framer-motion. We use these to support spring
 * animations and as a slight performance improvement to reduce
 * rerenders on frequently updating state.
 */

function useMotionValueMousePosition() {
  const mouseX = useMotionValue(-1);
  const mouseY = useMotionValue(-1);
  const [hasValue, setHasValue] = useState(false);
  const [positions] = useState(() => []);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
      setHasValue(true);
    }

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [mouseX, mouseY]);

  return {
    mouseX,
    mouseY,
    hasValue,
    positions,
  };
}

/**
 * Handle animating the position of the entity, supporting
 * trailing animations using springs.
 */

const springConfig = {
  stiffness: 800,
  damping: 55,
};

const STAGGER_OFFSET = 6;

function PositionedEntity({ positions, i, mouseX, mouseY, children }) {
  const previousPositions = positions[i - 1];

  const x = useSpring(
    previousPositions ? previousPositions.x : mouseX,
    springConfig
  );

  const y = useSpring(
    previousPositions ? previousPositions.y : mouseY,
    springConfig
  );

  positions[i] = { x, y };

  return (
    <div
      style={{
        left: `${i * STAGGER_OFFSET}px`,
        top: `${i * STAGGER_OFFSET}px`,
        x: i === 0 ? mouseX : x,
        y: i === 0 ? mouseY : y,
        zIndex: 999 - i,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Handle the intial scale & fade-in of each entity
 */

function MountAnimation({ children }: PropsWithChildren) {
  const ref = useRef(null);
  return <div ref={ref}>{children}</div>;
}
