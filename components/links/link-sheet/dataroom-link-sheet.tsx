"use client";

import type { ComponentProps } from "react";

import { type ItemPermission as ItemPermissionEE } from "@/ee/features/permissions/components/dataroom-link-sheet";

import LinkSheet from "./index";

export type ItemPermission = ItemPermissionEE;

type DataroomLinkSheetProps = Omit<
  ComponentProps<typeof LinkSheet>,
  "setIsOpen"
> & {
  setIsOpen: (open: boolean) => void;
  /** Only supported by the Enterprise sheet; the core fallback opens normally. */
  initialView?: "files";
};

export function DataroomLinkSheet(props: DataroomLinkSheetProps) {
  return (
    <LinkSheet
      {...props}
      setIsOpen={(value) =>
        props.setIsOpen(
          typeof value === "function" ? value(props.isOpen) : value,
        )
      }
    />
  );
}
