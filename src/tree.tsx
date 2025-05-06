import type {
  Announcements,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragStartEvent,
  DropAnimation,
  MeasuringConfiguration,
  Modifier,
  UniqueIdentifier,
} from "@dnd-kit/core";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  closestCenter,
  defaultDropAnimation,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMergedState } from "@rc-component/util";
import { createPortal } from "react-dom";

import type { AnyObject } from "@acme/ui/types";

import type { TreeItemProps } from "./_components/tree-item";
import type { FlattenedNode, SensorContext, TreeDataNode } from "./types";
import { TreeItem } from "./_components/tree-item";
import { sortableTreeKeyboardCoordinates } from "./keyboard-coordinates";
import { customVerticalListSortingStrategy } from "./strategy";
import {
  buildTree,
  flattenTree,
  getChildCount,
  getProjection,
  removeChildrenOf,
  removeItem,
  // setProperty,
} from "./utils";

const measuringDefault = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};
const dropAnimationConfig: DropAnimation = {
  keyframes({ transform }) {
    return [
      { opacity: 1, transform: CSS.Transform.toString(transform.initial) },
      {
        opacity: 0,
        transform: CSS.Transform.toString({
          ...transform.final,
          x: transform.final.x + 5,
          y: transform.final.y + 5,
        }),
      },
    ];
  },
  easing: "ease-out",
  sideEffects({ active }) {
    active.node.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: defaultDropAnimation.duration,
      easing: defaultDropAnimation.easing,
    });
  },
};
const adjustTranslate: Modifier = ({ transform }) => {
  return {
    ...transform,
    y: transform.y - 25,
  };
};

