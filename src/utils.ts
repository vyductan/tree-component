import type { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import type { AnyObject } from "@acme/ui/types";

import type { TreeProps } from "./tree";
import type { FlattenedNode, TreeDataNode } from "./types";

export const iOS =
  navigator.userAgent.includes("iPad") ||
  navigator.userAgent.includes("iPhone") ||
  navigator.userAgent.includes("iPod");

function getDragDepth(offset: number, indentationWidth: number) {
  return Math.round(offset / indentationWidth);
}

export function getProjection<TRecord extends AnyObject>(
  items: FlattenedNode<TRecord>[],
  activeId: UniqueIdentifier | undefined,
  overId: UniqueIdentifier | undefined,
  dragOffset: number,
  indentationWidth: number,
  allowDrop?: TreeProps<TRecord>["allowDrop"],
  allowDepthOnDrag?: TreeProps<TRecord>["allowDepthOnDrag"],
): {
  depth: number;
  maxDepth: number;
  minDepth: number;
  parentId: UniqueIdentifier | null;
  parent: FlattenedNode<TRecord> | null;
  isLeaf: boolean;
} | null {
  if (!activeId || !overId) return null;

  const overItemIndex = items.findIndex(({ key }) => key === overId);
  const overItem = items[overItemIndex]!;
  const activeItemIndex = items.findIndex(({ key }) => key === activeId);
  const activeItem = items[activeItemIndex]!;
  const newItems = arrayMove(items, activeItemIndex, overItemIndex);
  const previousItem = newItems[overItemIndex - 1];
  const nextItem = newItems[overItemIndex + 1];
  const dragDepth = getDragDepth(dragOffset, indentationWidth);
  const projectedDepth = activeItem.depth + dragDepth;
  // const maxDepth = getMaxDepth({
  //   previousItem,
  // });
  // const minDepth = getMinDepth({ nextItem });
  let depth = projectedDepth;

  const directParent = findParentWithDepth(depth - 1, previousItem);
  const parent = findParentWhichCanHaveChildren(directParent);

  if (parent === undefined) return null;
  if (parent?.isLeaf) return null;

  const maxDepth = (parent?.depth ?? -1) + 1;
  const minDepth = nextItem?.depth ?? 0;

  const calculatedDepth = allowDepthOnDrag?.({
    activeItem,
    overItem,
    parent,
    flattenedItems: items,
  });

  if (calculatedDepth === null || calculatedDepth === undefined) {
    // if (minDepth > maxDepth) return null;
    // condition first => fix item should not go to back position and not go root
    if (minDepth > maxDepth) {
      depth = minDepth;
    } else if (depth >= maxDepth) {
      depth = maxDepth;
    } else if (depth < minDepth) {
      depth = minDepth;
    }
  } else {
    // Use custom depth
    depth = calculatedDepth;
  }

  const isLeaf = (nextItem?.depth ?? -1) < depth;

  // const parent = getParent();
  const parentId = getParentId();
  // Validate drop with allowDrop callback
  if (allowDrop) {
    const isAllowDrop = allowDrop({
      activeItem,
      overItem,
      parentId,
      parent,
      flattenedItems: items,
    });
    if (!isAllowDrop) return null;
  }

  return { depth, maxDepth, minDepth, parentId, parent, isLeaf };

  function findParentWithDepth(
    depth: number,
    previousItem: FlattenedNode<TRecord> | undefined,
  ) {
    if (!previousItem) return null;
    while (depth < previousItem.depth) {
      if (previousItem.parent === null) return null;
      previousItem = previousItem.parent;
    }
    return previousItem;
  }
  function findParentWhichCanHaveChildren(
    parent: FlattenedNode<TRecord> | null,
  ): FlattenedNode<TRecord> | null | undefined {
    if (!parent) {
      return parent;
    }
    const canHaveChildren = parent.isLeaf ? false : true;
    if (canHaveChildren === false)
      return findParentWhichCanHaveChildren(parent.parent);
    return parent;
  }

  function getParentId() {
    if (depth === 0 || !previousItem) {
      return null;
    }

    if (depth === previousItem.depth) {
      return previousItem.parentId;
    }

    if (depth > previousItem.depth) {
      return previousItem.key;
    }

    const newParent = newItems
      .slice(0, overItemIndex)
      .reverse()
      .find((item) => item.depth === depth)?.parentId;

    return newParent ?? null;
  }
}

// function getMaxDepth({
//   previousItem,
// }: {
//   previousItem: FlattenedNode | undefined;
// }) {
//   if (previousItem) {
//     return previousItem.depth + 1;
//   }

//   return 0;
// }

// function getMinDepth({ nextItem }: { nextItem: FlattenedNode | undefined }) {
//   if (nextItem) {
//     return nextItem.depth;
//   }

//   return 0;
// }

function flatten<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  parentId: UniqueIdentifier | null = null,
  parent: FlattenedNode<TRecord> | null = null,
  depth = 0,
): FlattenedNode<TRecord>[] {
  const result: FlattenedNode<TRecord>[] = [];

  for (const [index, item] of items.entries()) {
    const flattenedItem: FlattenedNode = {
      // key: "1",
      // title: "2",
      ...item,
      parentId,
      depth,
      index,
      // isLeaf: items.length === index + 1,
      parent,
    };
    result.push(flattenedItem);

    if (item.children && item.children.length > 0) {
      result.push(
        ...flatten(item.children, flattenedItem.key, flattenedItem, depth + 1),
      );
    }
  }
  return result;
}

