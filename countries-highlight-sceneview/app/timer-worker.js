let time;
onmessage = function(msg){
    let value = msg.data;
    let interval = msg.data[1];
  
    if(value[0] == "start"){
      time = setInterval(function(){
        postMessage(true);
      }, interval);
  
    }
    if(value[0] == "stop"){
      console.log("Stopping timer...");   
      clearInterval(time);
      //close(); 
    }    
  };