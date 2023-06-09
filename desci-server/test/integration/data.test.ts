import 'mocha';
import { ResearchObjectComponentType, ResearchObjectV1, ResearchObjectV1Component } from '@desci-labs/desci-models';
import { DataType, Node, User, Prisma } from '@prisma/client';
import { expect } from 'chai';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import prisma from '../../src/client';
import { app } from '../../src/index';
import {
  addFilesToDag,
  getDirectoryTree,
  getSizeForCid,
  client as ipfs,
  spawnEmptyManifest,
} from '../../src/services/ipfs';
import { randomUUID64 } from '../../src/utils';
import { validateAndHealDataRefs, validateDataReferences } from '../../src/utils/dataRefTools';
import { addComponentsToManifest, neutralizePath, recursiveFlattenTree } from '../../src/utils/driveUtils';
import { spawnExampleDirDag } from '../util';

describe('Data Controllers', () => {
  let user: User;
  let unauthedUser: User;
  // let node: Node;
  let baseManifest: ResearchObjectV1;
  let baseManifestCid: string;

  const aliceJwtToken = jwt.sign({ email: 'alice@desci.com' }, process.env.JWT_SECRET!, { expiresIn: '1y' });
  const authHeaderVal = `Bearer ${aliceJwtToken}`;
  const bobJwtToken = jwt.sign({ email: 'bob@desci.com' }, process.env.JWT_SECRET!, { expiresIn: '1y' });
  const bobHeaderVal = `Bearer ${bobJwtToken}`;

  before(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "DataReference" CASCADE;`;
    await prisma.$queryRaw`TRUNCATE TABLE "User" CASCADE;`;
    await prisma.$queryRaw`TRUNCATE TABLE "Node" CASCADE;`;

    const BASE_MANIFEST = await spawnEmptyManifest();
    baseManifest = BASE_MANIFEST;
    const BASE_MANIFEST_CID = (await ipfs.add(JSON.stringify(BASE_MANIFEST), { cidVersion: 1, pin: true })).cid;
    baseManifestCid = BASE_MANIFEST_CID.toString();

    user = await prisma.user.create({
      data: {
        email: 'alice@desci.com',
      },
    });
    unauthedUser = await prisma.user.create({
      data: {
        email: 'bob@desci.com',
      },
    });
  });

  describe('Update', () => {
    describe('Update a node with a new file', () => {
      let node: Node;
      let res: request.Response;
      before(async () => {
        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: baseManifestCid,
            replicationFactor: 0,
          },
        });

        res = await request(app)
          .post('/v1/data/update')
          .set('authorization', authHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(baseManifest))
          .field('contextPath', 'root')
          // .send({ uuid: node.uuid, manifest, contextPath: 'root' })
          .attach('files', Buffer.from('test'), 'test.txt');
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return a tree', () => {
        expect(res.body).to.have.property('tree');
      });
      it('should contain newly added file', () => {
        const flatTree = recursiveFlattenTree(res.body.tree);
        const newFile = flatTree.find((f) => neutralizePath(f.path) === 'root/test.txt');
        expect(!!newFile).to.equal(true);
        expect(newFile.type).to.equal('file');
      });
      it('should return a manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return a manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('should have created all necessary data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
      it('should reject if unauthed', async () => {
        const newRes = await request(app)
          .post('/v1/data/update')
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(res.body.manifest))
          .field('contextPath', 'root')
          .attach('files', Buffer.from('test'), 'test2.txt');
        expect(newRes.statusCode).to.not.equal(200);
      });
      it('should reject if wrong user tries to update', async () => {
        const newRes = await request(app)
          .post('/v1/data/update')
          .set('authorization', bobHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(res.body.manifest))
          .field('contextPath', 'root')
          .attach('files', Buffer.from('test'), 'test2.txt');
        expect(newRes.statusCode).to.equal(400);
      });
      it('should reject an update with a file name that already exists in the same directory', async () => {
        const newRes = await request(app)
          .post('/v1/data/update')
          .set('authorization', authHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(res.body.manifest))
          .field('contextPath', 'root')
          .attach('files', Buffer.from('test'), 'test.txt');
        expect(newRes.statusCode).to.equal(400);
      });
      it('should reject an update if more than a single upload method is used (files, new folder, externalCid, externalUrl...)', async () => {
        const newRes = await request(app)
          .post('/v1/data/update')
          .set('authorization', authHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(res.body.manifest))
          .field('externalUrl', JSON.stringify({ url: 'https://github.com/some-repo', path: 'my repo' }))
          .field('contextPath', 'root')
          .attach('files', Buffer.from('test'), 'test.txt');
        expect(newRes.statusCode).to.equal(400);
      });
    });

    describe('Update a node with a new folder', () => {
      let node: Node;
      let res: request.Response;
      before(async () => {
        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: baseManifestCid,
            replicationFactor: 0,
          },
        });

        res = await request(app)
          .post('/v1/data/update')
          .set('authorization', authHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(baseManifest))
          .field('contextPath', 'root')
          .field('newFolderName', 'My New Folder');
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return a tree', () => {
        expect(res.body).to.have.property('tree');
      });
      it('should contain newly added folder', () => {
        const flatTree = recursiveFlattenTree(res.body.tree);
        const newFolder = flatTree.find((f) => neutralizePath(f.path) === 'root/My New Folder');
        expect(!!newFolder).to.equal(true);
        expect(newFolder.type).to.equal('dir');
      });
      it('should return a manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return a manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('should have created all necessary data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
    });
    describe('Update a node with a code repo via external URL', () => {
      let node: Node;
      let res: request.Response;
      const externalRepoUrl = 'https://github.com/github/dev';
      const externalRepoPath = 'A Repo';
      before(async () => {
        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: baseManifestCid,
            replicationFactor: 0,
          },
        });
        res = await request(app)
          .post('/v1/data/update')
          .set('authorization', authHeaderVal)
          .field('uuid', node.uuid!)
          .field('manifest', JSON.stringify(baseManifest))
          .field('contextPath', 'root')
          .field('externalUrl', JSON.stringify({ url: externalRepoUrl, path: externalRepoPath }))
          .field('componentType', ResearchObjectComponentType.CODE);
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return a tree', () => {
        expect(res.body).to.have.property('tree');
      });
      it('should contain newly added external repo', () => {
        const flatTree = recursiveFlattenTree(res.body.tree);
        const newFolder = flatTree.find((f) => neutralizePath(f.path) === 'root/' + externalRepoPath);
        expect(!!newFolder).to.equal(true);
        expect(newFolder.type).to.equal('dir');
      });
      it('should return a manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return a manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('should have created all necessary data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
      it('should have added a code component to the manifest', () => {
        const newCodeComponent = res.body.manifest.components.find(
          (c) => c.type === ResearchObjectComponentType.CODE && c.payload.path === 'root/' + externalRepoPath,
        );
        expect(!!newCodeComponent).to.equal(true);
      });
      it('should have added the repo url to the new code components payload', () => {
        const newCodeComponent = res.body.manifest.components.find(
          (c) => c.type === ResearchObjectComponentType.CODE && c.payload.path === 'root/' + externalRepoPath,
        );

        expect(newCodeComponent.payload.externalUrl).to.equal(externalRepoUrl);
      });
    });
  });

  describe('Retrieve', () => {
    before(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE "DataReference" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "Node" CASCADE;`;
    });

    describe('Retrieves a tree for a draft node without any external CIDs', () => {
      let node: Node;
      const privShareUuid = 'abcdef';
      let res: request.Response;
      let unauthedRes: request.Response;
      let wrongAuthRes: request.Response;
      let privShareRes: request.Response;
      let incorrectPrivShareRes: request.Response;

      before(async () => {
        const manifest = { ...baseManifest };
        const exampleDagCid = await spawnExampleDirDag();
        manifest.components[0].payload.cid = exampleDagCid;
        const manifestCid = (await ipfs.add(JSON.stringify(manifest), { cidVersion: 1, pin: true })).cid.toString();

        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: manifestCid,
            replicationFactor: 0,
          },
        });
        const manifestEntry: Prisma.DataReferenceCreateManyInput = {
          cid: manifestCid,
          userId: user.id,
          root: false,
          directory: false,
          size: await getSizeForCid(manifestCid, false),
          type: DataType.MANIFEST,
          nodeId: node.id,
        };

        await prisma.dataReference.create({ data: manifestEntry });
        await prisma.privateShare.create({ data: { shareId: privShareUuid, nodeUUID: node.uuid! } });
        await validateAndHealDataRefs(node.uuid!, manifestCid, false);

        const dotlessUuid = node.uuid!.substring(0, node.uuid!.length - 1);
        res = await request(app)
          .get(`/v1/data/retrieveTree/${dotlessUuid}/${exampleDagCid}`)
          .set('authorization', authHeaderVal);
        wrongAuthRes = await request(app)
          .get(`/v1/data/retrieveTree/${dotlessUuid}/${exampleDagCid}`)
          .set('authorization', bobHeaderVal);
        unauthedRes = await request(app).get(`/v1/data/retrieveTree/${dotlessUuid}/${exampleDagCid}`);
        privShareRes = await request(app).get(`/v1/data/retrieveTree/${dotlessUuid}/${exampleDagCid}/${privShareUuid}`);
        incorrectPrivShareRes = await request(app).get(
          `/v1/data/retrieveTree/${dotlessUuid}/${exampleDagCid}/wrongShareId`,
        );
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return a tree if authed', () => {
        expect(res.body).to.have.property('tree');
      });
      it('should return a tree if correct shareId', () => {
        expect(privShareRes.body).to.have.property('tree');
        expect(privShareRes.statusCode).to.equal(200);
      });
      it('should reject if unauthed', () => {
        expect(unauthedRes.statusCode).to.not.equal(200);
      });
      it('should reject if wrong user', () => {
        expect(wrongAuthRes.statusCode).to.not.equal(200);
      });
      it('should reject if incorrect shareId', () => {
        expect(incorrectPrivShareRes.statusCode).to.not.equal(200);
      });
    });
  });

  describe('Delete', () => {
    before(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE "DataReference" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "Node" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "CidPruneList" CASCADE;`;
    });

    describe('Deletes a directory from a node', () => {
      let node: Node;
      let res: request.Response;

      const deleteDirPath = 'root/dir/subdir';

      before(async () => {
        let manifest = { ...baseManifest };
        const exampleDagCid = await spawnExampleDirDag();
        manifest.components[0].payload.cid = exampleDagCid;
        const componentsToAdd = ['dir/subdir', 'dir/subdir/b.txt'].map((path) => ({
          name: 'component for ' + path,
          path: 'root/' + path,
          cid: 'anycid',
          componentType: ResearchObjectComponentType.CODE,
          star: true,
        }));
        manifest = addComponentsToManifest(manifest, componentsToAdd);
        const manifestCid = (await ipfs.add(JSON.stringify(manifest), { cidVersion: 1, pin: true })).cid.toString();

        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: manifestCid,
            replicationFactor: 0,
          },
        });
        const manifestEntry: Prisma.DataReferenceCreateManyInput = {
          cid: manifestCid,
          userId: user.id,
          root: false,
          directory: false,
          size: await getSizeForCid(manifestCid, false),
          type: DataType.MANIFEST,
          nodeId: node.id,
        };

        await prisma.dataReference.create({ data: manifestEntry });
        await validateAndHealDataRefs(node.uuid!, manifestCid, false);
        res = await request(app)
          .post(`/v1/data/delete`)
          .set('authorization', authHeaderVal)
          .send({ uuid: node.uuid!, path: deleteDirPath });
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return new manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return new manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
      it('should reject if unauthed', async () => {
        const res = await request(app).post(`/v1/data/delete`).send({ uuid: node.uuid, path: 'root/dir' });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should reject if wrong user', async () => {
        const res = await request(app)
          .post(`/v1/data/delete`)
          .set('authorization', bobHeaderVal)
          .send({ uuid: node.uuid, path: 'root/dir' });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should remove deleted content data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should remove deleted component from manifest', () => {
        const deletedComponentFound = res.body.manifest.components.find((c) => c.payload.path === deleteDirPath);
        expect(!!deletedComponentFound).to.not.equal(true);
      });
      it('should cascade delete all components that were contained within the deleted directory', () => {
        const containedComponentFound = res.body.manifest.components.some((c) =>
          c.payload.path.includes(deleteDirPath),
        );
        expect(!!containedComponentFound).to.not.equal(true);
      });
      it('should add deleted entries to cidPruneList', async () => {
        const deletedCids = [
          'bafybeiceadgl6eqm52csjdkuch4wyawuyckbt6j4jg3tpxgs2we5mgy254',
          'bafkreig7pzyokaqvit2igs564zfj4n4j726ex2auodpwfhfnnxnqgmqklq',
        ];
        const pruneListEntries = await prisma.cidPruneList.findMany({ where: { cid: { in: deletedCids } } });
        const allEntriesFound = deletedCids.every((cid) => pruneListEntries.some((entry) => entry.cid === cid));
        expect(allEntriesFound).to.equal(true);
      });
    });
  });

  describe('Rename', () => {
    before(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE "DataReference" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "Node" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "CidPruneList" CASCADE;`;
    });

    describe('Renames a directory in a node', () => {
      let node: Node;
      let res: request.Response;

      const renameDirPath = 'root/dir/subdir';
      const newPath = renameDirPath.replace('subdir', 'dubdir');

      before(async () => {
        let manifest = { ...baseManifest };
        const exampleDagCid = await spawnExampleDirDag();
        manifest.components[0].payload.cid = exampleDagCid;
        const componentsToAdd = ['dir', 'dir/subdir', 'dir/subdir/b.txt'].map((path) => ({
          name: 'component for ' + path,
          path: 'root/' + path,
          cid: 'anycid',
          componentType: ResearchObjectComponentType.CODE,
          star: true,
        }));
        manifest = addComponentsToManifest(manifest, componentsToAdd);
        const manifestCid = (await ipfs.add(JSON.stringify(manifest), { cidVersion: 1, pin: true })).cid.toString();

        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: manifestCid,
            replicationFactor: 0,
          },
        });
        const manifestEntry: Prisma.DataReferenceCreateManyInput = {
          cid: manifestCid,
          userId: user.id,
          root: false,
          directory: false,
          size: await getSizeForCid(manifestCid, false),
          type: DataType.MANIFEST,
          nodeId: node.id,
        };

        await prisma.dataReference.create({ data: manifestEntry });
        await validateAndHealDataRefs(node.uuid!, manifestCid, false);
        res = await request(app)
          .post(`/v1/data/rename`)
          .set('authorization', authHeaderVal)
          .send({ uuid: node.uuid!, path: renameDirPath, newName: 'dubdir', renameComponent: true });
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return new manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return new manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('databucket dag should contain renamed directory and nested files', async () => {
        const databucketCid = res.body.manifest.components[0].payload.cid;
        const flatTree = recursiveFlattenTree(await getDirectoryTree(databucketCid, {}));
        const renamedDir = flatTree.find((f) => neutralizePath(f.path) === newPath);
        const nestedFile = flatTree.find((f) => neutralizePath(f.path) === newPath + '/b.txt');
        expect(!!renamedDir).to.equal(true);
        expect(!!nestedFile).to.equal(true);
        expect(renamedDir.type).to.equal('dir');
        expect(nestedFile.type).to.equal('file');
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
      it('should reject if unauthed', async () => {
        const res = await request(app)
          .post(`/v1/data/rename`)
          .send({ uuid: node.uuid!, path: renameDirPath, newName: 'dubdir', renameComponent: true });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should reject if wrong user', async () => {
        const res = await request(app)
          .post(`/v1/data/rename`)
          .set('authorization', bobHeaderVal)
          .send({ uuid: node.uuid!, path: renameDirPath, newName: 'dubdir', renameComponent: true });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should rename all appropriate data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should update component path in manifest', () => {
        const oldPathFound = res.body.manifest.components.find((c) => c.payload.path === renameDirPath);
        const newPath = renameDirPath.replace('subdir', 'dubdir');
        const newPathFound = res.body.manifest.components.find((c) => c.payload.path === newPath);
        expect(!!oldPathFound).to.not.equal(true);
        expect(!!newPathFound).to.equal(true);
      });
      it('should cascade update all manifest component paths that were dependent on the renamed directory', () => {
        const oldPathContainedComponentFound = res.body.manifest.components.some((c) =>
          c.payload.path.includes(renameDirPath),
        );
        const containedNewPathFound = res.body.manifest.components.find((c) => c.payload.path === newPath + '/b.txt');
        expect(!!oldPathContainedComponentFound).to.not.equal(true);
        expect(!!containedNewPathFound).to.equal(true);
      });
      it('should rename component card if renameComponent flag is true', () => {
        const componentCard = res.body.manifest.components.find((c) => c.payload.path === newPath);
        expect(componentCard.name).to.equal('dubdir');
      });
      it('should reject if new name already exists within the same directory', async () => {
        const res = await request(app)
          .post(`/v1/data/rename`)
          .set('authorization', authHeaderVal)
          .send({ uuid: node.uuid!, path: 'dir/a.txt', newName: 'c.txt' });
        expect(res.statusCode).to.not.equal(200);
      });
    });
  });

  describe('Move', () => {
    before(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE "DataReference" CASCADE;`;
      await prisma.$queryRaw`TRUNCATE TABLE "Node" CASCADE;`;
    });

    describe('Moves a directory in a node to another location', () => {
      let node: Node;
      let res: request.Response;

      const moveDirPath = 'root/dir/subdir';
      const moveToPath = 'root/subdir';

      before(async () => {
        let manifest = await spawnEmptyManifest();
        // debugger;
        const exampleDagCid = await spawnExampleDirDag();
        const newFileCid = (await ipfs.add(Buffer.from('a'), { cidVersion: 1, pin: true })).cid.toString();
        const { updatedRootCid } = await addFilesToDag(exampleDagCid, 'dir', {
          'd.txt': { cid: newFileCid, size: 1 },
        });
        const { updatedRootCid: newDagCid } = await addFilesToDag(updatedRootCid, 'dir/subdir', {
          'a.txt': { cid: newFileCid, size: 1 },
        });

        manifest.components[0].payload.cid = newDagCid;

        const tree = recursiveFlattenTree(await getDirectoryTree(newDagCid, {}));
        // debugger;
        const componentsToAdd = ['root/dir', 'root/dir/subdir', 'root/dir/subdir/b.txt'].map((path) => {
          const match = tree.find((fd) => neutralizePath(fd.path) === path);
          return {
            name: match.name,
            path: neutralizePath(match.path),
            cid: match.cid,
            componentType: ResearchObjectComponentType.CODE,
            star: true,
          };
        });
        manifest = addComponentsToManifest(manifest, componentsToAdd);
        const manifestCid = (await ipfs.add(JSON.stringify(manifest), { cidVersion: 1, pin: true })).cid.toString();

        node = await prisma.node.create({
          data: {
            ownerId: user.id,
            uuid: randomUUID64(),
            title: '',
            manifestUrl: manifestCid,
            replicationFactor: 0,
          },
        });
        const manifestEntry: Prisma.DataReferenceCreateManyInput = {
          cid: manifestCid,
          userId: user.id,
          root: false,
          directory: false,
          size: await getSizeForCid(manifestCid, false),
          type: DataType.MANIFEST,
          nodeId: node.id,
        };

        await prisma.dataReference.create({ data: manifestEntry });
        await validateAndHealDataRefs(node.uuid!, manifestCid, false);
        res = await request(app)
          .post(`/v1/data/move`)
          .set('authorization', authHeaderVal)
          .send({ uuid: node.uuid!, oldPath: moveDirPath, newPath: moveToPath });
      });

      it('should return status 200', () => {
        expect(res.statusCode).to.equal(200);
      });
      it('should return new manifest', () => {
        expect(res.body).to.have.property('manifest');
      });
      it('should return new manifestCid', () => {
        expect(res.body).to.have.property('manifestCid');
      });
      it('databucket dag should contain moved directory', async () => {
        const databucketCid = res.body.manifest.components[0].payload.cid;
        const flatTree = recursiveFlattenTree(await getDirectoryTree(databucketCid, {}));
        const movedDir = flatTree.find((f) => neutralizePath(f.path) === moveToPath);
        expect(!!movedDir).to.equal(true);
        expect(movedDir.type).to.equal('dir');
      });
      it('should have an updated manifest data bucket cid', () => {
        const oldDataBucketCid = baseManifest.components[0].payload.cid;
        const newDataBucketCid = res.body.manifest.components[0].payload.cid;
        expect(oldDataBucketCid).to.not.equal(newDataBucketCid);
      });
      it('should reject if unauthed', async () => {
        const res = await request(app)
          .post(`/v1/data/move`)
          .send({ uuid: node.uuid!, oldPath: 'root/d.txt', newPath: 'root/dir/d.txt' });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should reject if wrong user', async () => {
        const res = await request(app)
          .post(`/v1/data/move`)
          .set('authorization', bobHeaderVal)
          .send({ uuid: node.uuid!, oldPath: 'root/d.txt', newPath: 'root/dir/d.txt' });
        expect(res.statusCode).to.not.equal(200);
      });
      it('should modify all appropriate data references', async () => {
        const { missingRefs, unusedRefs, diffRefs } = await validateDataReferences(
          node.uuid!,
          res.body.manifestCid,
          false,
        );
        const correctRefs = missingRefs.length === 0 && unusedRefs.length === 0 && Object.keys(diffRefs).length === 0;
        expect(correctRefs).to.equal(true);
      });
      it('should update component path in manifest', () => {
        const oldPathFound = res.body.manifest.components.find((c) => c.payload.path === moveDirPath);
        const newPathFound = res.body.manifest.components.find((c) => c.payload.path === moveToPath);
        expect(!!oldPathFound).to.not.equal(true);
        expect(!!newPathFound).to.equal(true);
      });
      it('should cascade update all manifest component paths that were dependent on the moved directory', () => {
        const oldPathContainedComponentFound = res.body.manifest.components.some((c) =>
          c.payload.path.includes(moveDirPath),
        );
        const containedNewPathFound = res.body.manifest.components.find(
          (c) => c.payload.path === moveToPath + '/b.txt',
        );
        expect(!!oldPathContainedComponentFound).to.not.equal(true);
        expect(!!containedNewPathFound).to.equal(true);
      });
      it('should reject if new path already contains file with the same name', async () => {
        const res = await request(app)
          .post(`/v1/data/move`)
          .set('authorization', authHeaderVal)
          .send({ uuid: node.uuid!, oldPath: 'root/d.txt', newPath: 'root/dir/d.txt' });
        expect(res.statusCode).to.not.equal(200);
      });
      it('manifest component payloads should only contain cids that exist within the DAG', async () => {
        const manifestComponentCids: string[] = [];
        res.body.manifest.components.forEach((c: ResearchObjectV1Component, index) => {
          if (index === 0) return;
          if (c.payload.cid) {
            manifestComponentCids.push(c.payload.cid);
          }
          if (c.payload.url) {
            manifestComponentCids.push(c.payload.url);
          }
        });
        const tree = recursiveFlattenTree(await getDirectoryTree(res.body.manifest.components[0].payload.cid, {}));
        const allCidsExist = manifestComponentCids.every((cid) => {
          const found = tree.find((f) => f.cid === cid);
          return !!found;
        });
        expect(allCidsExist).to.equal(true);
      });
    });
  });
});