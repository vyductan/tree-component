import type { UniqueIdentifier } from "@dnd-kit/core";

import type { AnyObject } from "@acme/ui/types";

export type TreeDataNode<TRecord extends AnyObject = AnyObject> = {
  key: UniqueIdentifier;
  title: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  isLeaf?: boolean;
  children?: TreeDataNode<TRecord>[];
  extra?: React.ReactNode;

  record: TRecord;
};

export type FlattenedNode<TRecord extends AnyObject = AnyObject> =
  TreeDataNode<TRecord> & {
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
    parent: FlattenedNode<TRecord> | null;
  };

export type SensorContext = React.RefObject<{
  items: FlattenedNode[];
  offset: number;
}>;
