document.addEventListener("DOMContentLoaded",()=>{
  // if(localStorage.getItem("ID")){
  //   document.location.href="../htlm/messanger.html"
  // }
  localStorage.clear()
  let socket = new WebSocket("ws://armacoty.tk:1234");
  const form = document.querySelectorAll("form")

  form.forEach(el =>{
    el.addEventListener("submit",formSend);
  })


  //localStorage.setItem("iwd",41241224)

    async function formSend(e){
      e.preventDefault();
      let formData = new FormData(e.target);
      
      let obj = {};
      if(e.target.getAttribute('data-request') === 'get_token'){
        formData.append("request","get_token")
      }else{
        formData.append("request","new_token")
      }
      let promise = new Promise((resolve,reject) =>{
        formData.forEach((value,key)=>{
          obj[key] = value;
        })
        console.log(obj)
        let json = JSON.stringify(obj);
        e.target.reset();
        resolve(json);
      })

      promise.then( data =>{
        socket.send(data)
      }
      ).catch(err =>{
        console.error('Error: ',err)
      });

  }

  socket.onopen = ()=>{
    console.log("Соединение установлено!");
  }

  socket.onmessage = event =>{
    console.log(event.data);
    formHandler(event.data)
  }

  //Обработка web-socket ответов
  function formHandler(data){
    let userData = JSON.parse(data);
    switch (userData.answer) {
      case "new user successful":
        alert("Пользователь успешно создан!")
        break;
      case "new user error":
        alert(userData.error);
        break;
      case "successful autorize":
        localStorage.setItem("ID",userData.id)
        localStorage.setItem("name",userData.name)
        localStorage.setItem("last_name",userData.last_name)
        localStorage.setItem("avatar",userData.image)
        console.log(userData)
        localStorage.setItem("image",userData.bytes)
        document.location.href = "../html/messanger.html"
        break;
      case "autorize error":
        default:
        break;
    }
  }
})


