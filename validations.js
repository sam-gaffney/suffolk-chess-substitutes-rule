let constants = require('./constants');
let utilities = require('./utilities');

const checkValidNumberOfSubstitutions = (players, date, division) =>{
    let result = [];
    players.forEach(player=>{
        let nominatedTeams = player.teamNominatedForOnDate(date, division);

        let substitutionsForOtherTeams = player.substitutions.filter(s=>!nominatedTeams.includes(s.team));
        if (substitutionsForOtherTeams.length > constants.MAX_NO_SUBSTITUTIONS){
            result.push({
                type:'Player has made too many substitutions',
                player,
                match
            })
        }
    });

    return result;
}

const checkValidNumberOfSubstitutionsUpOrDown = (players, match, team)=>{
    let result = [];
    let date = match.date;

    players.forEach(player=>{
        let nomination = player.teamNominatedForClub(date, team.club);

        // Return {<teamName>:<appearence>}
        let subCount = player.substitutions.reduce((acc, val)=>{
            let division = val.team.division;
            let teamName = val.team.name;

            let divisionCount = (acc[division] || {});
            divisionCount[teamName] = (divisionCount[teamName] ||0)+1;

            if (!divisionCount.firstAppearance) // record first team played for
                divisionCount.firstAppearance = teamName;

            acc[division] = divisionCount;
            return acc;
        }, {});


        for(let division in subCount){
            let divisionInfo = subCount[division];
            let noTeamsPlayedForInDivision = Object.keys(divisionInfo).length -1; // -1 to account for the firstAppearence key
            // If played for more than one team in the same division (except the third division)
            // then error
            if (noTeamsPlayedForInDivision > 1 && division != constants.thirdDivision){
                // Unless this is the team you first player for
                if (divisionInfo.firstAppearance != team.name){
                    result.push({
                        type:'Substitution in same division!',
                        player,
                        match
                    });
                }
            }

            if (!nomination) // If not nominated for a team yet upwards, downwards substitutions a bit meaningless 
                return;
            
            let nominatedTeam = nomination.team;

            let appearences = Object.values(subCount[division]).reduce((acc, val)=>acc+val, 0); //TODO: do we need the reduction here, or should we have recorded everything at the division level above.
            let compareDivisions = utilities.compareDivsions(nominatedTeam.division, division);
            if (compareDivisions < 0){ // If division is higher division
                if (appearences > constants.MAX_DIVISION_SUBSTITUTIONS[division])
                    result.push({
                        type:'Too many upward substitutions', 
                        player, 
                        match
                    });
            }
            else if (compareDivisions > 0){ // If division is lower division{
                if (appearences > constants.MAX_DOWNWARDS_SUBSTITUTIONS)
                    result.push({
                        type:'Too many downward substitutions', 
                        player, 
                        match
                    });
            }
        }

    });

    return result;
}

/**
 * Checks that players' grades are below or match nominated team
 * @param {} team 
 * @param {*} nominations 
 * @param {*} match The match being played
 */
 const checkPlayersAgainstNominatedPlayerGrade = (team, nominations, match, gradeTolerance=constants.GRADE_TOLERANCE)=>{
    let result = [];
 
    try{
        team.players.forEach((player,index)=>{
            let nominatedPlayer = nominations[index];
            let nominatedPlayerGrade = nominatedPlayer.gradeOnDate(match.date);
            let playerGrade = player.gradeOnDate(match.date);

            // If the player is nominated but not the nominatedPlayer and grade within grade tolerance then return
            if (nominations.includes(player) && playerGrade <= nominatedPlayerGrade+gradeTolerance)
                return;

            if (playerGrade > nominatedPlayerGrade) 
                result.push({
                    type:'Player grade too high',
                    player:player.name,
                    match
                });
        });
    }
    catch(error){
        console.log("some problem");
    }

    return result;
}

/**
 * Checks that players are in grade order taking into grade tolerance
 * @param {*} team The team 
 * @param {Date} match The match
 * @param {*} gradeTolerance The tolerance
 */
const checkPlayersInGradeOrder = (team,match, gradeTolerance=10)=>{
    let result = [];
    let teamList = team.players.slice(0,team.players.length);//This should always be 0 - 4.
    let previousPlayer = teamList.shift();

    while(teamList.length > 0){
        let currentPlayer = teamList.shift();
        let currentPlayerGrade = currentPlayer.gradeOnDate(match.date);
        let lastPlayerMaxGrade = previousPlayer.gradeOnDate(match.date)+gradeTolerance;
        if (currentPlayerGrade > lastPlayerMaxGrade){
            result.push({
                'type':'Player Out of Grade Order',
                'player':currentPlayer.name,
                match,

            })
            result[team.teamName] = (result[team.teamName] || []).push(currentPlayer);
        }

        previousPlayer = currentPlayer;
    }

    return result;
};

module.exports = {
    checkPlayersAgainstNominatedPlayerGrade,
    checkPlayersInGradeOrder,
    checkValidNumberOfSubstitutions,
    checkValidNumberOfSubstitutionsUpOrDown,
}