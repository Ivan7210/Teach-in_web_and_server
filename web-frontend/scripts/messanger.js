document.addEventListener("DOMContentLoaded",()=>{
    if(!localStorage.getItem("ID")){
        alert("Вы не вошли в аккаунт!")

        document.location.href = "../html/login.html";
    }
    const id = localStorage.getItem("ID")
    let socket = new WebSocket("ws://armacoty.tk:1234");
    const userName = localStorage.getItem("name");
    document.querySelector("#headerUserName").innerHTML = userName;
    const userList = document.querySelector(".messanger_userList__list > ul")
    const messageWindow = document.querySelector(".messanger__massageWindow__messanges > ul")
    const sendButton = document.querySelector("#sendButton")
    const messangerInput = document.querySelector("#messangerInput")
    const userIcon = document.querySelector(".messanger__headerKid__image");
    const userMenu = document.querySelector(".profileMenu")
    const findButton = document.querySelector("#findButton");
    const refreshButton = document.querySelector(".messangerListRefresh")
    const addingList = document.querySelector(".messangerSearchUserList ul")
    let addingListElement;
    let myContactList;
    let myContactListId;
    const modalWindow = document.querySelector(".modalWindow")
    const userImage = document.querySelector(".modalWindow__myProfile__image")
    let imageReader = new FileReader();
    const imageFileInput = document.querySelector(".modalWindow__myProfile__image > input")
    let currentChatId;

    function setUserImage(){
        console.log("picture is change")
        document.querySelector(".messanger__headerKid__image").style.background = `url(${localStorage.getItem("image")})`
    }

    findButton.addEventListener("click",()=>{
        let keys = document.querySelector(".messanger_userList__searchUser > input").value.trim().split(" ");
        let obj = {"search_keys":keys, "request":"find_users","my_id":id};
        socket.send(JSON.stringify(obj))
    })

    document.querySelectorAll(".profileMenu a:not(#logOutLink)").forEach((el,index) =>{
        el.addEventListener("click",()=>{

            modalWindow.classList.toggle("windowActive");
            document.querySelectorAll(".modalWindow >*")[+!index].classList.add("hidden")
            document.querySelectorAll(".modalWindow >*")[index].classList.toggle("hidden")
            document.querySelector(".modalWindow__myProfile__data__userNameBlock span").innerHTML = localStorage.getItem("name")
            document.querySelector(".modalWindow__myProfile__data__userLastNameBlock span").innerHTML = localStorage.getItem("last_name")

        })
    })

    document.querySelector(".modalWindow__myProfile__data form").addEventListener("submit", sendInfoForm)
    async function sendInfoForm(e){
        e.preventDefault();
        let formData = new FormData(e.target);
        formData.append("request","change_info")
        formData.append("my_id",id)
        let obj = {};
        let promise = new Promise((resolve,reject) =>{
            formData.forEach((value,key)=>{
              obj[key] = value;
            })
            let json = JSON.stringify(obj);
            e.target.reset();
            resolve(json);
          })
    
          promise.then( data =>{
            socket.send(data)
            document.querySelectorAll(".modalWindow__myProfile__data div").forEach(ele=>{
                resetInfoForm(ele)
            })
          }
          ).catch(err =>{
            console.error('Error: ',err)
          });

        }

        function showInfoForm(el,e){
            el.querySelectorAll("*:not(input)").forEach(ele=>{
                ele.classList.toggle("hidden")
            })
            el.querySelector("input").classList.toggle("hidden")
        }

        function resetInfoForm(el,e){
            
            el.querySelectorAll("*:not(input)").forEach(ele=>{
                ele.classList.remove("hidden")
            })
            el.querySelector("input").classList.add("hidden")
        }

    imageFileInput.onchange = ()=>{
        const imageFileInput = document.querySelector(".modalWindow__myProfile__image > input").files[0]
        // imageReader.onloadend = ()=>{
        //     userImage.style.background = `url(${imageReader.result})`
        // }
        // if(imageFileInput){
        //     imageReader.readAsDataURL(imageFileInput)
        // }else{

        // }
        const img = new Image()
        img.src =  imageReader.result
        const width = 150
        const scaleFactor = width / img.width

            const elem = document.createElement('canvas')
            elem.width = width
            elem.height = img.height * scaleFactor
            const ctx = elem.getContext('2d')
            ctx.drawImage(img,0,0,width,img.height * scaleFactor)
            const blobUser = ctx.canvas.toBlob(blob =>{
                const file = new File([blob], imageFileInput.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
            },'image/jpeg',1)
        

        setTimeout(()=>{
            //let url = imageFileInput.toDataUrl("image/png")
            localStorage.setItem("image",imageReader.result)
            socket.send(JSON.stringify({"bytes":imageReader.result, "request":"add_photo", "my_id":id}))
            console.log("Отправка завершена")
        },300)
    }

    // document.querySelector(".modalWindow__myProfile").addEventListener("click",(e)=>{
    //     document.querySelectorAll(".modalWindow__myProfile__data div").forEach(ele=>{
    //         resetInfoForm(ele,e)
    //     })
    // })

    document.querySelectorAll(".modalWindow__myProfile__dataBlock").forEach(el=>{
        el.addEventListener("click",(e)=>{
            showInfoForm(el,e)
        })
    })

    document.querySelector("#logOutLink").addEventListener("click",()=>{
        localStorage.clear();
        socket.send(JSON.stringify({"request":"log_out","my_id":id}));
        document.location.href = "../html/login.html";
    });

    sendButton.addEventListener("click",()=>{
        if(!messangerInput.value){
            return;
        }
        socket.send(JSON.stringify({"request":"add_message","message":messangerInput.value,"my_id":id,"id":currentChatId}))
        createMessage({"from":"","message":messangerInput.value})
    })
    document.addEventListener("keydown",(e)=>{
        if(e.which === 13){
            if(!messangerInput.value){
                return;
            }
            socket.send(JSON.stringify({"request":"add_message","message":messangerInput.value,"my_id":id,"id":currentChatId}))
            createMessage({"from":"","message":messangerInput.value})
        }
        if(e.which === 27 && !addingList.parentElement.classList.contains("hidden")){
            addingList.parentElement.classList.toggle("hidden")
            addingList.innerHTML = "";
        }
    })

    userIcon.addEventListener("click",()=>{
        userMenu.classList.toggle("hidden");
    })

    function createMessage(el){
        let name;
        let div = document.createElement('li');
        if(el.from){
            div.classList.add("other")
            name = el.from
        }else{
            div.classList.add("self")
            name = localStorage.getItem("name");
        }
        div.innerHTML = `<div><span>${name}</span><p>${el.message}</p></div>`;
        messageWindow.appendChild(div);
        messangerInput.value = "";
        messageWindow.parentElement.scrollTop = messageWindow.parentElement.scrollHeight - messageWindow.parentElement.clientHeight
    }

    

    function createNewContact(arr){
        addingList.parentElement.classList.toggle("hidden")
        if(!arr){
            return;
        }
        arr.forEach(el =>{
            let li = document.createElement("li")
            li.classList.add("listItem","offline")
            li.innerHTML = `<span>${el.name} ${el.last_name}</span>`
            li.setAttribute("data-id",el.id)
            addingList.appendChild(li)
        })
        listSearchItemEvent()
    }

    refreshButton.addEventListener("click",(e)=>{
        e.target.classList.toggle("active")
        socket.send(JSON.stringify({"request":"all_chats","my_id":id}));
        let onlineUsers= setInterval(()=>{
            socket.send(JSON.stringify({"request":"online","my_id":id}))
        },30000)
    })

    function createAllMessages(array){
        messageWindow.innerHTML = ""
        array.forEach(el =>{
            createMessage(el)
        })
        messageWindow.parentElement.scrollTop = messageWindow.parentElement.scrollHeight - messageWindow.parentElement.clientHeight
    }

    function createContactList(array){
        myContactList = array.map(el=> el)
        myContactListId = array.map(el => el.id)
        refreshButton.classList.add("hidden")
        array.forEach(el =>{
            let li = document.createElement("li")
            li.classList.add("listItem", "offline")
            li.innerHTML = `<span>${el.name} ${el.last_name}</span><div class="countMes hidden"></div>`
            li.setAttribute("data-id",el.id)
            userList.appendChild(li)
        })
        listItemEvent()
    }

    function listSearchItemEvent(){
        addingListElement = document.querySelectorAll(".messangerSearchUserList .listItem")
        addingListElement.forEach(el =>{
            el.addEventListener("click",()=>{
                document.querySelector(".messanger__messageWindow").classList.remove("noneChat")
                currentChatId = el.getAttribute("data-id")
                addingList.parentElement.classList.toggle("hidden")
                addingList.innerHTML = "";
                let li = document.createElement("li")
                li.classList.add("listItem", "offline", "currentListItem")
                li.innerHTML = `<span>${el.lastChild.innerHTML}</span><div class="countMes hidden"></div>`
                li.setAttribute("data-id",el.id)
                userList.appendChild(li)
                document.querySelector(".messanger_userList__searchUser > input").value = ""
                listItemEvent()
                socket.send(JSON.stringify({"request":"open_chat","id":el.getAttribute("data-id"),"my_id":id}))
            })
        })
    }

    function listItemEvent(){
        addingListElement = document.querySelectorAll(".messanger_userList__list > ul .listItem")
        addingListElement.forEach(el =>{
            el.addEventListener("click",()=>{
                addingListElement.forEach(e =>{
                    e.classList.remove("currentListItem")
                })
                document.querySelector(".messanger__messageWindow").classList.remove("noneChat")
                document.querySelector(".messanger__messageWindow").style.zIndex = 21
                el.querySelector(".countMes").classList.add("hidden")
                el.querySelector(".countMes").setAttribute("data-countM",0)
                currentChatId = el.getAttribute("data-id")
                el.classList.add("currentListItem")
                socket.send(JSON.stringify({"request":"open_chat","id":el.getAttribute("data-id"),"my_id":id}))
             }) 
        })
    }

    document.querySelector(".messangerHeader img").addEventListener("click",()=>{
        document.querySelector(".messanger__messageWindow").style.zIndex = 19
    })

    function updateContactsState(array){
        array.forEach(el =>{
            myContactList.forEach(ele =>{
                if(el === ele.id){
                    document.querySelector(`li[data-id='${ele.id}']`).classList.add("online")
                    document.querySelector(`li[data-id='${ele.id}']`).classList.remove("offline")
                }
            })
        })
    }

    function updateMessage(data){
        if(currentChatId == data.id){
            createMessage(data)
        }
        else{
            
            if(
                myContactListId.indexOf(data.id) != -1
            ){
                let ci = document.querySelector(`.messanger_userList__list>ul>li[data-id='${data.id}'] div.countMes`)
                ci.classList.remove("hidden")
                if(ci.getAttribute("data-count")){
                    ci.parentElement.setAttribute("data-count",ci.getAttribute("data-count")++)
                }else{
                    ci.parentElement.setAttribute("data-count",1)
                }
                ci.innerHTML = ci.parentElement.getAttribute("data-count")
                const audio = new Audio()
                audio.src = "../images/sound.mp3"
                audio.play()
            }else{
                let ci = document.createElement("li")
                ci.classList.add("listItem", "offline")
                ci.innerHTML = `<span>${data.from}</span><div class="countMes hidden"></div>`
                ci.setAttribute("data-id",data.id)
                userList.appendChild(ci)
                myContactListId.push(data.id)
                listItemEvent()
                let ciI = document.querySelector(`.messanger_userList__list>ul>li[data-id='${data.id}'] div.countMes`)
                ciI.classList.remove("hidden")
                if(ci.getAttribute("data-count")){
                    ciI.parentElement.setAttribute("data-count",ci.getAttribute("data-count")++)
                }else{
                    ciI.parentElement.setAttribute("data-count",1)
                }
                ciI.innerHTML = ciI.parentElement.getAttribute("data-count")
                const audio = new Audio()
                audio.src = "../images/sound.mp3"
                audio.play()
            }

            
            
        }

    }

    //websocket
    socket.onopen = ()=>{
        console.log("Соединение установлено!");
        //setUserImage();
        socket.send(JSON.stringify({"request":"confirm_token","id":localStorage.getItem("ID"),"name":localStorage.getItem("name")}))
    }
    
    socket.onmessage = event =>{
        formHandler(event.data)
    }

    function formHandler(data){
        let userData = JSON.parse(data);
        switch (userData.answer) {
          case "all_find_client":
              createNewContact(userData.client);
              break;
          case "successful confirm":
              break;
          case "all_chats successful":
              createContactList(userData.users);
              break;
          case "chats_with":
              createAllMessages(userData.message)
              break;
          case "online":
              updateContactsState(userData.users)
              break;
          case "new_message":
              updateMessage(userData)
              break;
          default:
              break;
            
        }
    }
});