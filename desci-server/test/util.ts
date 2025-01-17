import { expect } from 'chai';

import { IpfsDirStructuredInput, IpfsPinnedResult, client as ipfs, pinDirectory } from '../src/services/ipfs';

const expectThrowsAsync = async (method, errorMessage) => {
  let error = null;
  try {
    await method();
  } catch (err) {
    error = err;
    // console.error("expectThrowsAsync", error);
  }
  expect(error).to.be.an('Error');
  if (errorMessage) {
    expect(error.message).to.equal(errorMessage);
  }
};
export { expectThrowsAsync };

// Returns the cid of an example DAG with nestings
export const spawnExampleDirDag = async () => {
  const structuredFiles: IpfsDirStructuredInput[] = [
    {
      path: 'dir/a.txt',
      content: Buffer.from('A'),
    },
    {
      path: 'dir/subdir/b.txt',
      content: Buffer.from('B'),
    },
    {
      path: 'dir/c.txt',
      content: Buffer.from('C'),
    },
    {
      path: 'd.txt',
      content: Buffer.from('D'),
    },
  ];

  const uploaded: IpfsPinnedResult[] = await pinDirectory(structuredFiles, true);
  const rootCid = uploaded[uploaded.length - 1].cid;
  return rootCid;
};
