import {
  CodeComponent,
  DataComponent,
  DataComponentPayload,
  PdfComponent,
  PdfComponentPayload,
  ResearchObjectComponentDocumentSubtype,
  ResearchObjectComponentType,
  ResearchObjectV1,
  ResearchObjectV1Component,
} from '@desci-labs/desci-models';
import { DataReference, PublicDataReferenceOnIpfsMirror, User } from '@prisma/client';
import axios from 'axios';
import * as Throttle from 'promise-parallel-throttle';

import prisma from 'client';
import { MEDIA_SERVER_API_KEY, MEDIA_SERVER_API_URL, PUBLIC_IPFS_PATH } from 'config';
import { cleanupManifestUrl } from 'controllers/nodes';
import { uploadDataToEstuary } from 'services/estuary';
import { getIndexedResearchObjects } from 'theGraph';
import { hexToCid, randomUUID64 } from 'utils';
import { asyncMap } from 'utils';
import { generateExternalCidMap } from 'utils/driveUtils';
import { cleanManifestForSaving } from 'utils/manifestDraftUtils';

import {
  addBufferToIpfs,
  downloadFilesAndMakeManifest,
  getDirectoryTree,
  getDirectoryTreeCids,
  resolveIpfsData,
} from './ipfs';

const ESTUARY_MIRROR_ID = 1;

export const createNodeDraftBlank = async (
  owner: User,
  title: string,
  defaultLicense: string,
  researchFields: string[],
) => {
  const { manifest } = await downloadFilesAndMakeManifest({ title, researchFields, defaultLicense, pdf: [], code: [] });
  const { cid: hash } = await addBufferToIpfs(manifest, '');

  const uri = `${hash}`;

  const node = await prisma.node.create({
    data: {
      title: '',
      uuid: randomUUID64(),
      manifestUrl: uri,
      replicationFactor: 0,
      restBody: {},
      ownerId: owner.id,
    },
  });

  await prisma.nodeVersion.create({
    data: {
      manifestUrl: uri,
      nodeId: node.id,
    },
  });

  const nodeCopy = Object.assign({}, node);
  nodeCopy.uuid = nodeCopy.uuid.replace(/\.$/, '');

  return nodeCopy;
};

