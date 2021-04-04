const csv = require('csv-parse');
const fs = require('fs');
const utilities = require('./utilities.js');
const constants = require('./constants.js');


const leagueId = 37698;
const leagueName = 'Division 1';
const GRADE_TOLERANCE = 10;

const MAX_UPWARDS_SUBSTITUTION = 7;
const MAX_DOWNWARDS_SUBSTITUTION = 3;

/**
 * Looks through the matches and saves the first team to play for a team as the nominated team
 * @param {*} matchData 
 */
const generateNominations = matchData =>{
    let teamWithNominations = {};
    let findTeam = (matchDetails,playerIndex)=>
        matchDetails.reduce((acc,gameData)=>{
            acc.push([gameData[playerIndex], parseGrade(gameData[playerIndex+1])]);
            return acc;
        },[]);

    matchData.forEach((entry)=>{
        // Find the two teams in the header
        let team1 = entry.header[constants.headerTeam1Index];
        let team2 = entry.header[constants.headerTeam2Index];

        if (utilities.matchNotPlayed(entry.data[0]))
            return;

        if (!teamWithNominations[team1])
            teamWithNominations[team1] = findTeam(entry.data, constants.player1Index);

        if (!teamWithNominations[team2])
            teamWithNominations[team2] = findTeam(entry.data, constants.player2Index);
    });

    return teamWithNominations;
}

