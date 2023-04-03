import { ethers } from "hardhat";
import * as readline from "readline";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { OpenParty, OPVotes, OPSongs } from "../typechain-types";

let contract: OpenParty;
let votesToken: OPVotes;
let songsToken: OPSongs;
let accounts: SignerWithAddress[];


const SONG_FEE = 1000; // 1 %
const VOTES_TOKEN_RATIO = 1000000;

async function main() {
  await initContracts();
  await initAccounts();
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
    SONG_FEE
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

async function mainMenu(rl: readline.Interface) {
  menuOptions(rl);
}

function menuOptions(rl: readline.Interface) {
  rl.question(
    "Select operation: \n Options: \n [0]: Exit \n [1]: Display Wallet Balances \n [2]: Buy Vote Tokens \n [3]: Mint A Song \n Option:",
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
          rl.question("What account (index) to use?\n", async (index) => {
            await displayBalance(index);
            await displayVotesBalance(index);
            await displaySongsBalance(index);
            mainMenu(rl);
          });
          break;
        case 2:
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
        case 3:
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
//        case 3:
//          rl.question("What account (index) to use?\n", async (index) => {
//            await displayBalance(index);
//            rl.question("Buy how many tokens?\n", async (amount) => {
//              try {
//                await buyTokens(index, amount);
//                await displayBalance(index);
//                await displayTokenBalance(index);
//              } catch (error) {
//                console.log("error\n");
//                console.log({ error });
//              }
//              mainMenu(rl);
//            });
//          });
//          break;
//        case 4:
//          rl.question("What account (index) to use?\n", async (index) => {
//            await displayTokenBalance(index);
//            rl.question("Bet how many times?\n", async (amount) => {
//              try {
//                await bet(index, amount);
//                await displayTokenBalance(index);
//              } catch (error) {
//                console.log("error\n");
//                console.log({ error });
//              }
//              mainMenu(rl);
//            });
//          });
//          break;
//        case 5:
//          try {
//            await closeLottery();
//          } catch (error) {
//            console.log("error\n");
//            console.log({ error });
//          }
//          mainMenu(rl);
//          break;
//        case 6:
//          rl.question("What account (index) to use?\n", async (index) => {
//            const prize = await displayPrize(index);
//            if (Number(prize) > 0) {
//              rl.question(
//                "Do you want to claim your prize? [Y/N]\n",
//                async (answer) => {
//                  if (answer.toLowerCase() === "y") {
//                    try {
//                      await claimPrize(index, prize);
//                    } catch (error) {
//                      console.log("error\n");
//                      console.log({ error });
//                    }
//                  }
//                  mainMenu(rl);
//                }
//              );
//            } else {
//              mainMenu(rl);
//            }
//          });
//          break;
//        case 7:
//          await displayTokenBalance("0");
//          await displayOwnerPool();
//          rl.question("Withdraw how many tokens?\n", async (amount) => {
//            try {
//              await withdrawTokens(amount);
//            } catch (error) {
//              console.log("error\n");
//              console.log({ error });
//            }
//            mainMenu(rl);
//          });
//          break;
//        case 8:
//          rl.question("What account (index) to use?\n", async (index) => {
//            await displayTokenBalance(index);
//            rl.question("Burn how many tokens?\n", async (amount) => {
//              try {
//                await burnTokens(index, amount);
//                await displayBalance(index);
//                await displayTokenBalance(index);
//              } catch (error) {
//                console.log("error\n");
//                console.log({ error });
//              }
//              mainMenu(rl);
//            });
//          });
//          break;
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
  const balanceBN = await songsToken.balanceOf(accounts[Number(index)].address);
  // gets balance with ether format and makes it a number
  const balance: number = +ethers.utils.formatEther(balanceBN);
  if(balance > 0){
    console.log(
      `The account of address ${
        accounts[Number(index)].address
      } has ${balance} OPS\n`
    );
    for(let i = 0; i <= balance; i++){
      const tokenIndex = await songsToken.tokenOfOwnerByIndex(accounts[Number(index)].address, i);
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

async function buyVoteTokens(index: string, amount: string) {
  const tx = await contract.connect(accounts[Number(index)]).purchaseVotes({
    value: ethers.utils.parseEther(amount).div(VOTES_TOKEN_RATIO),
  });
  const receipt = await tx.wait();
  console.log(`Tokens bought (${receipt.transactionHash})\n`);
}

async function mintSong(index: string, URI: string) {
  const allowTx = await votesToken
    .connect(accounts[Number(index)])
    .approve(contract.address, ethers.constants.MaxUint256);
  await allowTx.wait();
  const tx = await contract.connect(accounts[Number(index)]).mintSong(URI);
  const receipt = await tx.wait();
  console.log(`Song Minted at (${receipt.transactionHash})\n`);
}

//async function checkState() {
//  const state = await contract.betsOpen();
//  console.log(`The lottery is ${state ? "open" : "closed"}\n`);
//  if (!state) return;
//  const currentBlock = await ethers.provider.getBlock("latest");
//  const currentBlockDate = new Date(currentBlock.timestamp * 1000);
//  const closingTime = await contract.betsClosingTime();
//  const closingTimeDate = new Date(closingTime.toNumber() * 1000);
//  console.log(
//    `The last block was mined at ${currentBlockDate.toLocaleDateString()} : ${currentBlockDate.toLocaleTimeString()}\n`
//  );
//  console.log(
//    `lottery should close at ${closingTimeDate.toLocaleDateString()} : ${closingTimeDate.toLocaleTimeString()}\n`
//  );
//}
//
//async function openBets(duration: string) {
//  const currentBlock = await ethers.provider.getBlock("latest");
//  const tx = await contract.openBets(currentBlock.timestamp + Number(duration));
//  const receipt = await tx.wait();
//  console.log(`Bets opened (${receipt.transactionHash})`);
//}
//
//
//async function bet(index: string, amount: string) {
//  const allowTx = await token
//    .connect(accounts[Number(index)])
//    .approve(contract.address, ethers.constants.MaxUint256);
//  await allowTx.wait();
//  const tx = await contract.connect(accounts[Number(index)]).betMany(amount);
//  const receipt = await tx.wait();
//  console.log(`Bets placed (${receipt.transactionHash})\n`);
//}
//
//async function closeLottery() {
//  const tx = await contract.closeLottery();
//  const receipt = await tx.wait();
//  console.log(`Bets closed (${receipt.transactionHash})\n`);
//}
//
//async function displayPrize(index: string): Promise<string> {
//  const prizeBN = await contract.prize(accounts[Number(index)].address);
//  const prize = ethers.utils.formatEther(prizeBN);
//  console.log(
//    `The account of address ${
//      accounts[Number(index)].address
//    } has earned a prize of ${prize} Tokens\n`
//  );
//  return prize;
//}
//
//async function claimPrize(index: string, amount: string) {
//  const tx = await contract
//    .connect(accounts[Number(index)])
//    .prizeWithdraw(ethers.utils.parseEther(amount));
//  const receipt = await tx.wait();
//  console.log(`Prize claimed (${receipt.transactionHash})\n`);
//}
//
//async function displayOwnerPool() {
//  const balanceBN = await contract.ownerPool();
//  const balance = ethers.utils.formatEther(balanceBN);
//  console.log(`The owner pool has (${balance}) Tokens \n`);
//}
//
//async function withdrawTokens(amount: string) {
//  const tx = await contract.ownerWithdraw(ethers.utils.parseEther(amount));
//  const receipt = await tx.wait();
//  console.log(`Withdraw confirmed (${receipt.transactionHash})\n`);
//}
//
//async function burnTokens(index: string, amount: string) {
//  const allowTx = await token
//    .connect(accounts[Number(index)])
//    .approve(contract.address, ethers.constants.MaxUint256);
//  const receiptAllow = await allowTx.wait();
//  console.log(`Allowance confirmed (${receiptAllow.transactionHash})\n`);
//  const tx = await contract
//    .connect(accounts[Number(index)])
//    .returnTokens(ethers.utils.parseEther(amount));
//  const receipt = await tx.wait();
//  console.log(`Burn confirmed (${receipt.transactionHash})\n`);
//}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