export const publishCIDS = async ({
  nodeId,
  userId,
  manifestCid,
  nodeVersionId,
  nodeUuid,
}: {
  nodeId: number;
  manifestCid: string;
  userId: number;
  nodeVersionId: number;
  nodeUuid: string;
}) => {
  console.log(`[node::publishCIDS] start`, { nodeId, manifestCid, userId, nodeVersionId, nodeUuid });
  const dataReferences = await prisma.dataReference.findMany({
    where: {
      nodeId,
      userId,
    },
  });

  // start building public refs from private refs for this version

  // start with the manifest ref
  const publicRefs = dataReferences
    .filter((ref) => (ref.type === 'MANIFEST' ? ref.cid === manifestCid : true))
    .map((ref) => ({ ...ref, ...(!ref?.versionId && { versionId: nodeVersionId }) }));

  // return if we have no local manifest ref
  if (publicRefs.length === 0) {
    console.error('[node::publishCIDs] ERR: Local refs NOT found for node', nodeId, 'version', nodeVersionId);
    return false;
  } else {
    console.error(
      `[node::publishCIDs] Success: Local refs found for nodeId=${nodeId} version=${nodeVersionId} cids=${publicRefs
        .map((r) => r.cid)
        .join(', ')}`,
    );
  }

  const activeMirrors = (await prisma.ipfsMirror.findMany()).map((mirror) => mirror.id);

  // ensure public data refs staged matches our data bucket cids
  const latestManifestEntry: ResearchObjectV1 = (await axios.get(`${PUBLIC_IPFS_PATH}/${manifestCid}`)).data;
  // const manifestString = manifestBuffer.toString('utf8');
  if (!latestManifestEntry) {
    console.error('[node::publishCIDS] ERR: Manifest not found for node', nodeId, 'version', nodeVersionId);
  } else {
    console.log(`[node::publishCIDS] manifestString=${latestManifestEntry} cid=${manifestCid}`);
  }

  const rootCid = latestManifestEntry.components.find((c) => c.type === ResearchObjectComponentType.DATA_BUCKET).payload
    .cid; //changing the rootCid to the data bucket entry
  const externalCidMap = await generateExternalCidMap(nodeUuid);
  const dataBucketCids = await getDirectoryTree(rootCid, externalCidMap);
  console.log('[node::publishCIDS] dataBucketCids', dataBucketCids);

  const newPublicRefs = publicRefs.map((v) => {
    const newObj = { ...v };
    delete newObj.id;
    delete newObj.versionId;
    return newObj;
  });
  console.log('[node::publishCIDS] publicRefs', newPublicRefs);
  debugger;

  const createNewPublicDataRefs = prisma.publicDataReference.createMany({
    data: [...newPublicRefs],
    skipDuplicates: true,
  });

  const dataOnMirrorReferences: PublicDataReferenceOnIpfsMirror[] = [];

  for (const dataReference of publicRefs) {
    // do not add the manifest again
    if (dataReference.type === 'MANIFEST' && dataReference.cid !== manifestCid) {
      console.log(
        '[node::publishCIDS] skipping pre-staged manifest ref',
        dataReference.id,
        dataReference.cid,
        dataReference.type,
        dataReference.versionId,
      );
      continue;
    }
    console.log(
      '[node::publishCIDS] stage new public data ref',
      dataReference.id,
      dataReference.cid,
      dataReference.type,
      dataReference.versionId,
    );
    for (const mirror of activeMirrors) {
      dataOnMirrorReferences.push({
        dataReferenceId: dataReference.id,
        mirrorId: mirror,
        status: 'WAITING',
        retryCount: 0,
        providerCount: 0,
      });
    }
  }
  console.log('[node::publishCIDS] dataOnMirrorReferences', dataOnMirrorReferences);
  const createNewIpfsMirrorRefs = prisma.publicDataReferenceOnIpfsMirror.createMany({
    data: dataOnMirrorReferences,
    skipDuplicates: true,
  });
  const updateDataRefVersionIds = prisma.dataReference.updateMany({
    data: { versionId: nodeVersionId },
    where: { id: { in: dataReferences.filter((ref) => ref?.versionId == null).map((ref) => ref.id) } },
  });

  const [publishCIDRefs] = await prisma.$transaction([
    createNewPublicDataRefs,
    // createNewIpfsMirrorRefs,
    // updateDataRefVersionIds,
  ]);
  if (
    publishCIDRefs.count &&
    publishCIDRefs.count === dataReferences.length
    // &&
    // dataOnMirrorRefsResult &&
    // dataOnMirrorRefsResult.count === dataOnMirrorReferences.length
  ) {
    console.log(`[node::publishCIDS] Success: Published ${publishCIDRefs.count} refs for node ${nodeId}`);
    return true;
  }
  console.log(`[node::publishCIDS] FAIL: Did not publish ${publishCIDRefs.count} refs for node ${nodeId}`);
  console.log(
    `[node::publishCIDS] FAIL info nodeId=${nodeId}, publishCIDRefs==${publishCIDRefs.count}=${
      dataReferences.length
    } and dataOnMirrorsRefsResult==${0}=${dataOnMirrorReferences.length}`,
  );
  return false;
};

