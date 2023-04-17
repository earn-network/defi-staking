import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ContractTransaction } from "@ethersproject/contracts";
import {
  Erc20Mock,
  LockedStaking,
  LockedStakingFactory,
  MYCStakingManager,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Network } from "@ethersproject/networks";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export type ValueToSignLockedStakingFactory = {
  tokenAddress: string;
  owner: string;
  durations: number[];
  maxTokensBeStaked: BigNumber[];
  rewardsPool: BigNumber[];
  mycFeesPool: BigNumber[];
  maxStakingAmount: BigNumber[];
  dateStart: number;
  dateEnd: number;
  deadline: number;
};

export function getExampleValueToSign(
  timestampStart: number,
  timestampEnd: number,
  deadline: number
) {
  const exampleValueToSign: ValueToSignLockedStakingFactory = {
    tokenAddress: "",
    owner: "",
    durations: [20],
    maxTokensBeStaked: [ethers.utils.parseEther("1000")],
    rewardsPool: [ethers.utils.parseEther("100")],
    mycFeesPool: [ethers.utils.parseEther("10")],
    maxStakingAmount: [ethers.utils.parseEther("800")],
    dateStart: timestampStart,
    dateEnd: timestampEnd,
    deadline: deadline,
  };
  return exampleValueToSign;
}

async function deployMYCStakingManager(treasury: string, signer: string) {
  const MYCStakingManager = await ethers.getContractFactory(
    "MYCStakingManager"
  );
  const mycStakingManager = await MYCStakingManager.deploy(treasury, signer);

  return { mycStakingManager };
}

export async function deployLockedStakingFactory(
  treasury: string,
  signer: string,
  mycStakingManager?: MYCStakingManager
) {
  if (!mycStakingManager)
    mycStakingManager = (await deployMYCStakingManager(treasury, signer))
      .mycStakingManager;

  const LockedStakingFactory = await ethers.getContractFactory(
    "LockedStakingFactory"
  );
  const lockedStakingFactory = await LockedStakingFactory.deploy(
    mycStakingManager.address
  );

  return { lockedStakingFactory, mycStakingManager };
}

export async function deployERC20Mock() {
  const Erc20Mock = await ethers.getContractFactory("Erc20Mock");
  const erc20Mock = await Erc20Mock.deploy(
    "Test token",
    "TEST",
    ethers.utils.parseEther("100000000")
  );
  return { erc20Mock };
}

export async function createLockedStakingFixture(
  treasury: string,
  signer: string
) {
  const { erc20Mock } = await deployERC20Mock();
  const { lockedStakingFactory, mycStakingManager } =
    await deployLockedStakingFactory(treasury, signer);
  await mycStakingManager.setFactoryStatus(lockedStakingFactory.address, true);
  return { erc20Mock, lockedStakingFactory, mycStakingManager };
}

export type LockedStakingFixtureReturn = {
  erc20Mock: Erc20Mock;
  lockedStakingFactory: LockedStakingFactory;
  mycStakingManager: MYCStakingManager;
  lockedStaking: LockedStaking;
  timestamp: number;
};

export async function lockedStakingPoolFixture(
  treasury: string,
  signer: SignerWithAddress,
  creator: SignerWithAddress,
  network: Network,
  timestamp: number
): Promise<LockedStakingFixtureReturn> {
  const { erc20Mock, lockedStakingFactory, mycStakingManager } =
    await createLockedStakingFixture(treasury, signer.address);
  await erc20Mock.transfer(creator.address, ethers.utils.parseEther("1000000"));
  await erc20Mock
    .connect(creator)
    .approve(lockedStakingFactory.address, ethers.utils.parseEther("1000000"));
  const [, , , , , bob, alice] = await ethers.getSigners();
  const { preparedData } = await createSignature(
    lockedStakingFactory,
    signer,
    creator.address,
    getExampleValueToSign(timestamp + 30, timestamp + 60, timestamp + 100),
    erc20Mock.address,
    network
  );
  const tz = await lockedStakingFactory
    .connect(creator)
    .createPool(...preparedData);
  const lockedStaking = await getNewPool(tz, mycStakingManager);

  await erc20Mock
    .connect(bob)
    .approve(lockedStaking.address, ethers.utils.parseEther("100000000"));
  await erc20Mock
    .connect(alice)
    .approve(lockedStaking.address, ethers.utils.parseEther("100000000"));

  await erc20Mock.transfer(bob.address, ethers.utils.parseEther("1000000"));
  await erc20Mock.transfer(alice.address, ethers.utils.parseEther("1000000"));

  return {
    erc20Mock,
    lockedStakingFactory,
    mycStakingManager,
    lockedStaking,
    timestamp,
  };
}

