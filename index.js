// lecture input components
let lectureConducted = document.getElementById("lectureConducted");
let lectureAttended = document.getElementById("lectureAttended");
let lectureTcbr = document.getElementById("lectureTcbr");
let lectureInputsContainer = document.getElementById("lectureInputsContainer");



// practical input components
let practicalConducted = document.getElementById("practicalConducted");
let practicalAttended = document.getElementById("practicalAttended");
let practicalTcbr = document.getElementById("practicalTcbr");
let practicalInputsContainer = document.getElementById("practicalInputsContainer");

// skill input components
let skillConducted = document.getElementById("skillConducted");
let skillAttended = document.getElementById("skillAttended");
let skillTcbr = document.getElementById("skillTcbr");
let skillInputsContainer = document.getElementById("skillInputsContainer");

// tutorial input component 
let tutorialConducted = document.getElementById("tutorialConducted");
let tutorialAttended = document.getElementById("tutorialAttended");
let tutorialTcbr = document.getElementById("tutorialTcbr");
let tutorialInputsContainer = document.getElementById("tutorialInputsContainer");

// final error
let errorNote = document.getElementById("errorNote");


// Source - https://stackoverflow.com/a
// Posted by ramakrishna, modified by community. See post 'Timeline' for change history
// Retrieved 2025-11-10, License - CC BY-SA 4.0

document.onkeydown = (e) => {
    if (e.key == 123) {
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'I') {
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'C') {
        e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key == 'J') {
        e.preventDefault();
    }
    if (e.ctrlKey && e.key == 'U') {
        e.preventDefault();
    }
};
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});


// Form 
let form = document.getElementById("form");

// Attendance Result

let result = document.getElementById("result");


