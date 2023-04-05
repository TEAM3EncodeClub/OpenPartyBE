import { ethers } from "hardhat";
import * as readline from "readline";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OpenParty, OPVotes, OPSongs } from "../typechain-types";

let contract: OpenParty;
let votesToken: OPVotes;
let songsToken: OPSongs;
let accounts: SignerWithAddress[];


const SONG_FEE = 1000 // 1 %
const VOTES_TOKEN_RATIO = 1000000;

async function main() {
  await initContracts();
  await initAccounts();
  await topUpAccounts();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  mainMenu(rl);
}

async function initContracts() {
  const contractFactory = await ethers.getContractFactory("OpenParty");
  contract = await contractFactory.deploy(
    VOTES_TOKEN_RATIO,
    ethers.utils.parseEther(SONG_FEE.toFixed(18)) 
  );
  await contract.deployed();
  // Attaches Votes Contract
  const votesTokenAddress = await contract.votesToken();
  const votesTokenFactory = await ethers.getContractFactory("OPVotes");
  votesToken = votesTokenFactory.attach(votesTokenAddress);
  // Attaches Songs Contract
  const songsTokenAddress = await contract.songsToken();
  const songsTokenFactory = await ethers.getContractFactory("OPSongs");
  songsToken = songsTokenFactory.attach(songsTokenAddress);
}

async function initAccounts() {
  accounts = await ethers.getSigners();
}

async function topUpAccounts(){
  const Songs: string[] = [
    "bafybeidb3emtxhhsbriksv5qywtw4rh6uie7dzh7qaj25fruw5gx3fir6y",
    "bafybeihxgoyvfnpqvnc2fiffa3ab22jjlnrv7bgtjoryotzc7znylrkk4m",
    "bafybeifgoud5o33ckk54hfthanzazavhudittzq26h3ozezmq6zidej7au",
    "bafybeib2kh7iuziuhhocxre4qfi2q5zje7qafadeu6dybb4tnhylnft454",
    "bafybeiatvogo2vwu7qkvyj4tadx4nzh7z7zeca2lvvjjqjtarbtk7rqdoi",
    "bafybeif4mq3ve4cq5frxj4sfqugupshl37ufzm2uaty3whmews3s7curg4",
    "bafybeibjq4kdgwgql7whhwsqlpnla4dvjim6zy37pcpt4z4gdyvmcppk7m",
    "bafybeidlrnqdjfg7kta24azusk2mxwb7bxpnswfuifdthbqbnuwv7tmlly",
  ] ;

  for(let i = 1; i < 9; i++){
    buyVoteTokens(i.toString(), "10000000");
    mintSong(i.toString(), Songs[i-1])
  } 
}

async function mainMenu(rl: readline.Interface) {
  menuOptions(rl);
}

function menuOptions(rl: readline.Interface) {
  rl.question(
    "Select operation: \n Options: \n [0]: Exit \n [1]: PrintMenu  \n [2]: Display Wallet Balances \n [3]: Buy Vote Tokens \n [4]: Mint A Song \n [5]: OpenVoting \n [6]: CloseVoting \n [7]: Check Voting Power \n [8]: Vote For Song \n [9]: Get Winning Song \n [10]: Change Song Fee \n Option:",
    // Just in case: IPFS integration of Option 3 - upload songs, put their hashes and premit to some addeses this songs
    // VoteNextSong: set a blocktimestap when it finishes and count votes, select the winner 
    // Diplay Song: Request all the SongID (NFT TokenID) and display with their data 
    // Vote Song: requires the blocktimestamp to be active, requires to record addreses that vote in a mapping with votes and specific songID
    // Add Winner Song: Queue Winnersongs with timestamps
    // Play Winner Song: Anyone can play Winner Song when its timestamp reaches the time
    async (answer: string) => {
      console.log(`Selected: ${answer}\n`);
      const option = Number(answer);
      switch (option) {
        case 0:
          rl.close();
          return;
        case 1:
            mainMenu(rl);
          return;
        case 2:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayBalance(index);
            await displayVotesBalance(index);
            await displaySongsBalance(index);
            mainMenu(rl);
          });
          break;
        case 3:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayBalance(index);
            await displayVotesBalance(index);
            await displaySongsBalance(index);
            rl.question("Buy how many vote tokens?\n", async (amount) => {
              try {
                await buyVoteTokens(index, amount);
                await displayBalance(index);
                await displayVotesBalance(index);
                await displaySongsBalance(index);
              } catch (error) {
                console.log("error\n");
                console.log({ error });
              }
              mainMenu(rl);
            });
          });
          break;
        case 4:
          rl.question("What account (index) to use?\n", async (index) => {
            await displayBalance(index);
            await displayVotesBalance(index);
            await displaySongsBalance(index);
            rl.question("provide the URI?\n", async (URI) => {
              try {
                await mintSong(index, URI);
                await displayBalance(index);
                await displayVotesBalance(index);
                await displaySongsBalance(index);
              } catch (error) {
                console.log("error\n");
                console.log({ error });
              }
              mainMenu(rl);
            });
          });
          break;
        case 5:
          rl.question("What account (index) to use? (owner only)\n", async (index) => {
            await openVoting(index);
            mainMenu(rl);
          });
          break;
        case 6:
          rl.question("What account (index) to use? (owner only)\n", async (index) => {
            await closeVoting(index);
            mainMenu(rl);
          });
          break;
        case 7:
          rl.question("What account (index) to use? (owner only)\n", async (index) => {
            await checkVotes(index);
            mainMenu(rl);
          });
          break;
        case 8:
          rl.question("What account (index) to vote from?\n", async (index) => {
            rl.question("vote for what SongId?\n", async (songId) => {
              rl.question("how many Vote tokens?\n", async (amount) => {
                try {
                  await vote4Song(index, songId, amount); 
                } catch (error) {
                  console.log("error\n");
                  console.log({ error });
                }
                mainMenu(rl);
              });
            });
          });
          break;
        default:
          throw new Error("Invalid option");
      }
    }
  );
}

