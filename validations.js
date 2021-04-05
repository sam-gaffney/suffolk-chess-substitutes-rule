/**
 * Checks that players' grades are below or match nominated team
 * @param {} team 
 * @param {*} nominations 
 */
 const checkPlayersAgainstNominatedPlayerGrade = (team, nominations)=>{
    let result = [];
    let teamNomination = nominations[team.teamName];
    if (team.teamName === 'Bury St Edmunds E')
        console.log("Bury Error");
    try{
        team.team.forEach((player,index)=>{
            let nominatedPlayerInfo = teamNomination[index];
            
            if (player.grade > nominatedPlayerInfo[1])
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
 * @param {*} gradeTolerance The tolerance
 */
const checkPlayersInGradeOrder = (team, gradeTolerance=10)=>{
    let result = [];
    let teamList = team.team.slice(0,team.team.length);//This should always be 0 - 4.
    let lastPlayer = teamList.shift();

    while(teamList.length > 0){
        let currentPlayer = teamList.shift();

        if (currentPlayer.grade > lastPlayer.grade+gradeTolerance){
            result.push({
                'type':'Player Out of Grade Order',
                'player':currentPlayer.name,
                'team':team.teamName

            })
            result[team.teamName] = (result[team.teamName] || []).push(currentPlayer);
        }

        lastPlayer = currentPlayer;
    }

    return result;
};

module.exports = {
    checkPlayersAgainstNominatedPlayerGrade,
    checkPlayersInGradeOrder,
}