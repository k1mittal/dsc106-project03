# Notes for stress data
- StudentGrades.txt contains the grades for each student 
- The Data.zip file contains folders for each participants named as S1, S2, etc.
- Under each of the folders corresponding to each partcipants, there are three folders 'Final', 'Midterm 1', and 'Midterm 2', corresponding to three exams.
- Each of the folders contains csv files: 'ACC.csv', 'BVP.csv', 'EDA.csv', 'HR.csv', 'IBI.csv', 'tags.csv', 'TEMP.csv', and 'info.txt'.
- 'info.txt' contains detailed information of each of these files.
- All the unix time stamps are date shifted for deidentification but not time shifted. The date shift have been carried out such a way that it does not change the status of the day light saving settings (CT/CDT) of a day.
- All exam starts at 9:00 AM (CT or CDT depending on the date corresponding to the unix time stamp). Mid terms are 1.5 hr long and final is 3 hr long.
- Sampling frequency of the arrays are given with the structs
- The dataset contains two female and eight male participants, however the gender is not mentioned for the purpose of deidentification
  