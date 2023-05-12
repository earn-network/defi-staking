import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { MYCStakingManager, WDEL, WETH } from "../../typechain-types";
import { getDeployedContract } from "../helpers/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();

  const mycStakingManager: MYCStakingManager = await getDeployedContract(
    "MYCStakingManager"
  );

  const weth: WDEL = await getDeployedContract(
    "WDEL"
  );

  const deployed = await deploy("LockedStakingFactory", {
    from: deployer.address,
    args: [mycStakingManager.address, weth.address],
    log: true,
  });

  const owner = await mycStakingManager.owner();

  if(deployed.newlyDeployed && owner.toLowerCase() === deployer.address.toLowerCase()){
    const setStatus = await mycStakingManager
      .connect(deployer)
      .setFactoryStatus(deployed.address, true);
    await setStatus.wait(1);
  }
};
export default func;
func.tags = ["LockedStakingFactoryV1", "MYCStakingManagerV1", "WDEL"];