const generateListOfGamesPlayed = matchData =>{

    // Go through the data and count the number of appearences by team for each player
    matchData = matchData.reduce((accumulator,entry)=>        
        entry.data.reduce((accumulator, element) =>{
            let playerName1 = element[constants.player1Index];
            let playerName2 = element[constants.player2Index];

            let teamName1 = entry.header[constants.headerTeam1Index];
            let teamName2 = entry.header[constants.headerTeam2Index];

            // To check to see whether the match has been played, see if the grades are set to 000
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
 * List all the appearences against a player
 * @param {*} matchData 
 */
const generateAppearenceData = (matchData) =>{
    return matchData.reduce((acc,match)=>{
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

const generateMainTeamList = (playerAppearences, nominations)=>{
    let result = {};
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
            'grade':utilities.parseGrade(element[constants.player1GradeIndex])
        });

        result.awayTeam.team.push({
            'name':element[constants.player2Index],
            'grade':utilities.parseGrade(element[constants.player2GradeIndex]) 
        });
    });

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

( async ()=>{

    // Generate the nominations for the SCCA League
    const suffolkLeagueDivisions = ["SCCA Division 1", "SCCA Division 2", "SCCA Division 3"];
    const divisionOrder = {
        "SCCA Division 1":2,
        "SCCA Division 2":1,
        "SCCA Division 3":0
    }

    let nominations = {};
    const teamToDivision = {};

    // Read in all the nominations from a file
    await new Promise((resolve, reject)=>{
        fs.createReadStream('./Data/nominations.csv')
          .pipe(csv())
          .on('data',row=>{
                let teamName = row[0];
                let players = [];
                for(let i=1;i<5;i++){
                    let playerArray = [];
                    let parts = row[i].split(" ").filter(entry=>!!entry);
                    if (parts[0].trim() === "()") continue;//No entry in nominations table apaz
                    try{
                    var grade = /\((\d+)\)/g.exec(parts[parts.length-1])[1];
                    }
                    catch(error){
                        console.log("help");
                    }
                    playerArray.push(grade);
                    let name = parts[parts.length-2]+", ";
                    for(let j=0;j<parts.length-2;j++)
                        name+=parts[j]+" ";
                    name = name.trim();
                    playerArray.unshift(name);

                    players.push(playerArray);
                }
                // Update the nominations map
                nominations[teamName] = players;
                teamToDivision[teamName] = row[row.length-1];
            })
          .on('end',()=>resolve());
    });
      

    const compareDivsions = (divisionA, divisionB)=> divisionOrder[divisionA] - divisionOrder[divisionB];


    // All the matches
    const allMatches = [];

    for (let division in suffolkLeagueDivisions){
        let matchData = await utilities.fetchMatches(leagueId,suffolkLeagueDivisions[division]);
        allMatches.push.apply(allMatches,matchData);
    }

    let playerTeamNominatedFor = convertToPlayersToTeams(nominations);

    let playersNominatedForMoreThanOneTeam = findPlayersNominatedForMultipleTeamsInTheSameDivision(teamToDivision, playerTeamNominatedFor);


    // List appearences by player
    let appearencesByPlayer = generateAppearenceData(allMatches);
    // Find any that now have a main team but aren't nominated
    let playersWithMainTeamButNoNomination = generateMainTeamList(appearencesByPlayer, playerTeamNominatedFor);

    // Combine with two sets of nomination info
    for(let player in playersWithMainTeamButNoNomination)
        playerTeamNominatedFor[player] = [playersWithMainTeamButNoNomination[player]];

    let errors = [];
    let substitutions = [];
    // Now go through every match, check players in grade order or at least within 10   
    allMatches.forEach((match)=>{
        match = makeTwoTeamLists(match);
        errors = [...errors, ...checkPlayersInGradeOrder(match.awayTeam)];
        errors = [...errors, ...checkPlayersInGradeOrder(match.homeTeam)];
        errors = [...errors, ...checkPlayersAgainstNominatedPlayerGrade(match.awayTeam, nominations)];
        errors = [...errors, ...checkPlayersAgainstNominatedPlayerGrade(match.homeTeam, nominations)];

        // Find any substitutions
        substitutions = [...substitutions, ...findSubstitutes(match.awayTeam,playerTeamNominatedFor)];
        substitutions = [...substitutions, ...findSubstitutes(match.homeTeam,playerTeamNominatedFor)];
    });

    // Process the subsitutions into a different structure {'<playerName>':{'<teamName>':appearenceCount}}
    substitutions = substitutions.reduce((acc, value)=>{
        let teamCountObject =  acc[value.player] || {};
        teamCountObject[value.team] = ( teamCountObject[value.team] || 0)+1;
        acc[value.player] = teamCountObject;

        return acc;
    },{});

     Object.keys(substitutions).forEach(key=>{
        const substitution = substitutions[key];
         // Find nominated teams
        let nominatedTeams = playerTeamNominatedFor[key];
        
        if (!nominatedTeams) // I guess if no nominated team we don't really care.
            return;

         // I guess we need to group the subsitutions by club really...
        let groupedByClub = Object.keys(substitution).reduce((acc,team)=>{
            let club = utilities.findClubFromTeamName(team);
            acc[club] = {
                ...acc[club],
                [team]:substitution[team]
            }
            return acc;
        } ,{});

        // Group nominated teams by club
        let clubToNominatedTeam = nominatedTeams.reduce((acc,team)=>{
            let club = utilities.findClubFromTeamName(team);
            acc[club] = [...(acc[club]||[]), team]; 
            return acc;
        },{});

        // Work out substitution rule in context of clubs in other divisions (actually I don't think this makes sense
        // as of course you can't play for two teams in the same division.... TODO Rethink..)
        for(let club in groupedByClub){
            // find the matching nominated team and division
            let nominatedTeamForClub = clubToNominatedTeam[club];

            let division = teamToDivision[nominatedTeamForClub];

            var substitutionsDown = 0;
            let substitutionsInSameDivision = 0;
            var substitutionsUp = 0;
            let substitutionsForClub = groupedByClub[club];
            Object.keys(substitutionsForClub).forEach(team=>{
                let teamDivision = teamToDivision[team];
                let comparison = compareDivsions(division, teamDivision);
                if (comparison < 0)
                    substitutionsDown +=1
                else if (comparison > 0)
                    substitutionsUp += 1
            })

            if (substitutionsDown > MAX_DOWNWARDS_SUBSTITUTION){
                errors.push({
                    type:'Too many downwards substitutions',
                    player:key,
                    team:nominatedTeamForClub
                })
            }
            
            if (substitutionsInSameDivision){
                errors.push({
                    type:'Subsitution in same division!',
                    player:key,
                    team:nominatedTeamForClub
                })
            }

            if (substitutionsUp > MAX_UPWARDS_SUBSTITUTION){
                errors.push({
                    type:'Too many upwards substitutions',
                    player:key,
                    team:nominatedTeamForClub
                })
            }

        }


     }); 

    console.log("testing time");
    

})();