async function publishComponent(
  component: ResearchObjectV1Component & { userId: number; nodeId: number; nodeUuid: string },
): Promise<boolean> {
  console.log(
    '[nodeManager::publishComponent] START',
    component.id,
    component.name,
    component.type,
    component.nodeUuid,
  );
  let buffer;
  let payload;

  /**
   * Ensure we retrieve the correct content to store/pin based on component type
   */
  // console.log('[publish::publishComponent]', component);
  switch (component.type) {
    case ResearchObjectComponentType.PDF:
      payload = component.payload as PdfComponentPayload;
      buffer = await resolveIpfsData(payload.url);
      break;
    case ResearchObjectComponentType.CODE:
      payload = (component as CodeComponent).payload;
      buffer = await resolveIpfsData(payload.url);
      break;
    case ResearchObjectComponentType.DATA || ResearchObjectComponentType.DATA_BUCKET:
      payload = (component as DataComponent).payload as DataComponentPayload;
      const rootCid = payload.cid;

      const externalCidMap = await generateExternalCidMap(component.nodeUuid);
      const tree = await getDirectoryTreeCids(rootCid, externalCidMap);
      return (
        (
          await Throttle.all(
            tree.map<Throttle.Task<boolean>>((targetCid) => async () => {
              const dataRef = await prisma.publicDataReference.findFirst({
                where: {
                  cid: targetCid,
                  userId: component.userId,
                  nodeId: component.nodeId,
                },
                include: { mirrors: { where: { status: 'SUCCESS', mirrorId: ESTUARY_MIRROR_ID } } },
              });
              try {
                if (dataRef?.mirrors?.length > 0) {
                  // console.log('[SKIP PUBLISHING DATA]::', targetCid);
                  return true;
                }
                const buffer = await resolveIpfsData(targetCid);
                console.log('[DATA BUFFER]::', buffer);
                const { cid, providers } = await uploadDataToEstuary(targetCid, buffer);
                // console.log('Target CID uploaded', targetCid, cid);
                await prisma.publicDataReferenceOnIpfsMirror.update({
                  data: { status: 'SUCCESS', providerCount: providers.length },
                  where: {
                    dataReferenceId_mirrorId: {
                      dataReferenceId: dataRef.id,
                      mirrorId: ESTUARY_MIRROR_ID,
                    },
                  },
                });
                // console.log('targetCid:end', targetCid, cid);

                return cid && cid.length > 0;
              } catch (err) {
                console.error('[nodeManager::publishComponent] ERR', `cid=${targetCid}`, err.message, err);
                await prisma.publicDataReferenceOnIpfsMirror.update({
                  data: { status: 'PENDING', retryCount: { increment: 1 } },
                  where: {
                    dataReferenceId_mirrorId: {
                      dataReferenceId: dataRef.id,
                      mirrorId: ESTUARY_MIRROR_ID,
                    },
                  },
                });
                return false;
              }
            }),
            { maxInProgress: 12 },
          )
        ).filter((a) => !a).length == 0
      );

    default:
      throw new Error(`[publish::publishComponent] unsupported component (${component.type})`);
  }
  const dataRef = await prisma.publicDataReference.findFirst({
    where: {
      cid: payload.url,
      userId: component.userId,
      nodeId: component.nodeId,
    },
    include: { mirrors: { where: { status: 'SUCCESS', mirrorId: ESTUARY_MIRROR_ID } } },
  });
  // console.log('[publish::DataReference]', dataRef.cid, dataRef?.mirrors?.length);
  if (dataRef?.mirrors?.length > 0) {
    // console.log(`[SKIP PUBLISHING ${dataRef.type}]::`, payload.url);
    return true;
  }
  const { cid, providers } = await uploadDataToEstuary(dataRef.cid, buffer);
  // console.log('[published::DataReference]', cid);
  await prisma.publicDataReferenceOnIpfsMirror.update({
    data: { status: 'SUCCESS', providerCount: providers.length },
    where: {
      dataReferenceId_mirrorId: {
        dataReferenceId: dataRef.id,
        mirrorId: ESTUARY_MIRROR_ID,
      },
    },
  });
  return cid && cid.length > 0;
}

async function publishManifest(manifestReference: DataReference): Promise<boolean> {
  console.log('node::publishManifest');
  try {
    const dataRef = await prisma.publicDataReference.findFirst({
      where: {
        cid: manifestReference.cid,
        type: 'MANIFEST',
      },
      include: { mirrors: { where: { status: 'SUCCESS', mirrorId: ESTUARY_MIRROR_ID } } },
    });
    if (dataRef?.mirrors?.length > 0) {
      return true;
    }
    const manifest = await resolveIpfsData(manifestReference.cid);
    const { cid, providers } = await uploadDataToEstuary(manifestReference.cid, manifest);
    await prisma.publicDataReferenceOnIpfsMirror.update({
      data: { status: 'SUCCESS', providerCount: providers.length },
      where: {
        dataReferenceId_mirrorId: {
          dataReferenceId: manifestReference.id,
          mirrorId: ESTUARY_MIRROR_ID,
        },
      },
    });
    return !!cid;
  } catch (e) {
    console.log('[Publish manifest]::Error', e);
    await prisma.publicDataReferenceOnIpfsMirror.update({
      data: { status: 'PENDING', retryCount: { increment: 1 } },
      where: {
        dataReferenceId_mirrorId: {
          dataReferenceId: manifestReference.id,
          mirrorId: ESTUARY_MIRROR_ID,
        },
      },
    });
    return false;
  }
}

