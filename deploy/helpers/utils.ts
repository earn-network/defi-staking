import * as hre from "hardhat";
import { ethers } from "hardhat";
import { Contract } from "ethers";

export async function getSignerForNetwork(): Promise<String>{
  const { getNamedAccounts, network } = hre;
  let { signer,  } = await getNamedAccounts();

  if(network.name == "hardhat"){
    return signer;
  }
  
  if(network.tags.testnet){
    return process.env.SIGNER_TESTNET ? process.env.SIGNER_TESTNET : "";
  }

  if(network.tags.mainnet){
    return process.env.SIGNER_MAINNET ? process.env.SIGNER_MAINNET : "";
  }

  return "";
}

export async function getDeployedContract(contractName: string): Promise<any> {
  const deployment = await hre.deployments.get(contractName);
  const contract: Contract = await ethers.getContractAt(
    contractName,
    deployment.address
  );
  return contract;
}



export default { getDeployedContract };
