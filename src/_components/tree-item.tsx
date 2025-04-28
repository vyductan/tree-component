// TreeItem.tsx
import type { UniqueIdentifier } from "@dnd-kit/core";
import type { AnimateLayoutChanges } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@acme/ui/components/button";
import { Icon } from "@acme/ui/icons";
import { cn } from "@acme/ui/lib/utils";

import type { TreeDataNode } from "../types";
import { iOS } from "../utils";
import { HandleButton } from "./handle";

const animateLayoutChanges: AnimateLayoutChanges = ({
  isSorting,
  wasDragging,
}) => (isSorting || wasDragging ? false : true);

type TreeItemProps = Omit<React.ComponentProps<"li">, "id"> &
  Omit<TreeDataNode, "children"> & {
    id: UniqueIdentifier;
    depth: number;
    indentationWidth: number;
    // value: string;

    collapsed?: boolean;
    onCollapse?: () => void;

    onRemove?: () => void;

    /** Dnd clone */
    clone?: boolean;
    indicator?: boolean;
    childCount?: number;

    handler?: boolean;

    /** Own */
    icon?: React.ReactNode;
    /** Allow animation or not */
    disableAnimation?: {
      animateLayoutChanges?: boolean;
    };
    classNames?: {
      item?: string;
      itemContent?: string;
      clone?: string;
    };

    extra?: React.ReactNode;
  };

export function TreeItem({
  id,
  title,

  depth,
  indentationWidth,
  // value,

  collapsed,
  onCollapse,

  onRemove,

  clone,
  indicator,
  childCount,

  handler,

  isLeaf,

  // own
  icon,
  disableAnimation,
  classNames,

  extra,

  ...props
}: TreeItemProps) {
  const {
    attributes,
    isDragging,
    isSorting,
    listeners,
    setDraggableNodeRef,
    setDroppableNodeRef,
    transform,
    transition,
  } = useSortable({
    id,
    animateLayoutChanges: disableAnimation?.animateLayoutChanges
      ? () => false
      : animateLayoutChanges,
  });
  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  const handleProps = {
    ...attributes,
    ...listeners,
  };
  const ghost = isDragging;
  const disableInteraction = isSorting;
  const disableSelection = iOS;

  return (
    <li
      data-slot="tree-item"
      role="treeitem"
      className={cn(
        "group/tree-item",
        "-mb-px list-none pl-(--spacing-depth)",
        // clone && "pointer-events-none inline-block p-0 pt-[5px] pl-2.5",
        clone &&
          cn(
            "pointer-events-none mt-[5px] ml-2.5",
            // inline-block
            classNames?.clone,
          ),
        ghost && [
          indicator && [
            "relative z-10 -mb-px opacity-100",
            // "*:data-[slot=tree-item-content]:relative *:data-[slot=tree-item-content]:bg-red-500",
          ],
          !indicator && "opacity-50",
        ],
        disableInteraction && "pointer-events-none",
        disableSelection && "select-none",
        classNames?.item,
        // own
        "relative",
        // !!extra && "flex",
      )}
      ref={setDroppableNodeRef}
      style={
        {
          "--spacing-depth": `${indentationWidth * depth}px`,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        data-slot="tree-item-content"
        className={cn(
          "relative flex items-center gap-2",
          // "border bg-white px-2.5 py-[10px]",
          // // clone && "rounded-sm py-[5px] pr-6 shadow",
          // // transform current item to indicator if isDraging
          ghost && [
            indicator && [
              "relative h-2 border-blue-500 bg-blue-300 p-0",
              "before:absolute before:-top-1 before:-left-2 before:block before:h-3 before:w-3 before:rounded-full before:border before:border-blue-500 before:bg-white",
              "*:height-0 *:opacity-0",
            ],
            // "*:bg-transparent *:shadow-none",
          ],
          // // "relative h-2 border-blue-500 bg-blue-300 p-0",
          // // "before:absolute before:-top-1 before:-left-2 before:block before:h-3 before:w-3 before:rounded-full before:border before:border-blue-500 before:bg-white",
          // // "*:height-0 *:opacity-0",
          classNames?.itemContent,
          clone && "overflow-visible",
        )}
        ref={setDraggableNodeRef}
        style={style}
        onClick={() => {
          onCollapse?.();
        }}
        {...handleProps}
      >
        {handler && <HandleButton {...handleProps} />}
        {!isLeaf && (
          <Icon
            icon="icon-[lucide--chevron-right]"
            className={cn(
              "aease-[ease] transition-[rotate]",
              collapsed && "rotate-90",
              !onCollapse && "invisible",
            )}
          />
        )}
        {/* {onCollapse && ( */}
        {/*   <Icon */}
        {/*     icon="icon-[lucide--chevron-right]" */}
        {/*     className={cn( */}
        {/*       "aease-[ease] transition-[200]", */}
        {/*       collapsed && "rotate-90", */}
        {/*     )} */}
        {/*   /> */}
        {/* )} */}
        {/* {onCollapse && ( */}
        {/*   <Button */}
        {/*     variant="ghost" */}
        {/*     onClick={(event) => { */}
        {/*       console.log("eee", event); */}
        {/*       event.stopPropagation(); */}
        {/*       onCollapse(); */}
        {/*     }} */}
        {/*     icon={ */}
        {/*       <Icon */}
        {/*         icon="icon-[lucide--chevron-right]" */}
        {/*         className={cn( */}
        {/*           "aease-[ease] transition-[200]", */}
        {/*           collapsed && "rotate-90", */}
        {/*         )} */}
        {/*       /> */}
        {/*     } */}
        {/*   /> */}
        {/* )} */}
        <div className="flex w-full items-center gap-2">
          {icon}
          <span className="truncate">{title}</span>
        </div>

        {!clone && onRemove && (
          <Button
            variant="ghost"
            onClick={onRemove}
            icon={<Icon icon="icon-[lucide--x]" />}
          />
        )}
        {/* <span
          className={cn(
            "text-primay absolute -top-2.5 -right-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-300 text-sm font-semibold",
            "select-none",
          )}
        >
          3
        </span> */}
        {clone && childCount && childCount > 1 ? (
          <span
            className={cn(
              "text-primay absolute -top-2.5 -right-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-300 text-sm font-semibold",
              "select-none",
            )}
          >
            {childCount}
          </span>
        ) : (
          <></>
        )}
      </div>

      {extra}
    </li>
  );
}

export type { TreeItemProps };
