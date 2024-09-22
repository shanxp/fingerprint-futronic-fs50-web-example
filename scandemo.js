
var fpHTTSrvOpEP = "http://127.0.0.1:15270/fpoperation"

var btnGetinfo
var btnCapture
var btnCancel

var chkLFD
var chkInvert

var textResult;

var resultLink;

var fingerFrame;

var lastInitOp;

function linkOperationImage(opId) {
    var target = "/image";
    var saveAs = "image.bin"
    var resultText = "Result raw image"
    var url = fpHTTSrvOpEP + '/' + opId + target;

    resultLink.href = url;
    resultLink.download = saveAs;
    resultLink.innerHTML = resultText;
}

function linkOperationWsq(opId) {
    var target = "/+0.75+wsq";
    var saveAs = "wsq_image.bin"
    var resultText = "Result wsq image"
    var url = fpHTTSrvOpEP + '/' + opId + target;

    resultLinkWsq.href = url;
    resultLinkWsq.download = saveAs;
    resultLinkWsq.innerHTML = resultText;
}

function fixError(statusText, errorText) {
    textResult.style = "color:red"
    
    if(errorText != "") {
        if( statusText != "" ) {
            textResult.innerHTML = errorText + "(" + statusText + ")";
        }
        else {
            textResult.innerHTML = errorText;
        }
    }
    else {
        textResult.innerHTML = statusText
    }
}

function setAskTest(textMes) {
    textResult.style = "color:blue"
    textResult.innerHTML = textMes;
}

function setOperationResult(textMes) {
    textResult.style = "color:green"
    textResult.innerHTML = textMes;
}

function beginOperation(opName) {  

    resultLink.href = "http://www.futronic-tech.com";
    resultLink.download = "";
    resultLink.innerHTML = "www.futronic-tech.com";
	
    var json = JSON.stringify({operation: opName, lfd: ( chkLFD.checked ? "yes" : "no" ), invert: ( chkInvert.checked ? "yes" : "no" )});
    enableControlsForOp(true);
    console.log(json);
	var req = new XMLHttpRequest();
    req.open("POST", fpHTTSrvOpEP);
    req.setRequestHeader('Content-type', 'application/json; charset=utf-8');

    req.onload = function() {
      if (req.status == 200) {
        setAskTest("Operation begin");
        parseOperationDsc(JSON.parse(req.response));
      }
      else {
        fixError(req.statusText, "Server response");
		enableControlsForOp(false);
      }
    };
    req.onerror = function() {
      fixError("", "FPHttpServer not available");
	  enableControlsForOp(false);
    };
    req.send(json);
}

function cancelOperation() {
    var url = fpHTTSrvOpEP + '/' + lastInitOp + '/cancel';
    put(url);
}

function getOperationState(opId) {
    var url = fpHTTSrvOpEP + '/' + opId;
    var req = new XMLHttpRequest();
    req.open('GET', url);    
    req.onload = function() {
      if (req.status == 200) {
		if( req.readyState == 4 ) {
			parseOperationDsc(JSON.parse(req.response));
		}
      }
      else {
		fixError(req.statusText, "Server response");
		enableControlsForOp(false);
      }
    };
    req.onerror = function() {
		fixError("", "FPHttpServer not available");
		enableControlsForOp(false);
    };
    req.send();
}

function getOperationImg(opId,frameWidth, frameHeight) {
    var url = fpHTTSrvOpEP + '/' + opId + '/image';
    var req = new XMLHttpRequest();
    req.open('GET', url);    
    req.onload = function() {
      if (req.status == 200) {		
        drawFingerFrame(new Uint8Array(req.response),opId, frameWidth, frameHeight);		
      }
      else {
		enableControlsForOp(false);
      }
    };
    req.onerror = function() {
		enableControlsForOp(false);
    };
    req.send();    
	req.responseType = "arraybuffer";
}

function deleteOperation(opId) {
    var url = fpHTTSrvOpEP + '/' + opId;
    deleteVerb(url);
}

