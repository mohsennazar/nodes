import { DataType, Prisma } from '@prisma/client';
import axios from 'axios';

import prisma from 'client';
import { cleanupManifestUrl } from 'controllers/nodes';
import parentLogger from 'logger';
import { getSizeForCid } from 'services/ipfs';
import { getIndexedResearchObjects } from 'theGraph';
import { hexToCid } from 'utils';
import { validateAndHealDataRefs, validateDataReferences } from 'utils/dataRefTools';

/* 
Usage Guidelines:
- validate makes no changes, just outputs the validation results.
- heal will add missing refs, remove unused refs, and fix refs with a diff discrepancy.
- fillPublic will fill a nodes public data refs that is published on another nodes environment, under the USER_EMAIL provided.
- PUBLIC_REFS is an optional flag, if true, it will fix public refs.
- START and END are optional flags, if set, it will only process nodes within the range.
- MARK_EXTERNALS is an optional flag, if true, it will mark external refs as external, downside is that it can take significantly longer to process, also size diff checking disabled when marking externals.
- TX_HASH is an optional param, used for fixing node version of a specific published node version. (Edgecase of multiple publishes with same manifestCid)
- USER_EMAIL is only required for the fillPublic operation

Operation Types [validate, heal, validateAll, healAll]

Usage Examples:
validate:     OPERATION=validate NODE_UUID=noDeUuiD. MANIFEST_CID=bafkabc123 PUBLIC_REFS=true npm run script:fix-data-refs
heal:         OPERATION=heal NODE_UUID=noDeUuiD. MANIFEST_CID=bafkabc123 PUBLIC_REFS=true npm run script:fix-data-refs
validateAll:  OPERATION=validateAll PUBLIC_REFS=true npm run script:fix-data-refs
healAll:      OPERATION=healAll PUBLIC_REFS=true npm run script:fix-data-refs
fillPublic:   OPERATION=fillPublic USER_EMAIL=noreply@desci.com NODE_UUID=noDeUuiD. npm run script:fix-data-refs

Heal external flag in refs:
healAll:      OPERATION=healAll PUBLIC_REFS=true MARK_EXTERNALS=true npm run script:fix-data-refs
 */

const logger = parentLogger.child({ module: 'SCRIPTS::dataRefDoctor' });

main();
function main() {
  const { operation, nodeUuid, manifestCid, publicRefs, start, end, markExternals, txHash, userEmail } =
    getOperationEnvs();
  const startIterator = isNaN(start as any) ? undefined : parseInt(start);
  const endIterator = isNaN(end as any) ? undefined : parseInt(end);

  switch (operation) {
    case 'validate':
      if (!nodeUuid && !manifestCid) return logger.error('Missing NODE_UUID or MANIFEST_CID');
      validateDataReferences(nodeUuid, manifestCid, publicRefs, markExternals, txHash);
      break;
    case 'heal':
      if (!nodeUuid && !manifestCid) return logger.error('Missing NODE_UUID or MANIFEST_CID');
      validateAndHealDataRefs(nodeUuid, manifestCid, publicRefs, markExternals, txHash);
      break;
    case 'validateAll':
      dataRefDoctor(false, publicRefs, startIterator, endIterator, markExternals);
      break;
    case 'healAll':
      dataRefDoctor(true, publicRefs, startIterator, endIterator, markExternals);
      break;
    case 'fillPublic':
      if (!nodeUuid && !userEmail) return logger.error('Missing NODE_UUID or USER_EMAIL');
      fillPublic(nodeUuid, userEmail);
      break;
    default:
      logger.error('Invalid operation, valid operations include: validate, heal, validateAll, healAll');
      return;
  }
}

function getOperationEnvs() {
  return {
    operation: process.env.OPERATION || null,
    nodeUuid: process.env.NODE_UUID || null,
    manifestCid: process.env.MANIFEST_CID || null,
    publicRefs: process.env.PUBLIC_REFS?.toLowerCase() === 'true' ? true : false,
    start: process.env.START,
    end: process.env.END,
    markExternals: process.env.MARK_EXTERNALS?.toLowerCase() === 'true' ? true : false,
    txHash: process.env.TX_HASH || null,
    userEmail: process.env.USER_EMAIL || null,
  };
}

