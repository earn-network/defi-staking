import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  const { deployer, signer, treasury } = await getNamedAccounts();

  await deploy("MYCStakingManager", {
    from: deployer,
    args: [treasury, signer],
    log: true,
  });
};
export default func;
func.tags = ["MYCStakingManagerV1"];
