import {
  ResearchObjectComponentType,
  ResearchObjectV1,
  ResearchObjectV1Component,
  neutralizePath,
  recursiveFlattenTree,
} from '@desci-labs/desci-models';
import { DataType } from '@prisma/client';
import { Request, Response } from 'express';

import prisma from 'client';
import parentLogger from 'logger';
import { getDirectoryTree, renameFileInDag } from 'services/ipfs';
import { prepareDataRefs } from 'utils/dataRefTools';
import { generateExternalCidMap, updateManifestComponentDagCids } from 'utils/driveUtils';

import { ErrorResponse, updateManifestDataBucket } from './update';
import { getLatestManifest, persistManifest, separateFileNameAndExtension } from './utils';

interface RenameResponse {
  status?: number;
  manifest: ResearchObjectV1;
  manifestCid: string;
}

export const renameData = async (req: Request, res: Response<RenameResponse | ErrorResponse | string>) => {
  const owner = (req as any).user;
  const { uuid, path, newName, renameComponent } = req.body;
  const logger = parentLogger.child({
    // id: req.id,
    module: 'DATA::RenameController',
    uuid: uuid,
    path: path,
    user: owner.id,
    newName: newName,
    renameComponent: renameComponent,
  });
  logger.trace('Entered DATA::Rename');

  if (uuid === undefined || path === undefined)
    return res.status(400).json({ error: 'uuid, path and newName required' });

  //validate requester owns the node
  const node = await prisma.node.findFirst({
    where: {
      ownerId: owner.id,
      uuid: uuid.endsWith('.') ? uuid : uuid + '.',
    },
  });
  if (!node) {
    logger.warn(`DATA::Rename: auth failed, user id: ${owner.id} does not own node: ${uuid}`);
    return res.status(400).json({ error: 'failed' });
  }

  const latestManifest = await getLatestManifest(uuid, req.query?.g as string, node);
  const dataBucket = latestManifest?.components?.find((c) => c.type === ResearchObjectComponentType.DATA_BUCKET);

  try {
    /*
     ** New name collision check
     */
    const externalCidMap = await generateExternalCidMap(node.uuid);
    const oldFlatTree = recursiveFlattenTree(await getDirectoryTree(dataBucket.payload.cid, externalCidMap));
    const oldPathSplit = path.split('/');
    oldPathSplit.pop();
    oldPathSplit.push(newName);
    const newPath = oldPathSplit.join('/');
    const hasDuplicates = oldFlatTree.some((oldBranch) => oldBranch.path.includes(newPath));
    if (hasDuplicates) {
      logger.info('[DATA::Rename] Rejected as duplicate paths were found');
      return res.status(400).json({ error: 'Name collision' });
    }

    /*
     ** Update in dag
     */
    const splitContextPath = path.split('/');
    splitContextPath.shift(); //remove root
    const linkToRename = splitContextPath.pop();
    const cleanContextPath = splitContextPath.join('/');
    logger.debug(`DATA::Rename cleanContextPath: ${cleanContextPath},  Renaming: ${linkToRename},  to : ${newName}`);
    const { updatedDagCidMap, updatedRootCid } = await renameFileInDag(
      dataBucket.payload.cid,
      cleanContextPath,
      linkToRename,
      newName,
    );

    /*
     ** Updates old paths in the manifest component payloads to the new ones, updates the data bucket root CID and any DAG CIDs changed along the way
     */
    let updatedManifest = updateComponentPathsInManifest({ manifest: latestManifest, oldPath: path, newPath: newPath });

    updatedManifest = updateManifestDataBucket({
      manifest: updatedManifest,
      dataBucketId: dataBucket.id,
      newRootCid: updatedRootCid,
    });

    if (Object.keys(updatedDagCidMap).length) {
      updatedManifest = updateManifestComponentDagCids(updatedManifest, updatedDagCidMap);
    }

    if (renameComponent) {
      const componentIndex = updatedManifest.components.findIndex((c) => c.payload.path === newPath);
      const { fileName } = separateFileNameAndExtension(newName);
      updatedManifest.components[componentIndex].name = fileName;
    }

    /*
     ** Prepare updated refs
     */
    const existingDataRefs = await prisma.dataReference.findMany({
      where: {
        nodeId: node.id,
        userId: owner.id,
        type: { not: DataType.MANIFEST },
      },
    });

    const newRefs = await prepareDataRefs(node.uuid, updatedManifest, updatedRootCid, false);

    const dataRefUpdates = newRefs.map((newRef) => {
      const neutralPath = newRef.path.replace(updatedRootCid, 'root');
      const match = existingDataRefs.find((oldRef) => {
        const neutralRefPath = neutralizePath(oldRef.path);
        if (neutralRefPath === neutralPath) return true;
        if (neutralRefPath.startsWith(path)) {
          const updatedPath = neutralRefPath.replace(path, newPath);
          return updatedPath === neutralPath;
        }
        return false;
      });
      newRef.id = match?.id;
      return newRef;
    });

    const [...updates] = await prisma.$transaction([
      ...(dataRefUpdates as any).map((fd) => {
        return prisma.dataReference.update({ where: { id: fd.id }, data: fd });
      }),
    ]);
    logger.info(`[DATA::Rename] ${updates.length} dataReferences updated`);

    const { persistedManifestCid } = await persistManifest({ manifest: updatedManifest, node, userId: owner.id });
    if (!persistedManifestCid)
      throw Error(`[DATA::RENAME]Failed to persist manifest: ${updatedManifest}, node: ${node}, userId: ${owner.id}`);

    logger.info(`[DATA::Rename] Success, path: ${path} changed to: ${newPath}`);

    return res.status(200).json({
      manifest: updatedManifest,
      manifestCid: persistedManifestCid,
    });
  } catch (e: any) {
    logger.error(`[DATA::Rename] error: ${e}`);
  }
  return res.status(400).json({ error: 'failed' });
};

interface UpdateComponentPathsInManifest {
  manifest: ResearchObjectV1;
  oldPath: string;
  newPath: string;
}

export function updateComponentPathsInManifest({ manifest, oldPath, newPath }: UpdateComponentPathsInManifest) {
  manifest.components.forEach((c: ResearchObjectV1Component, idx) => {
    if (c.payload?.path.startsWith(oldPath)) {
      manifest.components[idx].payload.path = c.payload.path.replace(oldPath, newPath);
    }
  });
  return manifest;
}
