import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, network } = hre;
  const { deploy } = deployments;
  let { deployer } = await getNamedAccounts();
  if (network.name === "hardhat" || network.name === "bscTestnet") {

    await deploy("Erc20Mock", {
      from: deployer,
      args: ["Test Token", "Test", ethers.utils.parseEther("10000000"), 18],
      log: true,
    });
  }
  await deploy("WDEL", {
    from: deployer,
    log: true,
  });
};
export default func;
func.tags = ["Erc20Mock"];
