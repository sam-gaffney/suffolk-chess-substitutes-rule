const csv = require('csv-parse');
const fs = require('fs');
const utilities = require('./utilities.js');
const constants = require('./constants.js');
const repository = require('./matchRepository.js');
const validations = require('./validations.js');
const dataFiles = require('./dataFiles.js');

( async ()=>{

    for (let divisionName in constants.divisions){
        let matchData = await utilities.fetchMatches(constants.leagueId,divisionName);
        repository.addDivisionMatches(divisionName, matchData);

        // calculate the number of substitutions allowed
        if (divisionName !== constants.thirdDivision){
            let noSubs = matchData.length /2;
            constants.MAX_DIVISION_SUBSTITUTIONS[divisionName] = noSubs;
        }
    }

    await new Promise(dataFiles.readGradesFile(repository));  
    await new Promise(dataFiles.readNominationsFile(repository));

    let errors = [];
    let substitutions = [];
    // Now go through every match, check players in grade order or at least within 10   
    repository.allMatches.forEach((match)=>{
        let homeTeamNominations = repository.getNominatedTeam(match.homeTeam.team.name, match.date);
        let awayTeamNominations = repository.getNominatedTeam(match.awayTeam.team.name, match.date);
        // errors = [...errors, ...validations.checkPlayersInGradeOrder(match.homeTeam, match)];
        // errors = [...errors, ...validations.checkPlayersInGradeOrder(match.awayTeam, match)];
        // errors = [...errors, ...validations.checkPlayersAgainstNominatedPlayerGrade(match.homeTeam, homeTeamNominations, match)];
        // errors = [...errors, ...validations.checkPlayersAgainstNominatedPlayerGrade(match.awayTeam, awayTeamNominations, match)];


        // Record any subtitutions for the two teams
        let awayTeamSubs = utilities.findSubstitutes(match.awayTeam, awayTeamNominations, match.date);
        awayTeamSubs.forEach(sub=>sub.addSubstitution(match.awayTeam.team, match));
        errors = [...errors, ...validations.checkValidNumberOfSubstitutions(awayTeamSubs, match.date, match.awayTeam.team.division)];
        errors = [...errors, ...validations.checkValidNumberOfSubstitutionsUpOrDown(awayTeamSubs, match, match.awayTeam.team)];

        let homeTeamSubs = utilities.findSubstitutes(match.homeTeam, homeTeamNominations, match.date);
        homeTeamSubs.forEach(sub=>sub.addSubstitution(match.homeTeam.team, match));
        errors = [...errors, ...validations.checkValidNumberOfSubstitutions(homeTeamSubs, match.date, match.homeTeam.team.division)];
        errors = [...errors, ...validations.checkValidNumberOfSubstitutionsUpOrDown(homeTeamSubs, match, match.homeTeam.team)];

    });

    console.log("testing time");  

})();



