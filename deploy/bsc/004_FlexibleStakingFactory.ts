import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";
import { MYCStakingManager } from "../../typechain-types";
import { getDeployedContract } from "../helpers/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getChainId } = hre;
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();
  const chainId = await getChainId();

  const mycStakingManager: MYCStakingManager = await getDeployedContract(
    "MYCStakingManager"
  );

  const deployed = await deploy("FlexibleStakingFactory", {
    from: deployer.address,
    args: [mycStakingManager.address],
    log: true,
  });

  const setStatus = await mycStakingManager
    .connect(deployer)
    .setFactoryStatus(deployed.address, true);
  await setStatus.wait(1);

  if(chainId === "56"){
    const mainOwner = process.env.MAIN_OWNER_MAINNET || "";
    const setOwnership = await mycStakingManager.connect(deployer).transferOwnership(mainOwner);
  }

};
export default func;
func.tags = ["FlexibleStakingFactoryV1", "MYCStakingManagerV1"];
