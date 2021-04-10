
const constants = require('./constants');
var utilities = require('./utilities');

const createTeam = (name, division)=>({
    name, 
    division
})

const createMatch = ()=>({
    homeTeam:{
        teamName:'',
        players:[]
    },
    awayTeam:{
        teamName:'',
        players:[]
    },
    date:null
});

/**
 * A chess player. 
 */
class Player{
    constructor(name=''){
        this.name=name;
        this.code = '';
        this.grades=[];
        this.nominations=[];
        this.substitutions = [];
    }

    /**
     * Queries the nomination info to determine if the player was nominated for {@param teamName}
     * on the given date.
     * @param {*} teamName 
     * @param {*} date 
     */
    nominatedOnDate(teamName, date){
        let nominationsForTeam = this.nominations.filter(n=>n.club === teamName);
        let currentlyValidNomination = nominationsForTeam.filter(n=>n.startDate <= date && (!n.endDate || n.endDate > date));
        
        // If a currently valid nomination was found, then use that.
        return currentlyValidNomination.length > 0;
    }

    gradeOnDate(date){
        let relevantGrade;
        for(let i = 0;i<this.grades.length;i++){
            let gradeInfo = this.grades[i];
            if (gradeInfo.date > date)
                break;
            relevantGrade = gradeInfo.grade;
        }
        
        return relevantGrade;
    }
}

/**
 * Repository for matches. 
 * Provides methods for formatting the data provided.
 */
class MatchRepository{

    allMatches = [];
    playersByName = {};
    playersByCode = {};

    constructor(){

    }

    /**
     * Finds the player from the players lookup or creates a new player object.
     * @param {*} playerName 
     * @param {*} playerGrade 
     * @param {*} matchDate 
     */
    createOrFindPlayer = playerName=>{
        let player = this.playersByName[playerName];
        if (!player){
            player = new Player(playerName);
            this.playersByName[playerName] = player;
        }

        return player;
    }

    associatePlayerWithCode = (code, name)=>{
        let player = this.createOrFindPlayer(name); // Player may not actually have played in SCCA comp - just being used for rating
        this.playersByCode[code] = player; 
        player.code = code;
    }
    /**
     * Adds nomination info to the player objects. 
     * Assumes that nomination changes are added in order in which they occured.
     */
    addNominationInfo = nominationRecord=>{
        let player = this.playersByCode[nominationRecord.playerCode];
        if (nominationRecord.nominated){
            player.nominations.push({
                startDate:nominationRecord.changeDate, 
                club:nominationRecord.club,
                endDate:null
            });
        }
        else{
            let matchingNominations = player.nominations.filter(n=>n.club == nominationRecord.club);
            let lastMatchingNomination = matchingNominations[matchingNominations.length-1];
            lastMatchingNomination.endDate = nominationRecord.changeDate;
        }
    }

    addPlayerGradeInfo(playerName, gradeInfo){
        let player = this.playersByName[playerName];
        if (player)
            player.grades = gradeInfo;
    }
    
    addDivisionMatches(division, matches){
        // TODO: Keep division as may be used at a later stage
        //this.allMatches.push(...matches);

        matches.forEach(serverMatch=>{
            let internalMatch = createMatch();
            internalMatch.date = new Date(serverMatch.header[constants.headerMatchDateIndex]);
            internalMatch.homeTeam.teamName = serverMatch.header[constants.headerTeam1Index];
            internalMatch.awayTeam.teamName = serverMatch.header[constants.headerTeam2Index];

            serverMatch.data.forEach(entry=>{
                let homeTeamPlayerName = entry[constants.player1Index];
                let homeTeamPlayer = this.createOrFindPlayer(homeTeamPlayerName);
                internalMatch.homeTeam.players.push(homeTeamPlayer);

                let awayTeamPlayerName = entry[constants.player2Index];
                let awayTeamPlayer = this.createOrFindPlayer(awayTeamPlayerName);
                internalMatch.awayTeam.players.push(awayTeamPlayer);
            });

            this.allMatches.push(internalMatch);
        });
    }

    getNominatedTeam = (teamName, date)=>{
        let playersInTeam = Object.values(this.playersByName)
                                  .filter(p=>p.nominations.find(n=>n.club === teamName));
        let nominatedPlayersOnDate = playersInTeam.filter(p=>p.nominatedOnDate(teamName,date));
        // Sort by descending grade order
        nominatedPlayersOnDate = nominatedPlayersOnDate.sort((p1,p2)=>p2.gradeOnDate(date)-p1.gradeOnDate(date));

        return nominatedPlayersOnDate;
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