export const publishResearchObject = async ({
  uuid,
  cid,
  manifest,
  ownerId,
}: {
  uuid: string;
  cid: string;
  ownerId: number;
  manifest: ResearchObjectV1;
}) => {
  console.log('node::publishResearchObject');
  try {
    const node = await prisma.node.findFirst({
      where: {
        uuid: uuid + '.',
        ownerId,
      },
    });
    const dataReferences = await prisma.publicDataReference.findMany({
      where: {
        nodeId: node.id,
        userId: ownerId,
      },
    });

    const parsedManifest: ResearchObjectV1 = manifest as ResearchObjectV1;

    cleanManifestForSaving(parsedManifest);
    // console.log('[publishResearchObject]::dataReferences', dataReferences);
    const currentManifest = dataReferences.find((ref) => ref.cid === cid && ref.type === 'MANIFEST');
    // console.log('[publishResearchObject]::currentManifest', currentManifest);

    const publishedComponents = await asyncMap<boolean, ResearchObjectV1Component>(
      parsedManifest.components.map((c) => ({ ...c, userId: ownerId, nodeId: node.id, nodeUuid: node.uuid })),
      publishComponent,
    );
    console.log('publishedComponents', publishedComponents);

    // console.log('publishedComponents', publishedComponents);
    const publishedManifests = await asyncMap<boolean, DataReference>(
      [{ ...currentManifest, userId: ownerId, nodeId: node.id }],
      publishManifest,
    );
    // console.log('publishedManifests', publishedManifests);

    return { publishedComponents, publishedManifests };
  } catch (err) {
    console.error('node-publish-err', err);
    throw err;
  }
};

export const getCountNewNodesInXDays = async (daysAgo: number): Promise<number> => {
  console.log('node::getCountNewNodesInXDays');
  const dateXDaysAgo = new Date(new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000);

  const newNodesInXDays = await prisma.node.count({
    where: {
      createdAt: {
        gte: dateXDaysAgo,
      },
    },
  });

  return newNodesInXDays;
};

export const getBytesInXDays = async (daysAgo: number): Promise<number> => {
  console.log('node::getBytesInXDays');
  const dateXDaysAgo = new Date(new Date().getTime() - daysAgo * 24 * 60 * 60 * 1000);

  const bytesInXDays = await prisma.dataReference.aggregate({
    _sum: { size: true },
    where: {
      createdAt: {
        gte: dateXDaysAgo,
      },
    },
  });

  return bytesInXDays._sum.size;
};

export const cacheNodeMetadata = async (uuid: string, manifestCid: string, versionToCache?: number) => {
  try {
    // pull versions indexes from graph node
    const { researchObjects } = await getIndexedResearchObjects([uuid]);
    const history = researchObjects[0];
    const version =
      versionToCache !== undefined && versionToCache < history.versions.length
        ? versionToCache
        : history?.versions.length
        ? history.versions.length - 1
        : 0;

    if (!manifestCid || manifestCid.length === 0) {
      history.versions.reverse();
      console.log('Node version', history, version);
      const cidString = history.versions[version]?.cid || history.recentCid;
      manifestCid = hexToCid(cidString); // manifest cid
      console.log('cidString', cidString);
    }

    // pull manifest data from ipfs
    const gatewayUrl = cleanupManifestUrl(manifestCid);
    // console.log('gatewayUrl', gatewayUrl, manifestCid);
    const manifest: ResearchObjectV1 = (await axios.get(gatewayUrl)).data;
    // console.log('cacheNodeMetadata::Manifest', manifest);

    const pdfs = manifest.components.filter((c) => c.type === ResearchObjectComponentType.PDF) as PdfComponent[];
    console.log('PDFS:::=>>>>>>>>>>>>', pdfs);
    const cid = pdfs[0].payload.url;
    // console.log('Component CID', cid);

    // TODO: handle case where no research-article was published
    if (!cid) {
      console.log('No cid to parse', cid);
      return false;
    }

    let url = '';
    const existingCid = await prisma.nodeCover.findFirst({ where: { cid } });
    console.log('existingCid', existingCid);

    if (existingCid) {
      // use cached cid cover url;
      console.log('Use existing url', url, cid);
      url = existingCid.url;
    } else {
      // create cover
      console.log('create cover url', cid);
      const data = await (
        await axios.post(
          `${MEDIA_SERVER_API_URL}/v1/nodes/cover/${cid}`,
          {},
          {
            headers: { 'x-api-key': MEDIA_SERVER_API_KEY },
          },
        )
      ).data;
      url = data.url;
    }

    // upsert node cover
    await prisma.nodeCover.upsert({
      where: { nodeUuid_version: { nodeUuid: uuid, version: version } },
      create: {
        url: url,
        nodeUuid: uuid,
        cid,
        version: version,
        name: manifest.title,
      },
      update: {
        url: url,
        cid,
        name: manifest.title,
      },
    });
    return { version, uuid, manifestCid };
  } catch (e) {
    console.log('Error cacheNodeMetadata', e);
    return false;
  }
};