function parseOperationDsc(opDsc) {
    var res = true;

    if(opDsc.state == 'done') {
        enableControlsForOp(false);

        if(opDsc.status == 'success') {
            setOperationResult(opDsc.message + ", NFIQ: " + opDsc.nfiq);
			if( opDsc.operation == 'capture' )
			{
				linkOperationImage(opDsc.id);
				linkOperationWsq(opDsc.id);
			}
        }

        if(opDsc.status == 'fail') {
            fixError("", opDsc.errorstr)
            res = false;
            
            if(parseInt(opDsc.errornum) != -1) {
                deleteOperation(opDsc.id);
            }
        }
    }
    else if(opDsc.state == 'init') {
		lastInitOp = opDsc.id
        setTimeout(getOperationState, 1000, opDsc.id);
        setTimeout(getOperationImg, 1000, opDsc.id, parseInt(opDsc.devwidth), parseInt(opDsc.devheight));
    }
    else if(opDsc.state == 'inprogress')
    {
        if(opDsc.fingercmd == 'puton') {
            setAskTest("Put finger on scanner");
        }

        if(opDsc.fingercmd == 'takeoff') {
            setAskTest("Take off finger from scanner");
        }
        setTimeout(getOperationState, 1000, opDsc.id);
        setTimeout(getOperationImg, 1000, opDsc.id, parseInt(opDsc.devwidth), parseInt(opDsc.devheight));
    }
    return res;
}

function drawFingerFrame(frameBytes,opId, frameWidth, frameHeight) {
    var ctx = fingerFrame.getContext('2d');
    var imgData= ctx.createImageData(fingerFrame.width,fingerFrame.height);

    for(var i = 0; i < frameBytes.length; i++) {
      // red
      imgData.data[4*i] = frameBytes[i];
      // green
      imgData.data[4*i + 1] = frameBytes[i];
      // blue
      imgData.data[4*i + 2] = frameBytes[i];
      //alpha
      imgData.data[4*i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0, 0, 0, fingerFrame.width,fingerFrame.height);
}

function deleteVerb(url) {
    var req = new XMLHttpRequest();
    req.open("DELETE", url);
    req.onload = function() {
      if (req.status == 200) {
      }
      else {
        fixError(req.statusText, "Server response");
      }
    };
    req.onerror = function() {
      fixError("", "FPHttpServer not available");
    };
    req.send();
}

function put(url) {
    var req = new XMLHttpRequest();
    req.open('PUT', url);
    req.onload = function() {
      if (req.status != 200) {
        fixError(req.statusText, "Server response");
      }
    };
    req.onerror = function() {
      fixError("", "FPHttpServer not available");
    };
    req.send();
}

function enableControls() {
    btnGetinfo.disabled = false;
    btnCapture.disabled = false;
    chkLFD.disabled = false;
    chkInvert.disabled = false;
}

function enableControlsForOp(opBegin) {
    btnGetinfo.disabled = opBegin;
    btnCapture.disabled = opBegin;
    chkLFD.disabled = opBegin;
    chkInvert.disabled = opBegin;
    btnCancel.disabled = !opBegin
}

function CheckFPHttpSrvConnection()
{
    var req = new XMLHttpRequest();
    req.open('GET', fpHTTSrvOpEP);    
    req.onload = function() {
      if (req.status == 200) {
        enableControls();
        setAskTest("Press operation button");
      }
      else {
		fixError(req.statusText, "Server response")
      }
    };
    req.onerror = function() {
		fixError("", "FtrScanHttpServer not available");
		setTimeout(CheckFPHttpSrvConnection, 1000);
    };
    req.send();
}

function onBodyLoad()
{
    btnGetinfo = document.getElementById("GetinfoBtn");
    btnCapture = document.getElementById("CaptureBtn");
    btnCancel = document.getElementById("CancelBtn");
    
    chkLFD = document.getElementById("checkLFD");
    chkInvert = document.getElementById("checkInvert");
    
    textResult =   document.getElementById("result");
	
    fingerFrame = document.getElementById("fingerframe");
    resultLink = document.getElementById("resultLink");
    
    var defImg = new Image();
    
    defImg.onload = function() {
        var context = fingerFrame.getContext('2d');
        context.drawImage(defImg, 0, 0);
    };
    defImg.src = "defframe.png";

    CheckFPHttpSrvConnection();
}