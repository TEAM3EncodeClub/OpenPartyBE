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

    /// @notice Constructor function
    /// @param _purchaseRatio Amount of tokens given per ETH paid
    /// @param _songFee Amount of tokens required for placing a bet that goes for the prize pool
    constructor(
        uint256 _purchaseRatio,
        uint256 _songFee
    ) {
        votesToken = new OPVotes();
        songsToken = new OPSongs();
        purchaseRatio = _purchaseRatio;
        songFee = 1 ether * _songFee / 100;
    }

    /// @notice Gives votes tokens based on the amount of ETH sent
    /// @dev This implementation is prone to rounding problems
    function purchaseVotes() external payable {
        votesToken.mint(msg.sender, msg.value * purchaseRatio);
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
