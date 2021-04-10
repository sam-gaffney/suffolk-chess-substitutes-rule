/**
 * Checks that players' grades are below or match nominated team
 * @param {} team 
 * @param {*} nominations 
 * @param {*} date the date the match was played
 */
 const checkPlayersAgainstNominatedPlayerGrade = (team, nominations, date)=>{
    let result = [];
 
    try{
        team.players.forEach((player,index)=>{
            let nominatedPlayerGrade = nominations[index].gradeOnDate(date);
            let playerGrade = player.gradeOnDate(date);
            if (playerGrade > nominatedPlayerGrade)
                result.push({
                    type:'Player grade too high',
                    player:player.name,
                    'team':team.teamName
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
 * @param {Date} date The date of the match
 * @param {*} gradeTolerance The tolerance
 */
const checkPlayersInGradeOrder = (team,date, gradeTolerance=10)=>{
    let result = [];
    let teamList = team.players.slice(0,team.players.length);//This should always be 0 - 4.
    let previousPlayer = teamList.shift();

    while(teamList.length > 0){
        let currentPlayer = teamList.shift();
        let currentPlayerGrade = currentPlayer.gradeOnDate(date);
        let lastPlayerMaxGrade = previousPlayer.gradeOnDate(date)+gradeTolerance;
        if (currentPlayerGrade > lastPlayerMaxGrade){
            result.push({
                'type':'Player Out of Grade Order',
                'player':currentPlayer.name,
                'team':team.teamName

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
}