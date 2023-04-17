import hre, { ethers, getChainId } from "hardhat";

async function main() {
  const value = {
    tokenAddress: "0x68aD087252A415598A9727f4014110B33d6f92C2",
    owner: "0x0000000000000000000000000000000000000000",
    durations: ["864000"],
    maxTokensBeStaked: ["1000000000000000000000"],
    rewardsPool: ["100000000000000000000"],
    mycFeesPool: ["1000000000000000000"],
    maxStakingAmount: ["20000000000000000000"],
    dateStart: "1682942400",
    dateEnd: "1677672000",
    deadline: "1678318347",
  };

  const lockedStakingFactoryDeployment = await hre.deployments.get(
    "LockedStakingFactory"
  );
  const lockedStakingFactory = await ethers.getContractAt(
    "LockedStakingFactory",
    lockedStakingFactoryDeployment.address
  );

  const [owner] = await ethers.getSigners();

  const chainId = await getChainId();

  const domainData = {
    name: "MyCointainer",
    version: "1",
    chainId: chainId,
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

  const signature = await owner._signTypedData(domainData, types, value);

  console.log("signature", signature);

  //Create pool transaction

  // const tz = await lockedStakingFactory.connect(owner).createPool(
  //   value.owner, value.tokenAddress, value.durations, value.maxTokensBeStaked, value.rewardsPool, value.mycFeesPool, value.maxStakingAmount, value.dateStart, value.dateEnd, value.deadline, signature
  // )
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
