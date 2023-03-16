/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import { Signer, utils, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  VersionedERC721,
  VersionedERC721Interface,
} from "../VersionedERC721";

const _abi = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "approved",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8",
      },
    ],
    name: "Initialized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "_uuid",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "bytes",
        name: "_cid",
        type: "bytes",
      },
    ],
    name: "VersionPush",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
    ],
    name: "__VersionedERC721_init",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "_metadata",
    outputs: [
      {
        internalType: "bytes",
        name: "",
        type: "bytes",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "exists",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "getApproved",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "ownerOf",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "safeTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes4",
        name: "interfaceId",
        type: "bytes4",
      },
    ],
    name: "supportsInterface",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "tokenURI",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
      {
        internalType: "bytes",
        name: "cid",
        type: "bytes",
      },
    ],
    name: "updateMetadata",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506128df806100206000396000f3fe608060405234801561001057600080fd5b506004361061010b5760003560e01c8063599ad936116100a25780639a7fad40116100715780639a7fad40146102dc578063a22cb465146102f8578063b88d4fde14610314578063c87b56dd14610330578063e985e9c5146103605761010b565b8063599ad936146102425780636352211e1461025e57806370a082311461028e57806395d89b41146102be5761010b565b806313859f46116100de57806313859f46146101aa57806323b872dd146101da57806342842e0e146101f65780634f558e79146102125761010b565b806301ffc9a71461011057806306fdde0314610140578063081812fc1461015e578063095ea7b31461018e575b600080fd5b61012a60048036038101906101259190611b84565b610390565b6040516101379190611f9b565b60405180910390f35b610148610472565b6040516101559190611fd8565b60405180910390f35b61017860048036038101906101739190611c42565b610504565b6040516101859190611f34565b60405180910390f35b6101a860048036038101906101a39190611b48565b61054a565b005b6101c460048036038101906101bf9190611c42565b610662565b6040516101d19190611fb6565b60405180910390f35b6101f460048036038101906101ef9190611a42565b610702565b005b610210600480360381019061020b9190611a42565b610762565b005b61022c60048036038101906102279190611c42565b610782565b6040516102399190611f9b565b60405180910390f35b61025c60048036038101906102579190611bd6565b610794565b005b61027860048036038101906102739190611c42565b6107f1565b6040516102859190611f34565b60405180910390f35b6102a860048036038101906102a391906119dd565b6108a3565b6040516102b5919061215a565b60405180910390f35b6102c661095b565b6040516102d39190611fd8565b60405180910390f35b6102f660048036038101906102f19190611c6b565b6109ed565b005b610312600480360381019061030d9190611b0c565b610afa565b005b61032e60048036038101906103299190611a91565b610b10565b005b61034a60048036038101906103459190611c42565b610b72565b6040516103579190611fd8565b60405180910390f35b61037a60048036038101906103759190611a06565b610bda565b6040516103879190611f9b565b60405180910390f35b60007f80ac58cd000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916148061045b57507f5b5e139f000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916145b8061046b575061046a82610c6e565b5b9050919050565b606060658054610481906123b0565b80601f01602080910402602001604051908101604052809291908181526020018280546104ad906123b0565b80156104fa5780601f106104cf576101008083540402835291602001916104fa565b820191906000526020600020905b8154815290600101906020018083116104dd57829003601f168201915b5050505050905090565b600061050f82610cd8565b6069600083815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050919050565b6000610555826107f1565b90508073ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff1614156105c6576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105bd906120fa565b60405180910390fd5b8073ffffffffffffffffffffffffffffffffffffffff166105e5610d23565b73ffffffffffffffffffffffffffffffffffffffff16148061061457506106138161060e610d23565b610bda565b5b610653576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161064a9061209a565b60405180910390fd5b61065d8383610d2b565b505050565b60976020528060005260406000206000915090508054610681906123b0565b80601f01602080910402602001604051908101604052809291908181526020018280546106ad906123b0565b80156106fa5780601f106106cf576101008083540402835291602001916106fa565b820191906000526020600020905b8154815290600101906020018083116106dd57829003601f168201915b505050505081565b61071361070d610d23565b82610de4565b610752576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107499061213a565b60405180910390fd5b61075d838383610e79565b505050565b61077d83838360405180602001604052806000815250610b10565b505050565b600061078d826110e0565b9050919050565b600060019054906101000a900460ff166107e3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016107da9061211a565b60405180910390fd5b6107ed828261114c565b5050565b6000806067600084815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16141561089a576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610891906120da565b60405180910390fd5b80915050919050565b60008073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415610914576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161090b9061207a565b60405180910390fd5b606860008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b60606066805461096a906123b0565b80601f0160208091040260200160405190810160405280929190818152602001828054610996906123b0565b80156109e35780601f106109b8576101008083540402835291602001916109e3565b820191906000526020600020905b8154815290600101906020018083116109c657829003601f168201915b5050505050905090565b8160006109f8610d23565b905060008173ffffffffffffffffffffffffffffffffffffffff16610a1c846107f1565b73ffffffffffffffffffffffffffffffffffffffff1614905080610a75576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610a6c906120ba565b60405180910390fd5b83609760008781526020019081526020016000209080519060200190610a9c92919061177b565b5084610aa6610d23565b73ffffffffffffffffffffffffffffffffffffffff167fabddf73bfc8efbf8287a09ea355e43cf6c0c22880ce0470affeba5271c0a769486604051610aeb9190611fb6565b60405180910390a35050505050565b610b0c610b05610d23565b83836111a9565b5050565b610b21610b1b610d23565b83610de4565b610b60576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610b579061213a565b60405180910390fd5b610b6c84848484611316565b50505050565b6060610b7d82610cd8565b6000610b87611372565b90506000815111610ba75760405180602001604052806000815250610bd2565b80610bb184611389565b604051602001610bc2929190611f10565b6040516020818303038152906040525b915050919050565b6000606a60008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060009054906101000a900460ff16905092915050565b60007f01ffc9a7000000000000000000000000000000000000000000000000000000007bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916827bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916149050919050565b610ce1816110e0565b610d20576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610d17906120da565b60405180910390fd5b50565b600033905090565b816069600083815260200190815260200160002060006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550808273ffffffffffffffffffffffffffffffffffffffff16610d9e836107f1565b73ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92560405160405180910390a45050565b600080610df0836107f1565b90508073ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff161480610e325750610e318185610bda565b5b80610e7057508373ffffffffffffffffffffffffffffffffffffffff16610e5884610504565b73ffffffffffffffffffffffffffffffffffffffff16145b91505092915050565b8273ffffffffffffffffffffffffffffffffffffffff16610e99826107f1565b73ffffffffffffffffffffffffffffffffffffffff1614610eef576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ee69061201a565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415610f5f576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f569061203a565b60405180910390fd5b610f6a838383611536565b610f75600082610d2b565b6001606860008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000828254610fc591906122c6565b925050819055506001606860008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020600082825461101c919061223f565b92505081905550816067600083815260200190815260200160002060006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550808273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60405160405180910390a46110db83838361153b565b505050565b60008073ffffffffffffffffffffffffffffffffffffffff166067600084815260200190815260200160002060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614159050919050565b600060019054906101000a900460ff1661119b576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016111929061211a565b60405180910390fd5b6111a58282611540565b5050565b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff161415611218576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161120f9061205a565b60405180910390fd5b80606a60008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060006101000a81548160ff0219169083151502179055508173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167f17307eab39ab6107e8899845ad3d59bd9653f200f220920489ca2b5937696c31836040516113099190611f9b565b60405180910390a3505050565b611321848484610e79565b61132d848484846115c1565b61136c576040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161136390611ffa565b60405180910390fd5b50505050565b606060405180602001604052806000815250905090565b606060008214156113d1576040518060400160405280600181526020017f30000000000000000000000000000000000000000000000000000000000000008152509050611531565b600082905060005b600082146114035780806113ec90612413565b915050600a826113fc9190612295565b91506113d9565b60008167ffffffffffffffff811115611445577f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6040519080825280601f01601f1916602001820160405280156114775781602001600182028036833780820191505090505b5090505b6000851461152a5760018261149091906122c6565b9150600a8561149f919061245c565b60306114ab919061223f565b60f81b8183815181106114e7577f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350600a856115239190612295565b945061147b565b8093505050505b919050565b505050565b505050565b600060019054906101000a900460ff1661158f576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016115869061211a565b60405180910390fd5b81606590805190602001906115a5929190611801565b5080606690805190602001906115bc929190611801565b505050565b60006115e28473ffffffffffffffffffffffffffffffffffffffff16611758565b1561174b578373ffffffffffffffffffffffffffffffffffffffff1663150b7a0261160b610d23565b8786866040518563ffffffff1660e01b815260040161162d9493929190611f4f565b602060405180830381600087803b15801561164757600080fd5b505af192505050801561167857506040513d601f19601f820116820180604052508101906116759190611bad565b60015b6116fb573d80600081146116a8576040519150601f19603f3d011682016040523d82523d6000602084013e6116ad565b606091505b506000815114156116f3576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016116ea90611ffa565b60405180910390fd5b805181602001fd5b63150b7a0260e01b7bffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916817bffffffffffffffffffffffffffffffffffffffffffffffffffffffff191614915050611750565b600190505b949350505050565b6000808273ffffffffffffffffffffffffffffffffffffffff163b119050919050565b828054611787906123b0565b90600052602060002090601f0160209004810192826117a957600085556117f0565b82601f106117c257805160ff19168380011785556117f0565b828001600101855582156117f0579182015b828111156117ef5782518255916020019190600101906117d4565b5b5090506117fd9190611887565b5090565b82805461180d906123b0565b90600052602060002090601f01602090048101928261182f5760008555611876565b82601f1061184857805160ff1916838001178555611876565b82800160010185558215611876579182015b8281111561187557825182559160200191906001019061185a565b5b5090506118839190611887565b5090565b5b808211156118a0576000816000905550600101611888565b5090565b60006118b76118b28461219a565b612175565b9050828152602081018484840111156118cf57600080fd5b6118da84828561236e565b509392505050565b60006118f56118f0846121cb565b612175565b90508281526020810184848401111561190d57600080fd5b61191884828561236e565b509392505050565b60008135905061192f8161284d565b92915050565b60008135905061194481612864565b92915050565b6000813590506119598161287b565b92915050565b60008151905061196e8161287b565b92915050565b600082601f83011261198557600080fd5b81356119958482602086016118a4565b91505092915050565b600082601f8301126119af57600080fd5b81356119bf8482602086016118e2565b91505092915050565b6000813590506119d781612892565b92915050565b6000602082840312156119ef57600080fd5b60006119fd84828501611920565b91505092915050565b60008060408385031215611a1957600080fd5b6000611a2785828601611920565b9250506020611a3885828601611920565b9150509250929050565b600080600060608486031215611a5757600080fd5b6000611a6586828701611920565b9350506020611a7686828701611920565b9250506040611a87868287016119c8565b9150509250925092565b60008060008060808587031215611aa757600080fd5b6000611ab587828801611920565b9450506020611ac687828801611920565b9350506040611ad7878288016119c8565b925050606085013567ffffffffffffffff811115611af457600080fd5b611b0087828801611974565b91505092959194509250565b60008060408385031215611b1f57600080fd5b6000611b2d85828601611920565b9250506020611b3e85828601611935565b9150509250929050565b60008060408385031215611b5b57600080fd5b6000611b6985828601611920565b9250506020611b7a858286016119c8565b9150509250929050565b600060208284031215611b9657600080fd5b6000611ba48482850161194a565b91505092915050565b600060208284031215611bbf57600080fd5b6000611bcd8482850161195f565b91505092915050565b60008060408385031215611be957600080fd5b600083013567ffffffffffffffff811115611c0357600080fd5b611c0f8582860161199e565b925050602083013567ffffffffffffffff811115611c2c57600080fd5b611c388582860161199e565b9150509250929050565b600060208284031215611c5457600080fd5b6000611c62848285016119c8565b91505092915050565b60008060408385031215611c7e57600080fd5b6000611c8c858286016119c8565b925050602083013567ffffffffffffffff811115611ca957600080fd5b611cb585828601611974565b9150509250929050565b611cc8816122fa565b82525050565b611cd78161230c565b82525050565b6000611ce8826121fc565b611cf28185612212565b9350611d0281856020860161237d565b611d0b81612549565b840191505092915050565b6000611d2182612207565b611d2b8185612223565b9350611d3b81856020860161237d565b611d4481612549565b840191505092915050565b6000611d5a82612207565b611d648185612234565b9350611d7481856020860161237d565b80840191505092915050565b6000611d8d603283612223565b9150611d988261255a565b604082019050919050565b6000611db0602583612223565b9150611dbb826125a9565b604082019050919050565b6000611dd3602483612223565b9150611dde826125f8565b604082019050919050565b6000611df6601983612223565b9150611e0182612647565b602082019050919050565b6000611e19602983612223565b9150611e2482612670565b604082019050919050565b6000611e3c603e83612223565b9150611e47826126bf565b604082019050919050565b6000611e5f600d83612223565b9150611e6a8261270e565b602082019050919050565b6000611e82601883612223565b9150611e8d82612737565b602082019050919050565b6000611ea5602183612223565b9150611eb082612760565b604082019050919050565b6000611ec8602b83612223565b9150611ed3826127af565b604082019050919050565b6000611eeb602e83612223565b9150611ef6826127fe565b604082019050919050565b611f0a81612364565b82525050565b6000611f1c8285611d4f565b9150611f288284611d4f565b91508190509392505050565b6000602082019050611f496000830184611cbf565b92915050565b6000608082019050611f646000830187611cbf565b611f716020830186611cbf565b611f7e6040830185611f01565b8181036060830152611f908184611cdd565b905095945050505050565b6000602082019050611fb06000830184611cce565b92915050565b60006020820190508181036000830152611fd08184611cdd565b905092915050565b60006020820190508181036000830152611ff28184611d16565b905092915050565b6000602082019050818103600083015261201381611d80565b9050919050565b6000602082019050818103600083015261203381611da3565b9050919050565b6000602082019050818103600083015261205381611dc6565b9050919050565b6000602082019050818103600083015261207381611de9565b9050919050565b6000602082019050818103600083015261209381611e0c565b9050919050565b600060208201905081810360008301526120b381611e2f565b9050919050565b600060208201905081810360008301526120d381611e52565b9050919050565b600060208201905081810360008301526120f381611e75565b9050919050565b6000602082019050818103600083015261211381611e98565b9050919050565b6000602082019050818103600083015261213381611ebb565b9050919050565b6000602082019050818103600083015261215381611ede565b9050919050565b600060208201905061216f6000830184611f01565b92915050565b600061217f612190565b905061218b82826123e2565b919050565b6000604051905090565b600067ffffffffffffffff8211156121b5576121b461251a565b5b6121be82612549565b9050602081019050919050565b600067ffffffffffffffff8211156121e6576121e561251a565b5b6121ef82612549565b9050602081019050919050565b600081519050919050565b600081519050919050565b600082825260208201905092915050565b600082825260208201905092915050565b600081905092915050565b600061224a82612364565b915061225583612364565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561228a5761228961248d565b5b828201905092915050565b60006122a082612364565b91506122ab83612364565b9250826122bb576122ba6124bc565b5b828204905092915050565b60006122d182612364565b91506122dc83612364565b9250828210156122ef576122ee61248d565b5b828203905092915050565b600061230582612344565b9050919050565b60008115159050919050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b82818337600083830152505050565b60005b8381101561239b578082015181840152602081019050612380565b838111156123aa576000848401525b50505050565b600060028204905060018216806123c857607f821691505b602082108114156123dc576123db6124eb565b5b50919050565b6123eb82612549565b810181811067ffffffffffffffff8211171561240a5761240961251a565b5b80604052505050565b600061241e82612364565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156124515761245061248d565b5b600182019050919050565b600061246782612364565b915061247283612364565b925082612482576124816124bc565b5b828206905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6000601f19601f8301169050919050565b7f4552433732313a207472616e7366657220746f206e6f6e20455243373231526560008201527f63656976657220696d706c656d656e7465720000000000000000000000000000602082015250565b7f4552433732313a207472616e736665722066726f6d20696e636f72726563742060008201527f6f776e6572000000000000000000000000000000000000000000000000000000602082015250565b7f4552433732313a207472616e7366657220746f20746865207a65726f2061646460008201527f7265737300000000000000000000000000000000000000000000000000000000602082015250565b7f4552433732313a20617070726f766520746f2063616c6c657200000000000000600082015250565b7f4552433732313a2061646472657373207a65726f206973206e6f74206120766160008201527f6c6964206f776e65720000000000000000000000000000000000000000000000602082015250565b7f4552433732313a20617070726f76652063616c6c6572206973206e6f7420746f60008201527f6b656e206f776e6572206e6f7220617070726f76656420666f7220616c6c0000602082015250565b7f4e6f207065726d697373696f6e00000000000000000000000000000000000000600082015250565b7f4552433732313a20696e76616c696420746f6b656e2049440000000000000000600082015250565b7f4552433732313a20617070726f76616c20746f2063757272656e74206f776e6560008201527f7200000000000000000000000000000000000000000000000000000000000000602082015250565b7f496e697469616c697a61626c653a20636f6e7472616374206973206e6f74206960008201527f6e697469616c697a696e67000000000000000000000000000000000000000000602082015250565b7f4552433732313a2063616c6c6572206973206e6f7420746f6b656e206f776e6560008201527f72206e6f7220617070726f766564000000000000000000000000000000000000602082015250565b612856816122fa565b811461286157600080fd5b50565b61286d8161230c565b811461287857600080fd5b50565b61288481612318565b811461288f57600080fd5b50565b61289b81612364565b81146128a657600080fd5b5056fea2646970667358221220e5bc1283adeb80ef56a5bbf55718345d81d4d150adf64eae1dd7390ee77f190d64736f6c63430008040033";

type VersionedERC721ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: VersionedERC721ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class VersionedERC721__factory extends ContractFactory {
  constructor(...args: VersionedERC721ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
    this.contractName = "VersionedERC721";
  }

  deploy(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<VersionedERC721> {
    return super.deploy(overrides || {}) as Promise<VersionedERC721>;
  }
  getDeployTransaction(
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(overrides || {});
  }
  attach(address: string): VersionedERC721 {
    return super.attach(address) as VersionedERC721;
  }
  connect(signer: Signer): VersionedERC721__factory {
    return super.connect(signer) as VersionedERC721__factory;
  }
  static readonly contractName: "VersionedERC721";
  public readonly contractName: "VersionedERC721";
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): VersionedERC721Interface {
    return new utils.Interface(_abi) as VersionedERC721Interface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): VersionedERC721 {
    return new Contract(address, _abi, signerOrProvider) as VersionedERC721;
  }
}