// lecture input correction code which corrects the error inputs.
lectureConducted.addEventListener("keyup", function(event) {
    if (!isNaN(Number(lectureConducted.value))) {
       errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            
            
            lectureConducted.value = lectureConducted.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});



lectureAttended.addEventListener("keyup", function(event) {
    if (!isNaN(Number(lectureAttended.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            lectureAttended.value = lectureAttended.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});
lectureTcbr.addEventListener("keyup", function(event) {
    if (!isNaN(Number(lectureTcbr.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            lectureTcbr.value = lectureTcbr.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});

// Tutorial input correction code which corrects the error inputs.
tutorialConducted.addEventListener("keyup", function(event) {
    if (!isNaN(Number(tutorialConducted.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            tutorialConducted.value = tutorialConducted.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");
        }
    }
});
tutorialAttended.addEventListener("keyup", function(event) {
    if (!isNaN(Number(tutorialAttended.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            tutorialAttended.value = tutorialAttended.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});
tutorialTcbr.addEventListener("keyup", function(event) {
    if (!isNaN(Number(tutorialTcbr.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            tutorialTcbr.value = tutorialTcbr.value.slice(0, -1);
        } else {
           errorNote.classList.add("errorNoteoff");

        }
    }
});

// practical input corrector code which corrects the error inputs.
practicalConducted.addEventListener("keyup", function(event) {
    if (!isNaN(Number(practicalConducted.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            practicalConducted.value = practicalConducted.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");
        }
    }
});



practicalAttended.addEventListener("keyup", function(event) {
    if (!isNaN(Number(practicalAttended.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            practicalAttended.value = practicalAttended.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});

practicalTcbr.addEventListener("keyup", function(event) {
    if (!isNaN(Number(practicalTcbr.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            practicalTcbr.value = practicalTcbr.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});


// Skill input corrector code which corrects the error inputs.

skillConducted.addEventListener("keyup", function(event) {
    if (!isNaN(Number(skillConducted.value))) {
        errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            skillConducted.value = skillConducted.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");
        }
    }
});



skillAttended.addEventListener("keyup", function(event) {
    if (!isNaN(Number(skillAttended.value))) {
       errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            skillAttended.value = skillAttended.value.slice(0, -1);
        } else {
            errorNote.classList.add("errorNoteoff");

        }
    }
});

skillTcbr.addEventListener("keyup", function(event) {
    if (!isNaN(Number(skillTcbr.value))) {
       errorNote.classList.add("errorNoteoff");
    } else {
        if ((isNaN(Number(event.key))) && event.key !== "Shift" && event.key !== "Backspace" && event.key !== "Enter") {
            skillTcbr.value = skillTcbr.value.slice(0, -1);
        } else {
           errorNote.classList.add("errorNoteoff");

        }
    }
});










// calculator part 


form.addEventListener("submit", function(event) {
    event.preventDefault();

    let allNeumerator = 0;
    let alldenominator = null;
    let lectureError = false;
    let tutorialError = false;
    let skillError = false
    let practicalError = false;
    
    
    if (lectureConducted.value !== "" && lectureAttended.value !== "") {

        let lectureConductedValue = parseInt(lectureConducted.value);
        let lectureAttendedValue = parseInt(lectureAttended.value);
        let lTcbr = lectureTcbr.value;
        

        if (lTcbr === "") {
            lTcbr = 0
        } else {
            lTcbr = parseInt(lectureTcbr.value);
        }
        
        let lectureExactlyConducted = lectureConductedValue - lTcbr;
        if (lectureConductedValue == lTcbr){
            lectureError = true;
        }else{
             if (lectureExactlyConducted >= lectureAttendedValue){
            lectureError = false;
            }else{
                lectureError = true;
            }
        }
       

        allNeumerator = allNeumerator + lectureAttendedValue;


        
        if (alldenominator === null) {
            alldenominator = lectureExactlyConducted;
        } else {
            alldenominator = alldenominator + lectureExactlyConducted;
        }
    }

    if ((lectureConducted.value !== "" && lectureAttended.value === "" ) || ( lectureConducted.value === "" && lectureAttended.value !== "")){
        lectureError = true;   
    }
    if (tutorialConducted.value !== "" && tutorialAttended.value !== "") {
        
        let tutorialConductedValue = parseInt(tutorialConducted.value)
        let tutorialAttendedValue = parseInt(tutorialAttended.value)
        let tTcbr = tutorialTcbr.value
        if (tTcbr === "") {
            tTcbr = 0
        } else {
            tTcbr = parseInt(tutorialTcbr.value)
        }
       
        let tutorialExactlyConducted = tutorialConductedValue - tTcbr;
        if (tutorialConductedValue == tTcbr){
            tutorialError = true;

        }else{
             if (tutorialExactlyConducted >= tutorialAttendedValue){
                tutorialError = false;
            }else{
                tutorialError = true;
            }
        }
       
        allNeumerator = allNeumerator + (tutorialAttendedValue)
        if (alldenominator === null) {
            alldenominator = tutorialExactlyConducted;
        } else {
            alldenominator = alldenominator + tutorialExactlyConducted;
        }
    }

    if (practicalConducted.value !== "" && practicalAttended.value !== "") {

        let practicalConductedValue = parseInt(practicalConducted.value)
        let practicalAttendedValue = parseInt(practicalAttended.value)
        let pTcbr = practicalTcbr.value;
        if (pTcbr === "") {
            pTcbr = 0
        } else {
            pTcbr = parseInt(practicalTcbr.value)
        }
        
        let practicalExactlyConducted = practicalConductedValue - pTcbr;

        if (practicalConductedValue == pTcbr){
            practicalError = true;
        }else{
            if (practicalExactlyConducted >= (practicalAttendedValue)){
                practicalError = false;
            }else{
                practicalError = true;
            }
        }
        
        allNeumerator = allNeumerator + ((practicalAttendedValue) / 2)
        if (alldenominator === null) {
            alldenominator = (practicalExactlyConducted) / 2;
        } else {
            alldenominator = alldenominator + (practicalExactlyConducted) / 2;
        }
    }

    if (skillConducted.value !== "" && skillAttended.value !== "") {

        let skillConductedValue = parseInt(skillConducted.value);
        let skillAttendedValue = parseInt(skillAttended.value);
        let sTcbr = skillTcbr.value;
        if (sTcbr === "") {
            sTcbr = 0
        } else {
            sTcbr = parseInt(skillTcbr.value)
        }
        let skillExactlyConducted = skillConductedValue - sTcbr;

        if (skillConductedValue == sTcbr){
            skillError = true;
        }else{
            if (skillExactlyConducted >= skillAttendedValue){
                skillError = false;
            }else{
                skillError = true;
            }
        }
        
        allNeumerator = allNeumerator + ((skillAttendedValue) / 4)
        if (alldenominator === null) {
            alldenominator = (skillExactlyConducted) / 4;
        } else {
            alldenominator = alldenominator + (skillExactlyConducted) / 4;
        }
    }

    if ((tutorialConducted.value !== "" && tutorialAttended.value === "" ) || ( tutorialConducted.value === "" && tutorialAttended.value !== "")){
        tutorialError = true;   
    }
    if ((skillConducted.value !== "" && skillAttended.value === "" ) || ( skillConducted.value === "" && skillAttended.value !== "")){
       skillError = true;   
    }
    if ((practicalConducted.value !== "" && practicalAttended.value === "" ) || ( practicalConducted.value === "" && practicalAttended.value !== "")){
        practicalError = true;   
    }
    

    let finalResult = Math.ceil((allNeumerator / alldenominator) * 100);
    
    
    if (skillError || practicalError || lectureError || tutorialError){
            if(skillError){
                skillInputsContainer.style.boxShadow= "0px 0px 4px 0px #9ca3af";   
            }
            if(practicalError){
                practicalInputsContainer.style.boxShadow= "0px 0px 4px 0px #9ca3af";   
            }
            if(lectureError){
                lectureInputsContainer.style.boxShadow= "0px 0px 4px 0px #9ca3af";   
            }
            if(tutorialError){
                tutorialInputsContainer.style.boxShadow= "0px 0px 4px 0px #9ca3af";   
            }
            errorNote.classList.remove("finalError");
            
            result.textContent = "";
    }else{
        errorNote.classList.add("finalError");
        
                skillInputsContainer.style.boxShadow= "0px 0px 0px 0px #9ca3af";   
            
            
                practicalInputsContainer.style.boxShadow= "0px 0px 0px 0px #9ca3af";   
            
           
                lectureInputsContainer.style.boxShadow= "0px 0px 0px 0px #9ca3af";   
            
            
                tutorialInputsContainer.style.boxShadow= "0px 0px 0px 0px #9ca3af";   
            
        if (alldenominator !== null && alldenominator !== 0){
        if (finalResult > 84){
            result.style.color = "#008000";
        }else if (finalResult > 74){
            result.style.color = "#ADFF2F"
        }else{
            result.style.color = "#E62020"
        }
        result.textContent = finalResult + "%";
      
    }
    }
    
        
    
document.addEventListener("contextmenu", e => e.preventDefault());
document.addEventListener("keydown", e => {
  if (e.key === "F12" || (e.ctrlKey && e.shiftKey && e.key === "I")) {
    e.preventDefault();
  }
});



    
 









});