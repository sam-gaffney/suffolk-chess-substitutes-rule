 // Contains functions that read external files (e.g. nominations and gardes)
const csv = require('csv-parse');
const fs = require('fs');

const readNominationsFile = matchRepository => (resolve, reject)=>{
    fs.createReadStream('./Data/nominations.csv')
      .pipe(csv({
          columns:true
      }))
      .on('data',row=>{
        row.nominated = Number(row['nominated'].trim());
        row.changeDate = new Date(row.changeDate);
        matchRepository.addNominationInfo(row);
    })
      .on('end',()=>resolve());
};

const readGradesFile = matchRepository => (resolve, reject)=>{
    fs.createReadStream('./Data/grades.csv')
    .pipe(csv({
        columns:true
    }))
    .on('data',row=>{
        let playerName = row.Name;
        let grades = [];
        grades.push({
            grade:Number(row['Aug Standard Grade']),
            date:new Date('2019-08-01')
        });
        grades.push({
            grade:Number(row['Jan Standard Grade']),
            date:new Date('2020-01-31')
        });
        matchRepository.associatePlayerWithCode(row['ECF Ref'].trim(), playerName);
        matchRepository.addPlayerGradeInfo(playerName, grades);
      })
    .on('end',()=>resolve());
}

module.exports = {
    readNominationsFile, 
    readGradesFile,
}