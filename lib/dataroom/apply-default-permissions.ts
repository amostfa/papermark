import {
  DefaultPermissionStrategy,
  ItemType,
  type RootItemAccess,
} from "@prisma/client";

import { revalidateLinksForDataroom } from "@/lib/api/links/revalidate";
import { resolveRootItemAccessFlags } from "@/lib/dataroom/root-item-access";
import prisma from "@/lib/prisma";

type DataroomDocumentRef = {
  id: string;
  folderId: string | null;
};

type ApplyDefaultsInput = {
  dataroomId: string;
  dataroomDocuments: DataroomDocumentRef[];
  groupStrategy: DefaultPermissionStrategy;
  groupRootItemAccess: RootItemAccess;
  linkStrategy: DefaultPermissionStrategy;
  linkRootItemAccess: RootItemAccess;
};

export async function applyDataroomDocumentPermissionDefaults({
  dataroomId,
  dataroomDocuments,
  groupStrategy,
  groupRootItemAccess,
  linkStrategy,
  linkRootItemAccess,
}: ApplyDefaultsInput): Promise<void> {
  if (dataroomDocuments.length === 0) return;

  const [viewerGroups, permissionGroups] = await Promise.all([
    prisma.viewerGroup.findMany({
      where: { dataroomId },
      select: { id: true },
    }),
    prisma.permissionGroup.findMany({
      where: { dataroomId },
      select: { id: true },
    }),
  ]);

  const documentIds = dataroomDocuments.map((document) => document.id);
  const parentFolderIds = Array.from(
    new Set(
      dataroomDocuments
        .map((document) => document.folderId)
        .filter((folderId): folderId is string => Boolean(folderId)),
    ),
  );

  const groupInherits =
    groupStrategy === DefaultPermissionStrategy.INHERIT_FROM_PARENT;
  const linkInherits =
    linkStrategy === DefaultPermissionStrategy.INHERIT_FROM_PARENT;

  const [parentViewerPermissions, parentLinkPermissions] = await Promise.all([
    groupInherits && parentFolderIds.length > 0 && viewerGroups.length > 0
      ? prisma.viewerGroupAccessControls.findMany({
          where: {
            itemId: { in: parentFolderIds },
            itemType: ItemType.DATAROOM_FOLDER,
            groupId: { in: viewerGroups.map((group) => group.id) },
          },
          select: {
            itemId: true,
            groupId: true,
            canView: true,
            canDownload: true,
          },
        })
      : Promise.resolve([]),
    linkInherits && parentFolderIds.length > 0 && permissionGroups.length > 0
      ? prisma.permissionGroupAccessControls.findMany({
          where: {
            itemId: { in: parentFolderIds },
            itemType: ItemType.DATAROOM_FOLDER,
            groupId: { in: permissionGroups.map((group) => group.id) },
          },
          select: {
            itemId: true,
            groupId: true,
            canView: true,
            canDownload: true,
            canDownloadOriginal: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const viewerRootFlags = resolveRootItemAccessFlags(groupRootItemAccess);
  const linkRootFlags = resolveRootItemAccessFlags(linkRootItemAccess);

  const viewerPermissions = groupInherits
    ? dataroomDocuments.flatMap((document) => {
        if (document.folderId) {
          return parentViewerPermissions
            .filter((permission) => permission.itemId === document.folderId)
            .map((permission) => ({
              groupId: permission.groupId,
              itemId: document.id,
              itemType: ItemType.DATAROOM_DOCUMENT,
              canView: permission.canView,
              canDownload: permission.canDownload,
            }));
        }
        if (!viewerRootFlags) return [];
        return viewerGroups.map((group) => ({
          groupId: group.id,
          itemId: document.id,
          itemType: ItemType.DATAROOM_DOCUMENT,
          canView: viewerRootFlags.canView,
          canDownload: viewerRootFlags.canDownload,
        }));
      })
    : [];

  const linkPermissions = linkInherits
    ? dataroomDocuments.flatMap((document) => {
        if (document.folderId) {
          return parentLinkPermissions
            .filter((permission) => permission.itemId === document.folderId)
            .map((permission) => ({
              groupId: permission.groupId,
              itemId: document.id,
              itemType: ItemType.DATAROOM_DOCUMENT,
              canView: permission.canView,
              canDownload: permission.canDownload,
              canDownloadOriginal: permission.canDownloadOriginal,
            }));
        }
        if (!linkRootFlags) return [];
        return permissionGroups.map((group) => ({
          groupId: group.id,
          itemId: document.id,
          itemType: ItemType.DATAROOM_DOCUMENT,
          canView: linkRootFlags.canView,
          canDownload: linkRootFlags.canDownload,
          canDownloadOriginal: false,
        }));
      })
    : [];

  await prisma.$transaction(async (tx) => {
    await Promise.all([
      viewerGroups.length > 0
        ? tx.viewerGroupAccessControls.deleteMany({
            where: {
              itemId: { in: documentIds },
              itemType: ItemType.DATAROOM_DOCUMENT,
              groupId: { in: viewerGroups.map((group) => group.id) },
            },
          })
        : Promise.resolve(),
      permissionGroups.length > 0
        ? tx.permissionGroupAccessControls.deleteMany({
            where: {
              itemId: { in: documentIds },
              itemType: ItemType.DATAROOM_DOCUMENT,
              groupId: { in: permissionGroups.map((group) => group.id) },
            },
          })
        : Promise.resolve(),
    ]);

    await Promise.all([
      viewerPermissions.length > 0
        ? tx.viewerGroupAccessControls.createMany({
            data: viewerPermissions,
            skipDuplicates: true,
          })
        : Promise.resolve(),
      linkPermissions.length > 0
        ? tx.permissionGroupAccessControls.createMany({
            data: linkPermissions,
            skipDuplicates: true,
          })
        : Promise.resolve(),
    ]);
  });
}

export async function onDataroomDocumentsAttached({
  dataroomId,
  dataroomDocuments,
  schedule,
}: {
  dataroomId: string;
  dataroomDocuments: DataroomDocumentRef[];
  schedule: (promise: Promise<unknown>) => void;
}): Promise<void> {
  const dataroom = await prisma.dataroom.findUnique({
    where: { id: dataroomId },
    select: {
      defaultPermissionStrategy: true,
      defaultGroupPermissionStrategy: true,
      defaultRootItemAccess: true,
      defaultGroupRootItemAccess: true,
    },
  });

  if (!dataroom) return;

  await applyDataroomDocumentPermissionDefaults({
    dataroomId,
    dataroomDocuments,
    groupStrategy: dataroom.defaultGroupPermissionStrategy,
    groupRootItemAccess: dataroom.defaultGroupRootItemAccess,
    linkStrategy: dataroom.defaultPermissionStrategy,
    linkRootItemAccess: dataroom.defaultRootItemAccess,
  });

  schedule(revalidateLinksForDataroom(dataroomId));
}
