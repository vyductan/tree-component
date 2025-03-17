import type { UniqueIdentifier } from "@dnd-kit/core";

import type { AnyObject } from "@acme/ui";

export type TreeDataNode<T extends AnyObject = AnyObject> = {
  key: UniqueIdentifier;
  title: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  isLeaf?: boolean;
  children?: TreeDataNode<T>[];
} & T;

export type FlattenedNode<T extends AnyObject = AnyObject> = TreeDataNode<T> & {
  parentId: UniqueIdentifier | null;

  /*
  How deep in the tree is current item.
  0 - means the item is on the Root level,
  1 - item is child of Root level parent,
  etc.
   */
  depth: number;
  index: number;

  // /*
  // Is item the last one on it's deep level.
  // This could be important for visualizing the depth level (e.g. in case of FolderTreeItemWrapper)
  //  */
  // isLeaf: boolean; present in TreeDataNode
  parent: FlattenedNode<T> | null;
};

export type SensorContext = React.RefObject<{
  items: FlattenedNode[];
  offset: number;
}>;