export function flattenTree<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
): FlattenedNode<TRecord>[] {
  return flatten(items);
}

export function buildTree<TRecord extends AnyObject>(
  flattenedItems: FlattenedNode<TRecord>[],
): TreeDataNode<TRecord>[] {
  // Create a type for internal nodes that might not have a record
  type InternalNode = Omit<TreeDataNode<TRecord>, "record"> & {
    record?: TRecord;
  };

  // Create root node without the record property
  const root: InternalNode = {
    key: "root",
    title: "",
    children: [],
  };

  const nodes: Record<string, InternalNode> = { [root.key]: root };
  const items = flattenedItems.map((item) => ({ ...item, children: [] }));

  for (const item of items) {
    const { key } = item;
    const parentId = item.parentId ?? root.key;
    const parent = nodes[parentId] ?? findItem(items, parentId);

    nodes[key] = item;
    if (parent?.children) {
      parent.children.push(item as TreeDataNode<TRecord>);
    }
  }

  // We can safely cast to TreeDataNode[] since we know all items have the required record property
  return root.children ?? [];
}

export function findItem<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  itemId: UniqueIdentifier,
) {
  return items.find(({ key }) => key === itemId);
}

export function findItemDeep<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  itemId: UniqueIdentifier,
): TreeDataNode | undefined {
  for (const item of items) {
    const { key, children } = item;

    if (key === itemId) {
      return item;
    }

    if (children && children.length > 0) {
      const child = findItemDeep(children, itemId);

      if (child) {
        return child;
      }
    }
  }

  return undefined;
}

export function removeItem<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  id: UniqueIdentifier,
) {
  const newItems = [];

  for (const item of items) {
    if (item.key === id) {
      continue;
    }

    if (item.children && item.children.length > 0) {
      item.children = removeItem(item.children, id);
    }

    newItems.push(item);
  }

  return newItems;
}

// export function setProperty<
//   TRecord extends AnyObject,
//   T extends keyof TreeDataNode<TRecord>,
// >(
//   items: TreeDataNode<TRecord>[],
//   id: UniqueIdentifier,
//   property: T,
//   setter: (value: TreeDataNode[TRecord][T]) => TreeDataNode[TRecord][T],
// ) {
//   for (const item of items) {
//     if (item.key === id) {
//       item[property] = setter(item[property]);
//       continue;
//     }

//     if (item.children && item.children.length > 0) {
//       item.children = setProperty(item.children, id, property, setter);
//     }
//   }

//   return [...items];
// }

function countChildren<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  count = 0,
): number {
  for (const { children } of items) {
    if (children && children.length > 0) {
      return countChildren(children, count + 1);
    }
    count = count + 1;
  }
  return count;
}

export function getChildCount<TRecord extends AnyObject>(
  items: TreeDataNode<TRecord>[],
  id: UniqueIdentifier,
) {
  const item = findItemDeep(items, id);

  return item?.children ? countChildren(item.children) : 0;
}

export function removeChildrenOf<TRecord extends AnyObject>(
  items: FlattenedNode<TRecord>[],
  ids: UniqueIdentifier[],
) {
  const excludeParentIds = [...ids];

  return items.filter((item) => {
    if (item.parentId && excludeParentIds.includes(item.parentId)) {
      if (item.children?.length) {
        excludeParentIds.push(item.key);
      }
      return false;
    }

    return true;
  });
}
