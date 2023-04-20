import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts, getChainId } = hre;
  const chainId = await getChainId();
  const { deploy } = deployments;
  let { deployer, signer, treasury } = await getNamedAccounts();

  let mainOwner:string = deployer;

  // mainnet
  if(chainId === "56"){
    signer = process.env.SIGNER_MAINNET || "";
    treasury = process.env.TREASURY_MAINNET || "";
  }
  // testnet
  else if(chainId == "97"){
    signer = process.env.SIGNER_TESTNET || "";
    treasury = process.env.TREASURY_TESTNET || "";
  }

  await deploy("MYCStakingManager", {
    from: deployer,
    args: [treasury, signer],
    log: true,
  });
};
export default func;
func.tags = ["MYCStakingManagerV1"];