// Display Balance in ethereum
async function displayBalance(index: string) {
  const balanceBN = await ethers.provider.getBalance(
    accounts[Number(index)].address
  );
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has ${balance} ETH\n`
  );
}

// Display Votes token Balance
async function displayVotesBalance(index: string) {
  const balanceBN = await votesToken.balanceOf(accounts[Number(index)].address);
  const balance = ethers.utils.formatEther(balanceBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has ${balance} OPV\n`
  );
}

// Display Songs token Balance
async function displaySongsBalance(index: string) {
  // gets balance with ether format and makes it a number
  const balance: number = +await songsToken.balanceOf(accounts[Number(index)].address);
  if(balance > 0){
    console.log(
      `The account of address ${
        accounts[Number(index)].address
      } has ${balance} OPS\n`
    );
    for(let i = 1; i <= balance; i++){
      const tokenIndex = await songsToken.tokenOfOwnerByIndex(accounts[Number(index)].address, (i - 1));
      const tokenURI = await songsToken.tokenURI(tokenIndex);
      console.log(
        `The token Index ${
          tokenIndex
        } has the URI ${tokenURI} \n`
      );
    }
  } else {
    console.log("Your wallet does not own any songs")
  }
}

// Buy Vote tokens
async function buyVoteTokens(index: string, amount: string) {
  const tx = await contract.connect(accounts[Number(index)]).purchaseVotes({
    value: ethers.utils.parseEther(amount).div(VOTES_TOKEN_RATIO),
  });
  const receipt = await tx.wait();
  console.log(`Tokens bought (${receipt.transactionHash})\n`);
}

// Mint a song which requires a fee in vote tokens
async function mintSong(index: string, URI: string) {
  const allowTx = await votesToken
    .connect(accounts[Number(index)])
    .approve(contract.address, ethers.constants.MaxUint256);
  await allowTx.wait();
  const tx = await contract.connect(accounts[Number(index)]).mintSong(URI);
  const receipt = await tx.wait();
  console.log(`Song Minted at (${receipt.transactionHash})\n`);
}

// Open Voting (Party is on)
async function openVoting(index: string) {
  const tx = await contract.connect(accounts[Number(index)]).openVoting();
  const receipt = await tx.wait();
  const txStatus = await contract.votesOpen();
  console.log(`Voting got open at transaction: (${receipt.transactionHash})\n`);
  console.log(`Voting status is ${ txStatus?"Opened":"Closed" }\n`);
}

// Close Voting (DJ must sleep...)
async function closeVoting(index: string) {
  const tx = await contract.connect(accounts[Number(index)]).closeVoting();
  const receipt = await tx.wait();
  const txStatus = await contract.votesOpen();
  console.log(`Voting got closed at transaction: (${receipt.transactionHash})\n`);
  console.log(`Voting status is ${ txStatus?"Opened":"Closed" }\n`);
}

// Check and account voting power
async function checkVotes(index: string) {
  const votingPowerBN = await contract.votingPower(accounts[Number(index)].address);
  const votingPower = ethers.utils.formatEther(votingPowerBN);
  console.log(
    `The account of address ${
      accounts[Number(index)].address
    } has ${votingPower} Voting Power \n`
  );
  await displayVotesBalance(index);
}

// Vote for a Song
async function vote4Song(index: string, songId: string, amount: string){
  const tx = await contract.connect(accounts[Number(index)]).vote(songId, amount);
  const receipt = await tx.wait();
  console.log(`Voted at transaction: (${receipt.transactionHash})\n`);
  console.log(` Voted for ${
  songId
  } with ${
  amount
  } OPV Voting Power\n`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
