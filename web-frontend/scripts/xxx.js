const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () =>{
    setStatus('ONLINE')
}

ws.onclose = ()=>{
    setStatus('DISCONNECTED')
}

ws.onmessage = response=>printMessage(response.data)