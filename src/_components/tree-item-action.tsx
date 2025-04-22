import { cn } from "@acme/ui";
import { GenericSlot } from "@acme/ui/slot";

function TreeItemAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  showOnHover?: boolean;
}) {
  const Comp = asChild ? GenericSlot : "button";

  return (
    <Comp
      data-slot="tree-item-action"
      //   data-sidebar="menu-action"
      className={cn(
        "text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        // Increases the hit area of the button on mobile.
        "after:absolute after:-inset-2 md:after:hidden",
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        "group-data-[collapsible=icon]:hidden",
        // showOnHover &&
        //   "peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",

        // own
        showOnHover &&
          "peer-data-[active=true]/tree-item:text-sidebar-accent-foreground group-focus-within/tree-item:opacity-100 group-hover/tree-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0",
        "w-6",
        "right-1.5", // make button align with select dropdown icon
        "[&_span[role='img']]:shrink-0 [&_span[role='img']:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

export { TreeItemAction };