type TreeProps<TRecord extends AnyObject = AnyObject> = {
  treeData: TreeDataNode<TRecord>[];

  measuring?: MeasuringConfiguration;

  collapsible?: boolean;
  indentationWidth?: number;
  indicator?: boolean;
  removable?: boolean;

  classNames?: TreeItemProps["classNames"];
  /** Allow animation or not */
  disableAnimation?: {
    drop?: boolean;
    animateLayoutChanges?: boolean;
  };

  /** Expand all tree nodes by default */
  defaultExpandAll?: boolean;
  /** Expand the corresponding tree node by default */
  defaultExpandParent?: boolean;
  /** Expand the specified tree node by default */
  defaultExpandedKeys?: React.Key[];
  /** (Controlled) Expand the specified tree node */
  expandedKeys?: React.Key[];
  /** Callback function for when a treeNode is expanded or collapsed */
  onExpand?: (
    expandedKeys: React.Key[],
    // info: {
    //   // node: EventDataNode<TreeDataType>;
    //   expanded: boolean;
    //   // nativeEvent: MouseEvent;
    // },
  ) => void;

  /** (Controlled) Tree node with checked checkbox */
  checkedKeys?:
    | React.Key[]
    | { checked: React.Key[]; halfChecked: React.Key[] };
  /** Tree node with checkbox checked by default */
  defaultCheckedKeys?: React.Key[];

  /** (Controlled) Set the selected tree node */
  selectedKeys?: React.Key[];
  /** Tree node selected by default */
  defaultSelectedKeys?: React.Key[];
  selectable?: boolean;
  /** Callback function for when the user clicks a treeNode */
  onSelect?: (
    selectedKeys: React.Key[],
    e: {
      event: "select";
      selected: boolean;
      // node: EventDataNode<TreeDataType>;
      // selectedNodes: TreeDataType[];
      // nativeEvent: MouseEvent;
    },
  ) => void;

  // canRootHaveChildren?:
  //   | boolean
  //   | ((dragItem: FlattenedNode<TRecord>) => boolean);

  /** Whether to allow dropping on the node */
  allowDrop?: (
    /// DragEndEvent &
    args: {
      activeItem: TreeDataNode<TRecord>;
      overItem: TreeDataNode<TRecord>;
      parentId: UniqueIdentifier | null;
      parent: TreeDataNode<TRecord> | null;
      flattenedItems: FlattenedNode<TRecord>[];
    },
  ) => boolean;
  allowDepthOnDrag?: (
    /// DragEndEvent &
    args: {
      activeItem: TreeDataNode<TRecord>;
      overItem: TreeDataNode<TRecord>;
      // parentId: UniqueIdentifier | undefined;
      parent: TreeDataNode<TRecord> | null;
      flattenedItems: FlattenedNode<TRecord>[];
    },
  ) => number | null;

  /** Callback function for when the onDragEnd event occurs */
  onDragEnd?: (args: {
    event: DragEndEvent;
    items: TreeDataNode<TRecord>[];
    flattenedItems: FlattenedNode<TRecord>[];
  }) => void;
  /** Callback function for when the onDragEnd event occurs */
  onDragOver?: (args: {
    event: DragOverEvent;
    flattenedItems: FlattenedNode<TRecord>[];
    items: TreeDataNode<TRecord>[];
  }) => void;
};
const Tree = <TRecord extends AnyObject = AnyObject>({
  treeData,

  measuring,

  collapsible = true,
  indicator = true,
  indentationWidth = 48,
  removable,

  disableAnimation,
  classNames,

  expandedKeys: expandedKeysProp,
  defaultExpandedKeys,
  onExpand,

  onDragEnd,
  onDragOver,

  // canRootHaveChildren,

  allowDrop,
  allowDepthOnDrag,
}: TreeProps<TRecord>) => {
  // =========================== Expanded ===========================
  const [expandedKeys, setExpandedKeys] = useMergedState(
    defaultExpandedKeys ?? [],
    {
      value: expandedKeysProp,
      onChange: (value) => {
        onExpand?.(value);
      },
    },
  );

  const [items, setItems] = useState<TreeDataNode[]>(treeData);
  useEffect(() => {
    setItems(treeData);
  }, [treeData]);

  const [activeId, setActiveId] = useState<UniqueIdentifier>();
  const [overId, setOverId] = useState<UniqueIdentifier>();
  const [offsetLeft, setOffsetLeft] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    parentId: UniqueIdentifier | null;
    overId: UniqueIdentifier;
  } | null>();

  const flattenedItems = useMemo(() => {
    const flattenedTree = flattenTree(items);
    const collapsedItems = flattenedTree
      .filter((item) => !expandedKeys.includes(item.key))
      .map((item) => item.key);

    const result = removeChildrenOf(
      flattenedTree,
      activeId ? [activeId, ...collapsedItems] : collapsedItems,
    );

    return result;
  }, [activeId, expandedKeys, items]);

  const projected = getProjection(
    flattenedItems,
    activeId,
    overId,
    offsetLeft,
    indentationWidth,
    allowDrop,
    allowDepthOnDrag,
  );

  const sensorContext: SensorContext = useRef({
    items: flattenedItems,
    offset: offsetLeft,
  });
  const [coordinateGetter] = useState(() =>
    sortableTreeKeyboardCoordinates(sensorContext, indicator, indentationWidth),
  );
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
        // delay: 100,
        // tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
    }),
  );

  const sortedIds = useMemo(
    () => flattenedItems.map(({ key }) => key),
    [flattenedItems],
  );
  const activeItem = activeId
    ? flattenedItems.find(({ key }) => key === activeId)
    : undefined;

  useEffect(() => {
    sensorContext.current = {
      items: flattenedItems,
      offset: offsetLeft,
    };
  }, [flattenedItems, offsetLeft]);

  const announcements: Announcements = {
    onDragStart({ active }) {
      return `Picked up ${active.id}.`;
    },
    onDragMove({ active, over }) {
      return getMovementAnnouncement("onDragMove", active.id, over?.id);
    },
    onDragOver({ active, over }) {
      return getMovementAnnouncement("onDragOver", active.id, over?.id);
    },
    onDragEnd({ active, over }) {
      return getMovementAnnouncement("onDragEnd", active.id, over?.id);
    },
    onDragCancel({ active }) {
      return `Moving was cancelled. ${active.id} was dropped in its original position.`;
    },
  };

  const strategyCallback = useCallback(() => {
    return !!projected;
  }, [projected]);

  return (
    <DndContext
      accessibility={{ announcements }}
      sensors={sensors}
      collisionDetection={closestCenter}
      measuring={measuring ?? measuringDefault}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={sortedIds}
        strategy={customVerticalListSortingStrategy(strategyCallback)}
      >
        <ul role="tree">
          {flattenedItems.map(
            ({ key, title, depth, icon, isLeaf, extra, onClick }) => {
              const collapsed = expandedKeys.includes(key);
              return (
                <TreeItem
                  key={key}
                  id={key}
                  title={title}
                  disableAnimation={disableAnimation}
                  classNames={classNames}
                  depth={
                    key === activeId && projected ? projected.depth : depth
                  }
                  indentationWidth={indentationWidth}
                  indicator={indicator}
                  collapsed={Boolean(
                    // collapsed && children && children.length > 0,
                    collapsed,
                  )}
                  onCollapse={
                    // collapsible && children && children.length > 0
                    collapsible ? () => handleCollapse(key) : undefined
                  }
                  onRemove={removable ? () => handleRemove(key) : undefined}
                  icon={icon}
                  isLeaf={isLeaf}
                  // isLeaf={
                  //   key === activeId && projected ? projected.isLeaf : isLeaf
                  // }
                  // parent={
                  //   key === activeId && projected ? projected.parent : parent
                  // }

                  extra={extra}
                  onClick={onClick}
                />
              );
            },
          )}
          {/* <TreeItem
            key={123}
            id={123}
            title={"xxx"}
            depth={0}
            clone
            childCount={4}
            indentationWidth={indentationWidth}
            icon={"x"}
            disableAnimation={disableAnimation}
            classNames={classNames}
            isLeaf
          /> */}
          {createPortal(
            <DragOverlay
              dropAnimation={
                disableAnimation?.drop ? null : dropAnimationConfig
              }
              modifiers={indicator ? [adjustTranslate] : undefined}
            >
              {activeId && activeItem ? (
                <TreeItem
                  key={activeId}
                  id={activeId}
                  title={activeItem.title}
                  depth={activeItem.depth}
                  clone
                  childCount={getChildCount(items, activeId) + 1}
                  indentationWidth={indentationWidth}
                  icon={activeItem.icon}
                  disableAnimation={disableAnimation}
                  classNames={classNames}
                  isLeaf={activeItem.isLeaf}
                />
              ) : (
                <></>
              )}
            </DragOverlay>,
            document.body,
          )}
        </ul>
      </SortableContext>
    </DndContext>
  );

  function handleDragStart({ active: { id: activeId } }: DragStartEvent) {
    setActiveId(activeId);
    setOverId(activeId);

    const activeItem = flattenedItems.find(({ key }) => key === activeId);

    if (activeItem) {
      setCurrentPosition({
        parentId: activeItem.parentId,
        overId: activeId,
      });
    }

    document.body.style.setProperty("cursor", "grabbing");
  }

  function handleDragMove({ delta }: DragMoveEvent) {
    setOffsetLeft(delta.x);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    setOverId(over?.id ?? undefined);
    onDragOver?.({ event, flattenedItems, items });
  }

  function handleDragEnd({ active, over, ...rest }: DragEndEvent) {
    resetState();

    if (projected && over) {
      const { depth, parentId, parent } = projected;
      const clonedItems: FlattenedNode<TRecord>[] = [...flattenTree(items)];
      const activeItem = clonedItems.find(({ key }) => key === active.id)!;
      const overItem = clonedItems.find(({ key }) => key === over.id)!;
      if (
        allowDrop &&
        !allowDrop({
          activeItem,
          overItem,
          parentId,
          parent,
          flattenedItems,
        })
      ) {
        return;
      }

      const overIndex = clonedItems.findIndex(({ key }) => key === over.id);
      const activeIndex = clonedItems.findIndex(({ key }) => key === active.id);
      const activeTreeItem = clonedItems[activeIndex]!;

      clonedItems[activeIndex] = {
        ...activeTreeItem,
        depth,
        parentId,
      };
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);
      const newItems = buildTree(sortedItems);

      setItems(newItems);
      onDragEnd?.({
        event: { active, over, ...rest },
        items: newItems,
        flattenedItems: flattenTree(newItems),
      });
    }
  }

  function handleDragCancel() {
    resetState();
  }

  function resetState() {
    setOverId(undefined);
    setActiveId(undefined);
    setOffsetLeft(0);
    setCurrentPosition(undefined);

    document.body.style.setProperty("cursor", "");
  }

  function handleRemove(id: UniqueIdentifier) {
    setItems((items) => removeItem(items, id));
  }

  function handleCollapse(id: UniqueIdentifier) {
    if (expandedKeys.includes(id)) {
      setExpandedKeys(expandedKeys.filter((expandedId) => expandedId !== id));
    } else {
      setExpandedKeys([...expandedKeys, id]);
    }
  }

  function getMovementAnnouncement(
    eventName: string,
    activeId: UniqueIdentifier,
    overId?: UniqueIdentifier,
  ) {
    if (overId && projected) {
      if (eventName !== "onDragEnd") {
        if (
          currentPosition &&
          projected.parent?.key === currentPosition.parentId &&
          overId === currentPosition.overId
        ) {
          return;
        } else {
          setCurrentPosition({
            parentId: projected.parentId,
            overId,
          });
        }
      }

      // const clonedItems: FlattenedNode[] = structuredClone(flattenTree(items));
      const clonedItems: FlattenedNode[] = [...flattenTree(items)];
      const overIndex = clonedItems.findIndex(({ key }) => key === overId);
      const activeIndex = clonedItems.findIndex(({ key }) => key === activeId);
      const sortedItems = arrayMove(clonedItems, activeIndex, overIndex);

      const previousItem = sortedItems[overIndex - 1];

      let announcement;
      const movedVerb = eventName === "onDragEnd" ? "dropped" : "moved";
      const nestedVerb = eventName === "onDragEnd" ? "dropped" : "nested";

      if (previousItem) {
        if (projected.depth > previousItem.depth) {
          announcement = `${activeId} was ${nestedVerb} under ${previousItem.key}.`;
        } else {
          let previousSibling: FlattenedNode | undefined = previousItem;
          while (previousSibling && projected.depth < previousSibling.depth) {
            const parentId: UniqueIdentifier | null = previousSibling.parentId;
            previousSibling = sortedItems.find(({ key }) => key === parentId);
          }

          if (previousSibling) {
            announcement = `${activeId} was ${movedVerb} after ${previousSibling.key}.`;
          }
        }
      } else {
        const nextItem = sortedItems[overIndex + 1];
        announcement = `${activeId} was ${movedVerb} before ${nextItem?.key}.`;
      }

      return announcement;
    }

    return;
  }
};

export type { TreeProps };
export { Tree };
