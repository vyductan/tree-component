import type { SortingStrategy } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";

export const customVerticalListSortingStrategy = (
  isValid: (activeIndex: number, overIndex: number) => boolean,
): SortingStrategy => {
  const sortingStrategy: SortingStrategy = ({
    activeIndex,
    activeNodeRect,
    index,
    rects,
    overIndex,
  }) => {
    if (isValid(activeIndex, overIndex)) {
      return verticalListSortingStrategy({
        activeIndex,
        activeNodeRect,
        index,
        rects,
        overIndex,
      });
    }
    return null;
  };
  return sortingStrategy;
};
