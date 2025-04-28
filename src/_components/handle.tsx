import type { ButtonProps } from "@acme/ui/components/button";
import { Button } from "@acme/ui/components/button";
import { Icon } from "@acme/ui/icons";

export const HandleButton = (props: ButtonProps) => {
  return (
    <Button
      variant="ghost"
      icon={<Icon icon="icon-[octicon--grabber-16]" />}
      {...props}
    />
  );
};
