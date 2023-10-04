// vputter.js 
// Implements a virtual putter intended for the Putt Putnam County, Virtually (golf.js)
// Add this code in the <script> section of your HTML or at the top of your JavaScript file
document.addEventListener('DOMContentLoaded', () => {
    const connectButton = document.getElementById("ConnectVPutter");
    let port;	//capture the serial port 
    
    connectButton.addEventListener('click', async () => {
      port = await navigator.serial.requestPort();	// Prompts user for port 
      await port.open({ baudRate: 115200 });			// and open
      
      const reader = port.readable.getReader();		// instantiate a reader on the port
      let stringValue = "";							// used to build the read results
      // Read Loop
      while (true) {									// effectively wait for an response from vPutter
        const { value, done } = await reader.read();
        if (done) {									// read and break when it's done (note: likely not a full hit message)
          reader.releaseLock();
          break;
        }
        //console.log("Raw value:", value);
        //console.log("Type of value:", typeof value);
        const textDecoder = new TextDecoder('utf-8');
        stringValue += textDecoder.decode(value);		// decode it to something useful and concatenate partials
        console.log("Decoded value:", stringValue);
  
          const regex = /x:(-?\d+(\.\d+)?),y:(-?\d+(\.\d+)?)(?:\n|$)/;  // Probably not the cleanest. TODO: understand more about Serial Web API
          const match = stringValue.match(regex);
          console.log("match:", match);				
          if (match) {								// at this point we've received a full hit string
            const vx1 = parseFloat(match[1]);			// grab the x
            const vy1 = parseFloat(match[3]);			// and y values
            console.log("vx1:", vx1);
            console.log("vy1:", vy1);
  
            // Update the simulation
            document.getElementById("vx").value = vx1;	// set the fields to assist with debug
            document.getElementById("vy").value = vy1;	// 
            state.hit([vx1, vy1]);						// hit the ball
            //state.hit([10, 10]); // Replace this with the above line once you're ready to use vx1 and vy1
            stringValue="";			// clear to wait for the next hit message
          } else {
            console.log("Decoding failed");
          }
      }
    });
  });
  