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
    // Eliminate duplicates and matches which haven't yet been played.
    let filteredData = [];
    let matchesSeen = new Set();

    for(let i = 0;i<data.length;i++){
        let match = data[i];
        if (!matchesSeen.has(match.title) && !matchNotPlayed(match)){ 
            filteredData.push(match);
            matchesSeen.add(match.title);
        }
    }

    data = filteredData;
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
const findClubFromTeamName = teamName => /(.*)\s?([A-Z])?$/.exec(teamName)[1];

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
const matchNotPlayed = element => element.data[0][constants.player1GradeIndex] === "000" || element.data[0][constants.player2GradeIndex] === "000"

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
 * FInd players who are subtitues and adds a record of the fact to the 
 * players object.
 * @param {} team 
 * @param {*} nominatedPlayers 
 * @param {} date The date the match occured that the substitution occured in.
 */
const findSubstitutes = (team, nominatedPlayers, date)=>{
   return team.players.filter(player=>!nominatedPlayers.includes(player) && player.name != "Default");
}


const compareDivsions = (divisionA, divisionB)=> constants.divisions[divisionA] -constants. divisions[divisionB];

module.exports = {
    fetchMatches, 
    findClubFromTeamName, 
    parseGrade,
    matchNotPlayed,
    convertToPlayersToTeams,
    findPlayersInMultipleTeams,
    findPlayersNominatedForMultipleTeamsInTheSameDivision,
    findSubstitutes,
    compareDivsions,
}