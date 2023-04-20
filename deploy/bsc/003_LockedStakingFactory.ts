import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { MYCStakingManager } from "../../typechain-types";
import { getDeployedContract } from "../helpers/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  const mycStakingManager: MYCStakingManager = await getDeployedContract(
    "MYCStakingManager"
  );

  const deployed = await deploy("LockedStakingFactory", {
    from: deployer.address,
    args: [mycStakingManager.address],
    log: true,
  });

  const setStatus = await mycStakingManager
    .connect(deployer)
    .setFactoryStatus(deployed.address, true);
  await setStatus.wait(1);
};
export default func;
func.tags = ["LockedStakingFactoryV1", "MYCStakingManagerV1"];
