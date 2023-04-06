// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
/// @notice ERC20 with Votable Extensions
import {OPVotes} from "./OPVotes.sol";
/// @notice ERC721 
import {OPSongs} from "./OPSongs.sol";

/// @title OpenParty is a decentralized Jukebox
/// @author David E. Perez Negron Rocha,  Daniel Poreda.
/// @notice This is the final project for the Solidity Encode Club Bootcamp
/// @notice This code is based on weekend projects 12 and 20 from @MatheusDaros
contract OpenParty is Ownable {

    /// @notice Address of the token used for voting
    OPVotes public votesToken;

    /// @notice Address of the token used for Songs
    OPSongs public songsToken;

    /// @notice Amount of Votes tokens given per ETH paid
    uint256 public purchaseRatio;

    /// @notice Charged % fee for minting a song ETH paid
    uint256 public songFee;

    /// @notice status of voting, open or closed. 
    bool public votesOpen;

    /// @notice winning song of a vote count, its songId is referenced to be played next.
    /// this can also be called to view what song is currently playing/playing next.
    uint256 public nextSong;

    ///// @notice array of Song Id's voted for.
    uint256[] public votedSongs;

    /// @notice tracks all cast votes. Tokens are not transferred in voting. Voting power
    /// is determined by token holdings at the point of transaction, with getVotes() ERC20Votes extension.
    mapping(address => uint256) public votingPowerSpent;

    /// struct for returning ballot counts in function viewCurrentVotes()
    /// @dev Check posibility to implement at fronted
    struct songData {
        uint256 voteCount;
        bool votedSong;
    } 
    /// @notice Song Id to vote count.
    mapping(uint256 => songData) songsData;
    
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
        // sets a songFee to be paid in vote tokens
        songFee = _songFee ;
    }

    /// @notice Passes when the party is over / there is no party / no voting 
    modifier partyOff() {
        require(!votesOpen, "Party is ON, go vote!");
        _;
    }

    /// @notice Passes when the the party is on / voting is open.
    modifier partyOn() {
        require(votesOpen, "Party's over, go home.");
        _;
    }

    /// @notice Gives votes tokens based on the amount of ETH sent.
    /// all tokens minted automatically delegate votes to the owner. This is for a more convenient
    /// user experience, as voting power is the essential utility of the coin, and attached to the coins.  
    /// @dev This implementation is prone to rounding problems
    function purchaseVotes() external payable {
       votesToken.mint(msg.sender, msg.value * purchaseRatio);
    }

    /// @notice Mints Song tokens based charging a fee in voteTokens to avoid Spam
    /// @param _uri must be a IPFS metadata hash (usualy a json file)
    /// @dev reference https://docs.opensea.io/docs/metadata-standards#metadata-structure
    /// @dev This implementation is prone to rounding problems
    function mintSong(string memory _uri) external {
        require(votesToken.transferFrom(
            msg.sender, address(this), songFee
        ));
        songsToken.safeMint(msg.sender, _uri);
    }

    /// @notice Burns `amount` vote tokens and give the equivalent ETH back to user
    /// @dev Not being Used for now
    function returnVotes(uint256 _amount) external {
        votesToken.burnFrom(msg.sender, _amount);
        payable(msg.sender).transfer(_amount / purchaseRatio);
    }

    /// @notice Burns a song token Usually if there are copyright Issues
    /// @param _tokenId of the Song to be burned
    /// @dev Not being Used for now
    /// @dev future version might require a verification process approved by a DAO
    function burnSong(uint256 _tokenId) external onlyOwner {
        songsToken.burn(_tokenId);
    }

    /// @notice in case of volatility update the songFee
    /// @param _songFee is the % of the 1 ether requested in voteTokens
    /// @dev future version might require a verification process approved by a DAO
    function setNewSongFee(uint256 _songFee) external onlyOwner {
        songFee =  _songFee;
    }

    /// @dev bool true for 1. voting function requirement, 2. Begin new ballot with
    /// verification that the array of songs voted for is empty. 
    function openVoting() external onlyOwner partyOff{
        votesOpen = true;
        votedSongs = new uint256[](0);
    }    

    /// @dev songsData mapping records the vote count. 
    /// Array votedSongs records the token Id of any song voted for. This array 
    /// will be looped at the ballot closing to reference token vote counts in songsData.
    /// Users will cast amount of votes by token Id from the frontend
    function vote(uint256 songId, uint256 amount) external partyOn{
        require(songsToken.checkSongExists(songId));
        require(votingPower(msg.sender) >= amount, "You have insufficient voting power");

        votingPowerSpent[msg.sender] += amount;

        if (!songsData[songId].votedSong) {
                songsData[songId].votedSong = true;
                votedSongs.push(songId);
            }
         songsData[songId].voteCount += amount;
        }

    /// @notice Check user 'account's voting power by checking current vote supply against votes cast.
    function votingPower(address account) public view returns (uint256) {
        return votesToken.getVotes(account) - votingPowerSpent[account];
    }

    /// @notice Sets the end of a ballot by comparing all token vote counts and assigning
    /// the winning songId to state variable nextSong.
    function getNextSong() external onlyOwner partyOn returns (uint256 winningSong) {
    require(votedSongs.length > 0, "There are no voted songs");
    uint256 highestCount = 0;
    uint256 songId = 0;
    for (uint i = votedSongs.length - 1; i >= 0 ; i--) {
        songId = votedSongs[i];
        if (songsData[songId].voteCount >= highestCount) {
          highestCount = songsData[songId].voteCount;
          winningSong = songId;
        }
    }


    nextSong = winningSong;
    songsData[winningSong].voteCount = 0;
    return winningSong;
}
    

    function refreshVotes() external {
        // TODO: should we have this function available while PartyOn? 
        // perhaps users should buy more tokens for more votes during the party,
        // and allow refresh at partyOff. ?
    }

    /// @notice Upon ending the party and closing votes, all vote counts are cleared,
    /// and votedSongs array is cleared, so nothing carries over to the next party ballot.
    function closeVoting() external onlyOwner partyOn {
        votesOpen = false;
        for (uint i = 0; i < votedSongs.length; i++){
            uint song = votedSongs[i];
            songsData[song].voteCount = 0;
        }
        delete votedSongs;
    }
    
}
