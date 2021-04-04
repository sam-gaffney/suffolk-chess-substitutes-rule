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

module.exports = {
    fetchMatches, 
    findClubFromTeamName, 
    parseGrade,
}