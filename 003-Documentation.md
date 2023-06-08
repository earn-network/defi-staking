# Earn network smart contracts

---

# Getting started

#### 1. Installation:

```
npm i
```

#### 2. Create `.env` file based on `.env.example` . Enter your developer purposes mnemonic phrase(12 words).
#### 3. Compile and Tests

```
npm run compile
```

```
npm run test
```

#### 4. Generate Documentation

To create documentation in .md format run
```
npm run docgen
```

Documentation files will appear in the `/docs` folder

--------

To create documentation as webpage run
```
npm run devdoc
```

Documentation files will appear in the `/dev-docs` folder, open `index.html` in a browser to read it.

Also `/dev-docs/contracts.json` file will be created which contains all deployed contract information (addresses, abis, etc);

#### 5. Local migrations/local deployment

   Run local node:

   ```
   npm run node
   ```

   It will run local virtual node and deploy contracts

#### 6. Testnet/production deployment

   Make sure that first account (id[0]) for selected mnemonic has a native currency on selected network. Use a faucets for a testnets.

   Testnet deployment:
   ```
   npm run testnet
   ```

   Production deployment (using MNEMONIC_MAINNET)
   ```
   npm run mainnet
   ```

   Deployment info will store on deployments folder

#### 7. Verifying on bscscan

   To verify contracts on bsc run: 
   ```
   npm run verify
   ```

### Remix

  To run remix please install `remixd` and open official remix client  (https://remix.ethereum.org) and run:
  ```
  remixd -s .
  ```


# Documentation
General overview of the most important smart-contract interactions.

The two most important smart-contracts that you will be interacting with are:

* **LockedStaking.sol** ([Main-net on chain example](https://bscscan.com/address/0x9f786e57ddc1ef59fabba668b6bc4d77e02c8387), [Hololoot #Locked 1 Pool](https://earn.network/markets/defi-pools/HOL))
* **FlexibleStaking.sol** ([Main-net on chain example](https://bscscan.com/address/0x9f786e57ddc1ef59fabba668b6bc4d77e02c8387), [Hololoot #Locked 1 Pool](https://earn.network/markets/defi-pools/HOL))

Please note that some functions differ between both smart contracts. 

### LockedStaking.sol 

* **getPlansLength()** -
Returns the length of the *plans* array

* **factory()** -
Returns the address of the factory contract.

* **getPlans()** -
Returns an array of *StakingPlan* structs representing the available staking plans.

* **getPlan()** -
Returns the *StakingPlan* struct for a specific plan ID.

* **stakingPool()** -
Returns the *StakingPool* struct containing information about the staking pool.

* **stakesInfoOf()** -
Returns an array of UserStake structs representing the stake information for a specific staker.

* **stakeInfoOf()** -
Returns the UserStake struct for a specific staker and plan ID.

* **stake()** -
Stakes tokens for a specific staking plan. 

* **unstake()** -
Unstakes tokens from a specific staking plan. 

* **unstakeWithPenalty()** -
Unstakes tokens from a specific staking plan before the end of the staking period, with a penalty. 

* **claimUnusedRewards()** -
Sends unused reward tokens back to the contract owner.

### FlexibleStaking.sol

* **extendStakingTime()** -
This function allows the creator of the contract to extend the staking period by specifying a new end date. The creator needs to provide additional staking tokens to cover the extended period. 

* **deposit()** -
Any user can deposit a specified amount of tokens into the contract for staking. The tokens must be transferred to the contract address. 

* **withdraw()** -
Allows users to withdraw a specific amount of their staked tokens from the contract. The function also harvests any pending rewards before withdrawal.

* **claimRewards()** -
Enables any user to claim their accumulated staking rewards from the contract.

* **checkRewards()** -
Allows users to check the amount of unharvested rewards associated with their staked tokens.

* **getSummary()** -
Returns a summary of key contract data, including reward tokens per second, total amount of staked tokens, accumulated reward per share, last reward block timestamp, start timestamp, end timestamp, and the address of the staked token.

* **getSummary()** -
Allows the protocol owner to withdraw a specified amount of tokens from the contract to their address in emergency situations.


If you have any questions, please reach out to techsupport@earn.network. Additionally, we can create a staking contract with a custom token on a selected testnet (Sepolia, BNB Testnet). In such scenario, you will be able to test it.

