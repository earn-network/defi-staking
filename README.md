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

    To run remix please install `remixd` and open official remix client (https://remix.ethereum.org) and run:
    ```
    remixd -s .
    ```
