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

    /// @notice status of voting, open or closed. 
    bool public votesOpen;

    /// @notice winning song of a vote count, its tokenId is referenced to be played next.
    /// this can also be called to view what song is currently playing/playing next.
    uint256 public nextSong;

    /// @notice Token Id to vote count.
    mapping(uint256 => uint256) votesToSong;

    /// @notice array of token Id's voted for.
    uint256[] public votedSongs;

    /// @notice tracks all cast votes. Tokens are not transferred in voting. Voting power
    /// is determined by token holdings at the point of transaction, with getVotes() ERC20Votes extension.
    mapping(address => uint256) public votingPowerSpent;

    /// struct for returning ballot counts in function viewCurrentVotes()
    struct songCount {
        uint tokenId;
        uint voteCount;
    } 
    songCount[] internal _songCount;

    /// @dev If we are setting the VOTES_TOKEN_RATIO to 1000000 (1e+6) in script function buyVoteTokens(),
    // then the _purchaseRatio here needs to be: 0.000000000001 (1e+12).
    constructor(
        uint256 _purchaseRatio,
        uint256 _songFee
    ) {
        votesToken = new OPVotes();
        songsToken = new OPSongs();
        purchaseRatio = _purchaseRatio;
        songFee = 1 ether * _songFee / 100;
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

    /// @dev bool true for 1. voting function requirement, 2. Begin new ballot with
    /// verification that the array of songs voted for is empty. 
    function openVoting() external onlyOwner partyOff{
        votesOpen = true;
        if (votedSongs.length > 0) {
            delete votedSongs;
        }
    }

    /// @notice Gives votes tokens based on the amount of ETH sent.
    /// all tokens minted automatically delegate votes to the owner. This is for a more convenient
    /// user experience, as voting power is the essential utility of the coin, and attached to the coins.  
    /// @dev This implementation is prone to rounding problems
    function purchaseVotes() external payable {
       votesToken.mint(msg.sender, msg.value * purchaseRatio);
       votesToken.delegate(msg.sender);
    }

    /// @dev votesToSong mapping records the vote count. 
    /// Array votedSongs records the token Id of any song voted for. This array 
    /// will be looped at the ballot closing to reference token vote counts in votesToSong.
    /// Users will cast amount of votes by token Id from the frontend
     function vote(uint songToken, uint256 amount) external partyOn{
        require(votingPower(msg.sender) >= amount, "You have insufficient voting power");
        votingPowerSpent[msg.sender] += amount;

        // Two approaches for determining if the song needs to be entered into votedSongs array.

        // First approach:
        // votesToSong[songToken] += amount;
        // if (votedSongs.length == 0) {votedSongs.push(songToken);}
        // else{
        //     bool found = false;
        //     for (uint i = 0; 1 < votedSongs.length; i++){
        //         if (votedSongs[i] == songToken){
        //             found = true;
        //             break;
        //         }
        //     }
        //     if (!found) {votedSongs.push(songToken);}
        // }

        // Second approach, seems preferable:
        if (votesToSong[songToken] == 0) {
            votesToSong[songToken] += amount;
            votedSongs.push(songToken);
        }
        else {votesToSong[songToken] += amount;}
    }
    /// @notice Check user 'account's voting power by checking current vote supply against votes cast.
    function votingPower(address account) public view returns (uint256) {
        return votesToken.getVotes(account) - votingPowerSpent[account];
    }

    /// @notice Sets the end of a ballot by comparing all token vote counts and assigning
    /// the winning tokenId to state variable nextSong.
    uint[] private Winners;
    function getNextSong() external partyOn returns (uint256) {
        uint highestCount = 0;
        uint winningToken;
        for (uint i = 0; i < votedSongs.length; i++) {
            uint song = votedSongs[i];
            if (votesToSong[song] > highestCount) {
                highestCount = votesToSong[song];
                if (Winners.length >= 1) delete Winners;
                Winners.push(song);
            }
            else if (votesToSong[song] == highestCount) {
                Winners.push(song);
            }
        }

        winningToken = Winners[0];
        // if there is a tie, winner will be determined by lowest token Id.
        if (Winners.length > 1) {
            for (uint i = 1; i < Winners.length; i++) {
                if (Winners[i] < winningToken) {
                    winningToken = Winners[i];
                }
            }
        }
        // the winning token's vote count is cleared, but all other songs carry vote counts to the next tally.
        delete Winners;
        nextSong = winningToken;
        votesToSong[winningToken] = 0;
        return winningToken; 
    }

    function refreshVotes() external {
        // TODO: should we have this function available while PartyOn? 
        // perhaps users should buy more tokens for more votes during the party,
        // and allow refresh at partyOff. ?
    }
    
    function viewCurrentVotes() external partyOn returns (songCount[] memory) {
        for (uint i = 0; i < votedSongs.length; i++){
            uint _tokenId = votedSongs[i];
            uint _voteCount = votesToSong[_tokenId];
            _songCount.push(songCount(_tokenId, _voteCount));
        }
        return _songCount;
    }

    /// @notice Upon ending the party and closing votes, all vote counts are cleared,
    /// and votedSongs array is cleared, so nothing carries over to the next party ballot.
    function closeVoting() external onlyOwner partyOn {
        votesOpen = false;
        for (uint i = 0; i < votedSongs.length; i++){
            uint song = votedSongs[i];
            votesToSong[song] = 0;
        }
        delete votedSongs;
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