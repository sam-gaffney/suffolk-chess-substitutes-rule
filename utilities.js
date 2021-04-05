const fetch = require('node-fetch');
const constants = require('./constants');

/**
 * Fetches match data from the ECF LMS
 * @param {*} leagueId 
 * @param {*} leagueName 
 */
const fetchMatches = async (leagueId,leagueName) =>{
    let response = await fetch(`${constants.baseUrl}/match`,{
        method:'POST',
        body:JSON.stringify({
            'org':leagueId,
            'name':leagueName
        }),
        headers:{
            'Content-Type':'application/json',
            "Accept":'application/json'
        }
    });

    let data = await response.json();

    // Order the matches by the date played so the earliest are first in the list
    data.sort((e1,e2)=>{
        let val = new Date(e1.header[constants.headerMatchDateIndex]).getTime()-new Date(e2.header[constants.headerMatchDateIndex]).getTime();
        return val;
    });

    return data;
}

/**
 * Regex that maps a team to a particular club. 
 * At the moment, temas have names of the form <Club> <Letter> 
 * Therefore, regex just finds the first word. 
 * For a club like <Bury St Edmund's> this is clearly problematic if another club was also called Bury.
 * @param {} teamName 
 */
const findClubFromTeamName = teamName => /\w+/.exec(teamName)[0];

/**
 * Returns the number from a string with a grade + letter (e.g. 180A)
 * @param {*} gradeString A grade of the form <number><letter>, e.g. 180A
 */
const parseGrade = gradeString => Number(/\d+/.exec(gradeString)[0]);

/**
 * Determines whether a match has been played. 
 * It is assumed this is the case if both players have a zero grade. 
 * @param {*} element Match element from the LMS data.
 */
const matchNotPlayed = element => element[constants.player1GradeIndex] === "000" || element[constants.player2GradeIndex] === "000"

/**
 * Takes a match and makes two team lists. 
 * TODO: The way data is stored in the repository should be refactored, making this methods redundant.
 * @param {*} match 
 */
const makeTwoTeamLists = match =>{
    let result = {
        'homeTeam':{
            'teamName':match.header[constants.headerTeam1Index].trim(),
            'team':[]
        },
        'awayTeam': {
            'teamName':match.header[constants.headerTeam2Index].trim(),
            'team':[]
        }
    }
    
    match.data.forEach(element => {
        result.homeTeam.team.push({
            'name':element[constants.player1Index],
            'grade':parseGrade(element[constants.player1GradeIndex])
        });

        result.awayTeam.team.push({
            'name':element[constants.player2Index],
            'grade':parseGrade(element[constants.player2GradeIndex]) 
        });
    });

    return result;
}

/**
 * Converts a structure like { 'team':[player, player]} to {player:[team,team]}
 * @param {} nominations 
 */
const convertToPlayersToTeams = (nominations)=>{
    return Object.keys(nominations).reduce((outerAcc,team)=>{
        return nominations[team].map(player=>({'player':player[0],'team':team}))
                         .reduce((acc, val)=>{
                             let playerTeamArray = (acc[val.player] || []);
                             playerTeamArray.push(val.team);
                            return {
                                ...acc,
                                [val.player]:playerTeamArray
                            }
                         },outerAcc)
    },{});
}

const findPlayersInMultipleTeams = playersList => Object.keys(playersList).filter(val=>Object.keys(playersList[val]).length > 1);

const findPlayersNominatedForMultipleTeamsInTheSameDivision = (teamDivsionMap, playerToNominatedTeamMap)=>{
    let tempResult = 
         Object.keys(playerToNominatedTeamMap)
          .map(player=>({
              'player':player,
              'teams':playerToNominatedTeamMap[player]
                        .map(team=>teamDivsionMap[team])
                        .reduce((acc,team)=>({...acc,[team]:(acc[team]||0)+1}),{})
          }));
         
    return tempResult
          .filter(val=>Object.values(val.teams).find(val=>val>1))
          .map(entry=>entry.player);
};

/**
 * Generates a list of players who played in the team who are substitutes.
 * @param {} team 
 * @param {*} nominatedPlayers 
 */
const findSubstitutes = (team, nominatedPlayers)=>{
    return team.team
               .filter(player=>!(nominatedPlayers[player.name] || []).includes(team.teamName))
               .map(player=>({
                        'player':player.name,
                        'team':team.teamName
                    }));
}

module.exports = {
    fetchMatches, 
    findClubFromTeamName, 
    parseGrade,
    matchNotPlayed,
    makeTwoTeamLists,
    convertToPlayersToTeams,
    findPlayersInMultipleTeams,
    findPlayersNominatedForMultipleTeamsInTheSameDivision,
    findSubstitutes,
}