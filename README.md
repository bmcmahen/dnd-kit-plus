## Dnd arch

```jsx
function App({ children }) {
  const renderOverlayEntity = useCallback((entity) => {
    return <Card id={entity.id} />;
  }, []);

  return (
    <DndProvider renderEntities={renderOverlayEntity}>{children}</DndProvider>
  );
}
```

Elements which support drag and drop should be wrapped with `DndNode`.

```jsx
function ElementWithDnd({ children }) {
  // function evaluates lazily when an element drags over this one.
  // by default, return false. Determines if drop is permitted.
  const enableDrop = useCallback((entities) => {
    let canDrop = false;
    // iterate through entities to determine if all can be dropped
    return canDrop;
  }, []);

  // when drag start occurs, we can register entities that are being
  // dragged, beyond just this entity itself. These entities will
  // be available in the drop handlers.
  const onDragStart = useCallback(() => {
    return allSelectedEntities;
  }, [allSelectedEntities]);

  // The drop handler allows you to perform data mutations. It's only called
  // when entities are dropped on this specific node.
  const onDrop = useCallback((entities) => {
    return new Promise((resolve, reject) => {
      const error = moveEntitiesToFolder(entities);
      if (err) {
        return reject(err);
      }
      resolve();
    });
  }, []);

  return (
    <DndNode
      id="id"
      namespace="grid"
      enableDrag={true}
      enableDrop={enableDrop}
      onDrop={onDrop}
      onDragStart={onDragStart}
    >
      {children}
    </DndNode>
  );
}
```

Entities can only style drag events as descendants of DndNode, by subscribing
to specific context updates. These context updates only fire when relevant
for the particular DndNode (i.e., when the value changes only for that node). This
strictness better guardes against performance regressions.

```jsx
function ChildOfDndNode({ children }) {
  const status = useDragStatus();

  return (
    <div
      style={{
        border: status === "over" ? "1px solid blue" : "1px solid transparent",
        opacity: status === "drag" ? 0.3 : 1,
      }}
    >
      {children}
    </div>
  );
}
```

Components can integrate draggable apis to encourage better render
performance and prepared animations.

```jsx
const AssetCard = ({ onDrop, children }) => {
  return (
    <DndNode onDrop={onDrop}>
      <AssetCardElement>{children}</AssetCardElement>
    </DndNode>
  );
};
```
