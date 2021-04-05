
const constants = require('./constants');
var utilities = require('./utilities');

/**
 * Repository for matches. 
 * Provides methods for formatting the data provided.
 */
class MatchRepository{

    allMatches = [];

    constructor(){

    }
    
    addDivisionMatches(division, matches){
        // TODO: Keep division as may be used at a later stage
        this.allMatches.push(...matches);
    }

    /**
     * Generates a data structure containing all the appearences of each individual player
     */
    appearances = () =>{
        return this.allMatches.reduce((acc,match)=>{
            match.data.forEach(game=>{
                let player1Name = game[constants.player1Index];
                let matchesData = (acc[player1Name] || []);
                matchesData.push({'team':match.header[constants.headerTeam1Index],'date':match.header[constants.headerMatchDateIndex]});
                acc[player1Name] = matchesData;

                let player2Name = game[constants.player2Index];
                matchesData = (acc[player2Name] || []);
                matchesData.push({'team':match.header[constants.headerTeam2Index],'date':match.header[constants.headerMatchDateIndex]});
                acc[player2Name] = matchesData;
            });

            return acc;
        },{});
    }

    /**
     * Assigns un-nominated players to the team they make their first three appearences for. 
     * TODO: should this really belong in the matchRepository class at all??
     * @param The formal nominations list.
     */
    assignNonNominatedPlayersAMainTeam = nominations=>{
        let result = {};
        let playerAppearences = this.appearances();

        Object.keys(playerAppearences)
              .filter(player=>!nominations[player])
              .forEach(player=>{
                    // If the player makes three appearences for a team, then nominated for it.
                    let countOfAppearences = {}
                    // Need to sort the appearences by date here....
                    for(let i = 0;i<playerAppearences[player].length;i++){
                        let entry = playerAppearences[player][i]
                        countOfAppearences[entry.team]= (countOfAppearences[entry.team] || 0)+1;
    
                        if (countOfAppearences[entry.team] == 3){
                            result[player] = entry.team;
                            i = playerAppearences[player].length;
                            break;
                        }
                    }
              })
    
        return result;
    }

    /**
     * Finds the matches played for each team by a given player.
     */
    findMatchesPlayedForTeamByPlayer = () =>{
        let matchData = this.allMatches;
        // Go through the data and count the number of appearences by team for each player
        matchData = matchData.reduce((accumulator,entry)=>        
            entry.data.reduce((accumulator, element) =>{
                let playerName1 = element[constants.player1Index];
                let playerName2 = element[constants.player2Index];
    
                let teamName1 = entry.header[constants.headerTeam1Index];
                let teamName2 = entry.header[constants.headerTeam2Index];
    
                if (utilities.matchNotPlayed(element))
                    return accumulator;
    
                return {
                    ...accumulator,
                    [playerName1]:{
                        ...accumulator[playerName1],
                        [teamName1]:(( accumulator[playerName1] || {} )[teamName1] || 0) + 1
                    },
                    [playerName2]:{
                        ...accumulator[playerName2],
                        [teamName2]:(( accumulator[playerName2] || {} )[teamName2] || 0) + 1
                    }
                };
    
            },accumulator),
        {});
    
        return matchData;   
    };

}

module.exports = new MatchRepository();