//todo: add public handling
async function dataRefDoctor(
  heal: boolean,
  publicRefs: boolean,
  start?: number,
  end?: number,
  markExternals?: boolean,
) {
  const nodes = await prisma.node.findMany({
    orderBy: {
      id: 'asc',
    },
  });
  logger.info(`[DataRefDoctor]Nodes found: ${nodes.length}`);

  const startIdx = start || 0;
  const endIdx = end || nodes.length;

  for (let i = startIdx; i < endIdx; i++) {
    try {
      logger.info(`[DataRefDoctor]Processing node: ${nodes[i].id}`);
      const node = nodes[i];

      if (publicRefs) {
        const { researchObjects } = await getIndexedResearchObjects([node.uuid]);
        if (!researchObjects.length) continue;
        const indexedNode = researchObjects[0];
        const totalVersionsIndexed = indexedNode.versions.length || 0;
        if (!totalVersionsIndexed) continue;
        logger.info(
          `[DataRefDoctor]Processing node: ${nodes[i].id}, found versions indexed: ${totalVersionsIndexed}, for nodeUuid: ${node.uuid}`,
        );
        for (let nodeVersIdx = 0; nodeVersIdx < totalVersionsIndexed; nodeVersIdx++) {
          logger.info(
            `[DataRefDoctor]Processing indexed version: ${nodeVersIdx}, with txHash: ${indexedNode.versions[nodeVersIdx]?.id}`,
          );
          const hexCid = indexedNode.versions[nodeVersIdx]?.cid || indexedNode.recentCid;
          const txHash = indexedNode.versions[nodeVersIdx]?.id;
          const manifestCid = hexToCid(hexCid);
          if (heal) {
            await validateAndHealDataRefs(node.uuid, manifestCid, true, markExternals, txHash);
          } else {
            validateDataReferences(node.uuid, manifestCid, true, markExternals, txHash);
          }
        }
      }
      if (!publicRefs) {
        if (heal) {
          await validateAndHealDataRefs(node.uuid, node.manifestUrl, false, markExternals);
        } else {
          await validateDataReferences(node.uuid, node.manifestUrl, false, markExternals);
        }
      }
    } catch (e) {
      logger.error({ error: e, node: nodes[i] }, `[DataRefDoctor]Error processing node: ${nodes[i].id}`);
    }
  }
}

async function fillPublic(nodeUuid: string, userEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) return logger.error(`[FillPublic] Failed to find user with email: ${userEmail}`);

  if (!nodeUuid.endsWith('.')) nodeUuid += '.';
  const { researchObjects } = await getIndexedResearchObjects([nodeUuid]);
  if (!researchObjects.length)
    logger.error(`[FillPublic] Failed to resolve any public nodes with the uuid: ${nodeUuid}`);

  const indexedNode = researchObjects[0];
  const latestHexCid = indexedNode.recentCid;
  const latestManifestCid = hexToCid(latestHexCid);
  const manifestUrl = cleanupManifestUrl(latestManifestCid);
  const latestManifest = await (await axios.get(manifestUrl)).data;

  if (!latestManifest)
    return logger.error(
      { manifestUrl, latestManifestCid },
      `[FillPublic] Failed to retrieve manifest from ipfs cid: ${latestManifestCid}`,
    );

  const title = '[IMPORTED NODE]' + latestManifest.title || 'Imported Node';
  let node = await prisma.node.findUnique({ where: { uuid: nodeUuid } });
  if (!node) {
    node = await prisma.node.create({
      data: {
        title,
        uuid: nodeUuid,
        manifestUrl: latestManifestCid,
        replicationFactor: 0,
        restBody: {},
        ownerId: user.id,
      },
    });
  }

  const totalVersionsIndexed = indexedNode.versions.length || 0;
  try {
    for (let nodeVersIdx = 0; nodeVersIdx < totalVersionsIndexed; nodeVersIdx++) {
      logger.info(
        `[DataRefDoctor]Processing indexed version: ${nodeVersIdx}, with txHash: ${indexedNode.versions[nodeVersIdx]?.id}`,
      );
      const hexCid = indexedNode.versions[nodeVersIdx]?.cid || indexedNode.recentCid;
      const txHash = indexedNode.versions[nodeVersIdx]?.id;
      const manifestCid = hexToCid(hexCid);

      const nodeVersion = await prisma.nodeVersion.create({
        data: {
          nodeId: node.id,
          manifestUrl: manifestCid,
          transactionId: txHash,
        },
      });

      //create pub dref entry for the manifest
      const manifestEntry: Prisma.PublicDataReferenceCreateManyInput = {
        cid: manifestCid,
        userId: node.ownerId,
        root: false,
        directory: false,
        size: await getSizeForCid(manifestCid, false),
        type: DataType.MANIFEST,
        nodeId: node.id,
        versionId: nodeVersion.id,
      };
      await prisma.publicDataReference.create({ data: manifestEntry });

      //generate pub drefs for the bucket
      await validateAndHealDataRefs(node.uuid, manifestCid, true, true, txHash);
      logger.info(
        `[DataRefDoctor]Successfully processed indexed node v: ${nodeVersIdx}, with txHash: ${indexedNode.versions[nodeVersIdx]?.id}, under user: ${user.email}`,
      );
    }
    logger.info(`[FillPublic] Successfully backfilled data refs for public node: ${nodeUuid}`);
  } catch (e) {
    logger.error(
      {
        err: e,
        nodeUuid,
        latestHexCid,
        latestManifestCid,
        userEmail,
        manifestUrl,
        latestManifest,
        totalVersionsIndexed,
        indexedNode,
      },
      `[FillPublic] Failed to backfill data refs for public node: ${nodeUuid}, error`,
    );
  }
}
