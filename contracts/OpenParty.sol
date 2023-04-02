// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
/// @notice ERC20 with Votable Extensions
import {OPVotes} from "./OPVotes.sol";
/// @notice ERC721 
import {OPSongs} from "./OPSongs.sol";

/// @title OpenParty is a decentralized Jukebox
/// @author David 1, David 2. Daniel.
/// @notice This is the final project for the Solidity Encode Club Bootcamp
contract OpenParty is Ownable {
    /// @notice Address of the token used for voting
    OPVotes public votesToken;
    /// @notice Address of the token used for Songs
    OPSongs public songsToken;
    /// @notice Amount of Votes tokens given per ETH paid
    uint256 public purchaseRatio;
    /// @notice Charged % fee for minting a song ETH paid
    uint256 public songFee;

    constructor(
        string memory votesName,
        string memory votesSymbol,
        string memory songsName,
        string memory songsSymbol,
        uint256 _purchaseRatio,
        uint256 _songFee
    ) {
        votesToken = new OPVotes(votesName, votesSymbol);
        songsToken = new OPSongs(songsName, songsSymbol);
        purchaseRatio = _purchaseRatio;
        songFee = 1 ether * _songFee / 100;
    }

    /// @notice Gives votes tokens based on the amount of ETH sent
    /// @dev This implementation is prone to rounding problems
    function purchaseVotes() external payable {
        votesToken.mint(msg.sender, msg.value * purchaseRatio);
    }
    /// The above implementation seems to have the user set an ETH amount to be
    /// converted to tokens. I think the user experience should be to ask for
    /// a specified amount of tokens, and then charged the corresponding amount
    /// of ETH. With the code below, we could set the msg.value in the script.
    /// Perhaps 1 token should be about $1 USD. Currently $1 == 0.00055 ETH. 
    /// So, if the user inputs a request for 10 tokens, the script will calculate 
    /// the msg.value as 10 * 0.00055. For future versions when we have a liquidity pool,
    /// this ratio will be dynamic, but for v.1, we hardcode the conversion rate.
    function purchaseVotes(uint256 amount) external payable {
        votesToken.mint(msg.sender, amount);
    }

    /// @notice Mints Song tokens based charging a fee to avoid Spam
    /// @param _uri must be a IPFS metadata hash (usualy a json file)
    /// @dev reference https://docs.opensea.io/docs/metadata-standards#metadata-structure
    /// @dev This implementation is prone to rounding problems
    function mintSong(string memory _uri)
    external payable {
        require(msg.value >= songFee);
        songsToken.safeMint(msg.sender, _uri);
    }

    /// @notice Burns `amount` vote tokens and give the equivalent ETH back to user
    function returnVotes(uint256 _amount) external {
        votesToken.burnFrom(msg.sender, _amount);
        payable(msg.sender).transfer(_amount / purchaseRatio);
    }

    /// @notice Burns a song token Usually if there are copyright Issues
    /// @param _tokenId of the Song to be burned
    /// @dev future version might require a verification process approved by a DAO
    function burnSong(uint256 _tokenId) external onlyOwner {
        songsToken.burn(_tokenId);
    }
}
