const formMenuButtons = document.querySelectorAll(".loginTools__buttons > button");

const formArray = document.querySelectorAll("form");

formMenuButtons.forEach( (e,i)=>
    e.addEventListener("click",()=>{
        formMenuButtons.forEach(el => el.classList.remove("currentButton"))
        e.classList.add("currentButton")
        formArray[+!i].classList.add("hidden");
        formArray[i].classList.remove("hidden")
    })
);