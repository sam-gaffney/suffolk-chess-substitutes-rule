/**
 * Contains constans relating to the data structure of the ECF LMS API
 */
module.exports = {    
    headerTeam1Index: 2,
    headerTeam2Index: 5,
    headerMatchDateIndex: 4,
    baseUrl: 'http://ecflms.org.uk/lms/lmsrest/league',
    player1Index: 2,
    player2Index: 5,
    player1GradeIndex: 3,
    player2GradeIndex: 6, 
    GRADE_TOLERANCE: 10,
    MAX_APPEARENCES_FOR_TEAM:3, 
    MAX_NO_SUBSTITUTIONS:7,
    MAX_DOWNWARDS_SUBSTITUTIONS:3,
    MAX_DIVISION_SUBSTITUTIONS:{
        "SCCA Division 1":0,
        "SCCA Division 2":0,
    },
    divisions:{
        "SCCA Division 1":2,
        "SCCA Division 2":1,
        "SCCA Division 3":0
    }, 
    thirdDivision:"SCCA Division 3"
}