import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ContractTransaction } from "@ethersproject/contracts";
import {
  Erc20Mock,
  FlexibleStaking,
  FlexibleStakingFactory,
  MYCStakingManager,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Network } from "@ethersproject/networks";
import { time } from "@nomicfoundation/hardhat-network-helpers";

export type ValueToSignFlexibleStakingFactory = {
  tokenAddress: string;
  owner: string;
  rewardTokensPerSecond: BigNumber;
  feeForMyc: BigNumber;
  dateStart: number;
  dateEnd: number;
  deadline: number;
};

export function getExampleValueToSign(
  timestampStart: number,
  timestampEnd: number,
  deadline: number
) {
  const exampleValueToSign: ValueToSignFlexibleStakingFactory = {
    tokenAddress: "",
    owner: "",
    rewardTokensPerSecond: ethers.utils.parseEther("1"),
    feeForMyc: ethers.utils.parseEther("10"),
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

export async function deployFlexibleStakingFactory(
  treasury: string,
  signer: string,
  mycStakingManager?: MYCStakingManager
) {
  if (!mycStakingManager)
    mycStakingManager = (await deployMYCStakingManager(treasury, signer))
      .mycStakingManager;

  const FlexibleStakingFactory = await ethers.getContractFactory(
    "FlexibleStakingFactory"
  );
  const flexibleStakingFactory = await FlexibleStakingFactory.deploy(
    mycStakingManager.address
  );

  return { flexibleStakingFactory, mycStakingManager };
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

export async function createFlexibleStakingFixture(
  treasury: string,
  signer: string
) {
  const { erc20Mock } = await deployERC20Mock();
  const { flexibleStakingFactory, mycStakingManager } =
    await deployFlexibleStakingFactory(treasury, signer);
  await mycStakingManager.setFactoryStatus(
    flexibleStakingFactory.address,
    true
  );
  return { erc20Mock, flexibleStakingFactory, mycStakingManager };
}

export type FlexibleStakingFixtureReturn = {
  erc20Mock: Erc20Mock;
  flexibleStakingFactory: FlexibleStakingFactory;
  mycStakingManager: MYCStakingManager;
  flexibleStaking: FlexibleStaking;
  timestamp: number;
};

export async function flexibleStakingPoolFixture(
  treasury: string,
  signer: SignerWithAddress,
  creator: SignerWithAddress,
  network: Network,
  timestamp: number
): Promise<FlexibleStakingFixtureReturn> {
  const { erc20Mock, flexibleStakingFactory, mycStakingManager } =
    await createFlexibleStakingFixture(treasury, signer.address);
  await erc20Mock.transfer(creator.address, ethers.utils.parseEther("1000000"));
  await erc20Mock
    .connect(creator)
    .approve(
      flexibleStakingFactory.address,
      ethers.utils.parseEther("1000000")
    );
  const [, , , , , bob, alice] = await ethers.getSigners();
  const { preparedData } = await createSignature(
    flexibleStakingFactory,
    signer,
    creator.address,
    getExampleValueToSign(timestamp + 30, timestamp + 60, timestamp + 100),
    erc20Mock.address,
    network
  );
  const tz = await flexibleStakingFactory
    .connect(creator)
    .createPool(...preparedData);
  const flexibleStaking = await getNewPool(tz, mycStakingManager);

  await erc20Mock
    .connect(bob)
    .approve(flexibleStaking.address, ethers.utils.parseEther("100000000"));
  await erc20Mock
    .connect(alice)
    .approve(flexibleStaking.address, ethers.utils.parseEther("100000000"));

  await erc20Mock.transfer(bob.address, ethers.utils.parseEther("1000000"));
  await erc20Mock.transfer(alice.address, ethers.utils.parseEther("1000000"));

  return {
    erc20Mock,
    flexibleStakingFactory,
    mycStakingManager,
    flexibleStaking,
    timestamp,
  };
}

export async function staked200TokensFixture(timestamp?: number) {
  const network = await ethers.provider.getNetwork();
  let timestampStart = timestamp
    ? timestamp
    : Math.floor(new Date().getTime() / 1000);
  const [, signer, treasury, coinDev, , bob] = await ethers.getSigners();
  const {
    erc20Mock,
    flexibleStakingFactory,
    mycStakingManager,
    flexibleStaking,
  } = await flexibleStakingPoolFixture(
    treasury.address,
    signer,
    coinDev,
    network,
    timestampStart
  );
  await time.increase(20);
  await flexibleStaking.connect(bob).deposit(ethers.utils.parseEther("200"));
  const stakedAtBlock = await time.latest();

  return {
    erc20Mock,
    flexibleStakingFactory,
    mycStakingManager,
    flexibleStaking,
    timestampStart,
    stakedAtBlock,
  };
}

export async function staked1000TokensFixture(timestamp?: number) {
  const network = await ethers.provider.getNetwork();
  const [, , , , , , alice] = await ethers.getSigners();
  const {
    erc20Mock,
    flexibleStakingFactory,
    mycStakingManager,
    flexibleStaking,
    timestampStart,
    stakedAtBlock,
  } = await staked200TokensFixture(timestamp);

  await time.setNextBlockTimestamp(timestampStart + 50);
  await flexibleStaking.connect(alice).deposit(ethers.utils.parseEther("800"));
  const staked2 = await time.latest();

  return {
    erc20Mock,
    flexibleStakingFactory,
    mycStakingManager,
    flexibleStaking,
    timestampStart,
    stakedAtBlock: staked2,
  };
}

export async function createSignature(
  flexibleStakingFactory: FlexibleStakingFactory,
  signer: SignerWithAddress,
  creator: string,
  valueToSign: ValueToSignFlexibleStakingFactory,
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
    verifyingContract: flexibleStakingFactory.address,
  };

  const types = {
    AddStakePoolData: [
      { name: "tokenAddress", type: "address" },
      { name: "owner", type: "address" },
      { name: "rewardTokensPerSecond", type: "uint256" },
      { name: "feeForMyc", type: "uint256" },
      { name: "dateStart", type: "uint256" },
      { name: "dateEnd", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const signature = await signer._signTypedData(domainData, types, vts);

  const preparedData = [
    vts.owner,
    vts.tokenAddress,
    vts.rewardTokensPerSecond,
    vts.feeForMyc,
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
): Promise<FlexibleStaking> {
  const receipt = await tz.wait();
  const result = mycStakingManager.interface.decodeEventLog(
    "AddedStakingPool",
    receipt.logs[4].data,
    receipt.logs[4].topics
  );
  const FlexibleStakingF = await ethers.getContractFactory("FlexibleStaking");
  const flexibleStaking = FlexibleStakingF.attach(result.poolAddress);
  return flexibleStaking;
}