export async function staked200TokensFixture(timestamp?: number) {
  const network = await ethers.provider.getNetwork();
  let timestampStart = timestamp
    ? timestamp
    : Math.floor(new Date().getTime() / 1000);
  const [, signer, treasury, coinDev, , bob] = await ethers.getSigners();
  const { erc20Mock, lockedStakingFactory, mycStakingManager, lockedStaking } =
    await lockedStakingPoolFixture(
      treasury.address,
      signer,
      coinDev,
      network,
      timestampStart
    );

  await lockedStaking.connect(bob).stake(ethers.utils.parseEther("200"), 0);
  const stakedAtBlock = await time.latest();

  return {
    erc20Mock,
    lockedStakingFactory,
    mycStakingManager,
    lockedStaking,
    timestampStart,
    stakedAtBlock,
  };
}

export async function staked1000TokensFixture(timestamp?: number) {
  const network = await ethers.provider.getNetwork();
  const [, , , , , , alice] = await ethers.getSigners();
  const {
    erc20Mock,
    lockedStakingFactory,
    mycStakingManager,
    lockedStaking,
    timestampStart,
    stakedAtBlock,
  } = await staked200TokensFixture(timestamp);

  await time.setNextBlockTimestamp(timestampStart + 50);
  await lockedStaking.connect(alice).stake(ethers.utils.parseEther("800"), 0);
  const staked2 = await time.latest();

  return {
    erc20Mock,
    lockedStakingFactory,
    mycStakingManager,
    lockedStaking,
    timestampStart,
    stakedAtBlock: staked2,
  };
}

export async function createSignature(
  lockedStakingFactory: LockedStakingFactory,
  signer: SignerWithAddress,
  creator: string,
  valueToSign: ValueToSignLockedStakingFactory,
  tokenAddress: string,
  network: Network
) {
  const vts = valueToSign;
  vts.tokenAddress = tokenAddress;
  vts.owner = creator;

  const domainData = {
    name: "MyCointainer",
    version: "1",
    chainId: network.chainId,
    verifyingContract: lockedStakingFactory.address,
  };

  const types = {
    AddStakePoolData: [
      { name: "tokenAddress", type: "address" },
      { name: "owner", type: "address" },
      { name: "durations", type: "uint256[]" },
      { name: "maxTokensBeStaked", type: "uint256[]" },
      { name: "rewardsPool", type: "uint256[]" },
      { name: "mycFeesPool", type: "uint256[]" },
      { name: "maxStakingAmount", type: "uint256[]" },
      { name: "dateStart", type: "uint256" },
      { name: "dateEnd", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  //const connectedSigner = readySinger.connect(ethers.provider);
  const signature = await signer._signTypedData(domainData, types, vts);

  const preparedData = [
    vts.owner,
    vts.tokenAddress,
    vts.durations,
    vts.maxTokensBeStaked,
    vts.rewardsPool,
    vts.mycFeesPool,
    vts.maxStakingAmount,
    vts.dateStart,
    vts.dateEnd,
    vts.deadline,
    signature,
  ] as const;

  return { signature, signedValue: vts, preparedData };
}

export async function getNewPool(
  tz: ContractTransaction,
  mycStakingManager: MYCStakingManager
): Promise<LockedStaking> {
  const receipt = await tz.wait();
  const result = mycStakingManager.interface.decodeEventLog(
    "AddedStakingPool",
    receipt.logs[2].data,
    receipt.logs[2].topics
  );
  const LockedStakingF = await ethers.getContractFactory("LockedStaking");
  const lockedStaking = LockedStakingF.attach(result.poolAddress);
  return lockedStaking;
}
