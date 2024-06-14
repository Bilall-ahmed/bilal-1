

var SM_DStatus_ACTIVE;
var SM_PStatus_ACTIVE;
var SM_HDStatus_ACTIVE;
var NoLandmarks_Count;
var FailSafeEvent_Active;
var PreviousState_Flag = 0;



const video5 = document.getElementsByClassName('input_video5')[0];
const out5 = document.getElementsByClassName('output5')[0];
const out6 = document.getElementsByClassName('output6')[0];
const controlsElement5 = document.getElementsByClassName('control5')[0];
const canvasCtx5 = out5.getContext('2d');
const canvasCtx6 = out6.getContext('2d');


const CalibrationSampleLength = 300 ;
const calibrationQ = new Array(CalibrationSampleLength).fill(0); 
const calibratedThresholdpercent = 65;

const Yawning_Threshold = 0.035;
const MouthOpen_Threshold = 0.02;  

const Drowsiness_Obseravation_window = 45         
const Drowsiness_Sensitivity  = Drowsiness_Obseravation_window/3
const EyeClose_Threshold1 = 0.12
const EyeClosureQueue = new Array(Drowsiness_Obseravation_window).fill(0);

const EyeBlink_Obseravation_windowLength = 60        
const RapidEyeBlink_Sensitivity  = 6   
const EyeBlinkQueue = new Array(EyeBlink_Obseravation_windowLength).fill(0);


var calibrationinstancecount = 0;
var calibrationdjudge;
var EyeClosure_Flag;
var eyeblinktoggle = 0;

var Out_DD_EyeClosure_Flag = 0;
var Out_DD_EyeBlink_Flag = 0;
var Out_DD_Drowsy_Flag = 0;
var out_DD_MouthOpen_Flag = 0;
var out_DD_Yawning_Flag = 0;
var out_DD_RapidEyeBlink_Flag = 0;
var out_DD_Calibration_Progress_Flag =0;

var RAPID_EYE_BLINKING;
var EYE_CLOSE;
var YAWNING;
var FACE_LANDMARKS_DETECTION; 
var CALIBRATION_STATE;
var DD_Status = "----";

var O_HeadTurnLeft_Flag;
var O_HeadTurnRight_Flag;
var O_HeadTurnDown_Flag;
var O_HeadTurnUp_Flag;
var NoLandmarks;
var C_CamPosition;
var C_FPS;
var C_Detection;
var Confidence = 0;

var Roll_Bias;
var Yaw_Bias;
var Pitch_Bias;
let AutoTune_BiasFlag = 0;
let AutoTune_Status = "----";
let O_CameraPosition_Status = "----"
var CameraPosition_Flag;

const ObsWindowLength = 300;
const RollQueue = new Array(ObsWindowLength).fill(0);
const YawQueue = new Array(ObsWindowLength).fill(0);
const PitchQueue = new Array(ObsWindowLength).fill(0);

const P_HPE_ObseravationWindow = 90;
const P_Head_Turn_Left_Sensitivity = P_HPE_ObseravationWindow / 3;
const P_Head_Turn_Right_Sensitivity = P_HPE_ObseravationWindow / 3;
const P_Head_Up_Sensitivity = P_HPE_ObseravationWindow / 3;
const P_Head_Down_Sensitivity = P_HPE_ObseravationWindow / 3;
const P_DistractedHands_ObseravationWindow = 90;
const P_DistractedHands_Sensitivity = P_DistractedHands_ObseravationWindow / 3;
var DistractedHands_queue = new Array(P_DistractedHands_ObseravationWindow).fill(0);
var Head_Left_Turn_queue = new Array(P_HPE_ObseravationWindow).fill(0);
var Head_Turn_Right_queue = new Array(P_HPE_ObseravationWindow).fill(0);
var Head_Up_queue = new Array(P_HPE_ObseravationWindow).fill(0);
var Head_Down_queue = new Array(P_HPE_ObseravationWindow).fill(0);

var AutoTune_Instancecount = 0;

var HD_Status = "----";
let roll = 0;
let pitch = 0;
let yaw = 0;
var P_HEAD_RIGHT_Th;
var P_HEAD_LEFT_Th ;
var P_HEAD_DOWN_Th ;
var P_HEAD_UP_Th ;



var HP_Status = "----";
var MPN_LA
var MPN_RA
var MPN_NA


var fps =0;
var frameCount = 0;
var lastTime = performance.now();
 
function calculateFPS() {
    const now = performance.now();
    const duration = (now - lastTime) / 1000; 
    fps = Number((frameCount / duration).toFixed(0));

 
    if(fps >= 10){
        C_FPS = 1;
    }
    else{
        C_FPS = Number((fps/10).toFixed(2));
    }
     
    frameCount = 0;
    lastTime = now;
}




var canvas = out5;
var ctx = canvasCtx5;

var chunks = [];
var stream = canvas.captureStream(); 
var mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });


var startButton = document.getElementById('startButton');
var stopButton = document.getElementById('stopButton');


mediaRecorder.ondataavailable = (e) => {
    chunks.push(e.data);
};

mediaRecorder.onstop = () => {

    let blob = new Blob(chunks, { type: 'video/webm' });
    let videoUrl = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'output.mp4';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(videoUrl);
    startButton.disabled = false;
    stopButton.disabled = true;
};


startButton.onclick = () => {
    chunks = []; 
    mediaRecorder.start();
    startButton.disabled = true;
    stopButton.disabled = false;
};


function captureFrame(imageUrl) {
    let img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        mediaRecorder.requestData();
    };
    img.src = imageUrl;
}

stopButton.onclick = () => {
    mediaRecorder.stop();
};


function landmarksToNp(landmarks, dtype = "int") {
    const num = landmarks.length;
    const coords = new Array(num);
    for (let i = 0; i < num; i++) {
        coords[i] = { x: landmarks[i].x, y: landmarks[i].y };
    }
    return coords;
}


function calculatemode(numbers) {
    const frequencyMap = {};
    numbers.forEach(num => frequencyMap[num] = (frequencyMap[num] || 0) + 1);
    let mode;
    let maxFrequency = 0;
    for (const num in frequencyMap) {
        if (frequencyMap[num] > maxFrequency) {
            mode = num;
            maxFrequency = frequencyMap[num];
        }
    }
    return +mode;
}

function rollNumber(n, amount) {
    const maxRollBack = 179;
    const minRollBack = -178;
    n += amount;
    if (n > maxRollBack) {
        n = minRollBack + (n - maxRollBack) - 1;
    }
    if (n < minRollBack) {
        n = maxRollBack - (minRollBack - n) + 1;
    }
    return n;
}
function calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
function calculateAngle(sideA, sideB, sideC) {
    const cosAngle = (sideB * sideB + sideC * sideC - sideA * sideA) / (2 * sideB * sideC);
    const angleRad = Math.acos(cosAngle);
    const angleDeg = angleRad * (180 / Math.PI);
    return angleDeg;
}
function zColor(data) {
    const z = clamp(data.from.z + 0.5, 0, 1);
    return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
}
function drawLine(ctx, x1, y1, x2, y2, stroke = 'black', width = 3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
}
var FaceDetection_State;
var FaceDetection_State_queue = new Array(15).fill(0);
var FaceDetectionResults;
function onDetectionResults(results) {
    FaceDetectionResults = results;
    FaceDetection_State = results.detections.length;
    FaceDetection_State_queue.shift();
    FaceDetection_State_queue.push(FaceDetection_State);
    if (results.detections.length > 0) {
        const Detection_score = results.detections[0].V[0].ga;
        console.log("Detection_score",Detection_score);
        if(Detection_score <= 0.5){
            C_Detection = 0;
        }
        else if(Detection_score <= 0.55){
            C_Detection = 0.1;
        }
        else if(Detection_score <= 0.6){
            C_Detection = 0.2;
        }
        else if(Detection_score <= 0.65){
            C_Detection = 0.3;
        }
        else if(Detection_score <= 0.7){
            C_Detection = 0.4;
        }
        else if(Detection_score <= 0.75){
            C_Detection = 0.5;
        }
        else if(Detection_score <= 0.8){
            C_Detection = 0.6;
        }
        else if(Detection_score <= 0.85){
            C_Detection = 0.7;
        }
        else if(Detection_score <= 0.9){
            C_Detection = 0.8;
        }
        else if(Detection_score <= 0.95){
            C_Detection = 0.9;
        }
        else if(Detection_score <= 1){
            C_Detection = 1;
        }
    }
    else{
        C_Detection = 0;
    }
}
function onResultsPose(results) {
    SM_PStatus_ACTIVE = 0;
    HP_Status = "----";
    canvasCtx6.save();
    canvasCtx6.clearRect(0, 0, out6.width, out6.height);
    canvasCtx5.save();
    canvasCtx5.clearRect(0, 0, out5.width, out5.height);
    canvasCtx5.drawImage(
        results.image, 0, 0, out5.width, out5.height);
    if (results.poseLandmarks) {
        let landmarks = results.poseLandmarks;
        const nose = landmarks[0];
        const leftEye = landmarks[8];
        const rightEye = landmarks[7];
        const lefteye2nose = calculateDistance(leftEye, nose);
        const nose2righteye = calculateDistance(rightEye, nose);
        const left2righteye = calculateDistance(leftEye, rightEye);
        const sideLengths = [lefteye2nose, nose2righteye, left2righteye]
        const Rightangle = calculateAngle(sideLengths[0], sideLengths[1], sideLengths[2]);
        const Leftangle = calculateAngle(sideLengths[1], sideLengths[2], sideLengths[0]);
        const Noseangle = calculateAngle(sideLengths[2], sideLengths[0], sideLengths[1]);
        MPN_LA = Leftangle;
        MPN_RA = Rightangle;
        MPN_NA = Noseangle;
        canvasCtx6.fillStyle = "black";
        canvasCtx6.font = "bold 30px Cambria";
        if (((FaceDetection_State_queue.reduce((a, b) => a + b, 0) == 15))&&(FaceDetection_State == 1)&&(FailSafeEvent_Active == 0) && NoLandmarks && ((Math.abs(Leftangle - Rightangle)) >= 40)) {
            LRB = MPN_LA > MPN_RA;
            RLB = MPN_RA > MPN_LA;
            Confidence = Number(((40*C_CamPosition) + (30*C_FPS) + (30*C_Detection)).toFixed(0));                               

            if (RLB) {
                SM_PStatus_ACTIVE = 1;
                HP_Status = "HEAD_RIGHT_TURN_POSE";
                canvasCtx6.fillText(`Confidence : ${Confidence}`, 15, 220);
            }
            else if (LRB) {
                SM_PStatus_ACTIVE = 1;
                HP_Status = "HEAD_LEFT_TURN_POSE";
                canvasCtx6.fillText(`Confidence : ${Confidence}`, 15, 220);
            }
            else {
                HP_Status = "----";
            }
            canvasCtx6.fillStyle = "black";
            canvasCtx6.font = "bold 30px Cambria";
            canvasCtx6.fillText(HP_Status, 15, 180);

        }
        drawConnectors(
            canvasCtx5, results.poseLandmarks, POSE_CONNECTIONS, {
            color: (data) => {
                const x0 = out5.width * data.from.x;
                const y0 = out5.height * data.from.y;
                const x1 = out5.width * data.to.x;
                const y1 = out5.height * data.to.y;
                const z0 = clamp(data.from.z + 0.5, 0, 1);
                const z1 = clamp(data.to.z + 0.5, 0, 1);
                const gradient = canvasCtx5.createLinearGradient(x0, y0, x1, y1);
                gradient.addColorStop(
                    0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
                gradient.addColorStop(
                    1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
                return gradient;
            }
        });
        drawLandmarks(
            canvasCtx5,
            Object.values(POSE_LANDMARKS_LEFT)
                .map(index => results.poseLandmarks[index]),
            { color: zColor, fillColor: '#000000' }); 
        drawLandmarks(
            canvasCtx5,
            Object.values(POSE_LANDMARKS_RIGHT)
                .map(index => results.poseLandmarks[index]),
            { color: zColor, fillColor: '#000000' }); 
        drawLandmarks(
            canvasCtx5,
            Object.values(POSE_LANDMARKS_NEUTRAL)
                .map(index => results.poseLandmarks[index]),
            { color: zColor, fillColor: '#000000' }); 
    }
    canvasCtx6.restore();
    canvasCtx5.restore();
}
 
function onResultsFaceMesh(results) {
    startButton.click();
    SM_DStatus_ACTIVE = 0;
    SM_HDStatus_ACTIVE = 0;
    O_HeadTurnLeft_Flag = 0;
    O_HeadTurnRight_Flag = 0;
    O_HeadTurnDown_Flag = 0;
    O_HeadTurnUp_Flag = 0;
    HD_Status = "----"
    var face_2d = [];
    var points = [1, 33, 263, 61, 291, 199];
    var pointsObj = [0, -1.126865, 7.475604,
        -4.445859, 2.663991, 3.173422,
        4.445859, 2.663991, 3.173422,
        -2.456206, -4.342621, 4.283884,
        2.456206, -4.342621, 4.283884,
        0, -9.403378, 4.264492];
    var width = results.image.width;
    var height = results.image.height;
    var x, y, z;
    var normalizedFocaleY = 1.28;
    var focalLength = height * normalizedFocaleY;
    var s = 0;
    var cx = width / 2;
    var cy = height / 2;
    var cam_matrix = cv.matFromArray(3, 3, cv.CV_64FC1, [focalLength, s, cx, 0, focalLength, cy, 0, 0, 1]);
    var k1 = 0.1318020374;
    var k2 = -0.1550007612;
    var p1 = -0.0071350401;
    var p2 = -0.0096747708;
    var dist_matrix = cv.matFromArray(4, 1, cv.CV_64FC1, [k1, k2, p1, p2]);
    frameCount++;
    if (frameCount % 10 === 0) { 
        calculateFPS();
    }

    if (FaceDetectionResults.detections.length > 0) {

                FaceDetectionResults.detections.forEach(detection => {
                    drawFaceBoundingBoxROI(detection);
                  });
    }


    console.log("FPS =",fps)
    canvasCtx5.fillStyle = "Yellow";
    canvasCtx5.font = "bold 18px Cambria";
    canvasCtx5.fillText(`FPS : ${fps}`, 365, 35);

    if (results.multiFaceLandmarks) {
         for (const landmarks of results.multiFaceLandmarks) {
            drawConnectors(canvasCtx5, landmarks, FACEMESH_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });  
            for (const point of points) {
                var point0 = landmarks[point];
                var x = point0.x * width;
                var y = point0.y * height;
                face_2d.push(x);
                face_2d.push(y);
            }            
            const landmarks2d = landmarksToNp(landmarks);
            const d1 = Math.hypot(
                landmarks2d[160].x - landmarks2d[144].x,
                landmarks2d[160].y - landmarks2d[144].y
            );
            const d2 = Math.hypot(
                landmarks2d[158].x - landmarks2d[153].x,
                landmarks2d[158].y - landmarks2d[153].y
            );
            const d3 = Math.hypot(
                landmarks2d[385].x - landmarks2d[380].x,
                landmarks2d[385].y - landmarks2d[380].y
            );
            const d4 = Math.hypot(
                landmarks2d[387].x - landmarks2d[373].x,
                landmarks2d[387].y - landmarks2d[373].y
            );
            const d_mean = (d1 + d2 + d3 + d4) / 4;
            const d5 = Math.hypot(
                landmarks2d[33].x - landmarks2d[133].x,
                landmarks2d[33].y - landmarks2d[133].y
            );
            const d6 = Math.hypot(
                landmarks2d[362].x - landmarks2d[263].x,
                landmarks2d[362].y - landmarks2d[263].y
            );
            const d_reference = (d5 + d6) / 2;
            var d_judge = d_mean / d_reference;
            if(calibrationinstancecount <= CalibrationSampleLength)
            {
                out_DD_Calibration_Progress_Flag =1;
                calibrationinstancecount += 1;
                calibrationQ.shift();
                calibrationQ.push(d_judge);
                if(d_judge <= EyeClose_Threshold1){
                EyeClosure_Flag = 1;
                if(eyeblinktoggle ===0){Out_DD_EyeBlink_Flag = 1;}
                else{Out_DD_EyeBlink_Flag = 0;}
                eyeblinktoggle = 1;
                }
                else{
                EyeClosure_Flag = 0;
                if(eyeblinktoggle === 1){Out_DD_EyeBlink_Flag = 1;}
                else{Out_DD_EyeBlink_Flag = 0;}
                eyeblinktoggle = 0;
                }    
                EyeClosureQueue.shift();
                EyeClosureQueue.push(EyeClosure_Flag);
                Out_DD_EyeClosure_Flag = EyeClosure_Flag;
            }
            else{
                out_DD_Calibration_Progress_Flag =0;
                calibrationdjudge = (calibrationQ.reduce((a, b) => a + b, 0) / CalibrationSampleLength)*(calibratedThresholdpercent / 100)  ;
                if(d_judge < calibrationdjudge){
                EyeClosure_Flag = 1;
                if(eyeblinktoggle ===0){Out_DD_EyeBlink_Flag = 0;}
                else{Out_DD_EyeBlink_Flag = 0;}
                eyeblinktoggle = 1;
                }
                else{
                EyeClosure_Flag = 0;
                if(eyeblinktoggle === 1){Out_DD_EyeBlink_Flag = 1;}
                else{Out_DD_EyeBlink_Flag = 0;}
                eyeblinktoggle = 0;
                }   
                EyeClosureQueue.shift();
                EyeClosureQueue.push(EyeClosure_Flag);
                Out_DD_EyeClosure_Flag = EyeClosure_Flag;
            }
            if (EyeClosureQueue.reduce((a, b) => a + b, 0) > Drowsiness_Sensitivity) {
                Out_DD_Drowsy_Flag = 1;
                SM_DStatus_ACTIVE = 1;

                DD_Status = "EYE_CLOSE";
            } 
            else {
                Out_DD_Drowsy_Flag = 0;
                DD_Status = "----";
            }
            EyeBlinkQueue.shift();
            EyeBlinkQueue.push(Out_DD_EyeBlink_Flag);
            if (EyeBlinkQueue.reduce((a, b) => a + b, 0) > RapidEyeBlink_Sensitivity) {
                out_DD_RapidEyeBlink_Flag = 1;
                } 
            else {
                out_DD_RapidEyeBlink_Flag = 0;
            }
            const annotations = results.multiFaceLandmarks;
            if (annotations) {
            const distance = Math.hypot(
                landmarks2d[12].x - landmarks2d[14].x,
                landmarks2d[12].y - landmarks2d[14].y
            );
            if (distance > MouthOpen_Threshold) {
                if (distance > Yawning_Threshold) {
                if(EyeClosure_Flag == 1){
                    out_DD_Yawning_Flag =1;
                    DD_Status = "YAWNING";
                    SM_DStatus_ACTIVE = 1;

                }
                else{
                    out_DD_Yawning_Flag =0;
                    DD_Status = "----";
                }
                } 
                else{
                out_DD_MouthOpen_Flag = 1;
                }
            } 
            else{
                out_DD_MouthOpen_Flag = 0;
            }
            }
        }
        if (face_2d.length > 0) {
            var rvec = new cv.Mat();
            var tvec = new cv.Mat();
            const numRows = points.length;
            const imagePoints = cv.matFromArray(numRows, 2, cv.CV_64FC1, face_2d);
            var modelPointsObj = cv.matFromArray(6, 3, cv.CV_64FC1, pointsObj);
            var success = cv.solvePnP(
                modelPointsObj,
                imagePoints,
                cam_matrix,
                dist_matrix,
                rvec,
                tvec,
                false,
                cv.SOLVEPNP_ITERATIVE
            );
            if (success) {
                var rmat = cv.Mat.zeros(3, 3, cv.CV_64FC1);
                const jaco = new cv.Mat();
                cv.Rodrigues(rvec, rmat, jaco);
                var sy = Math.sqrt(
                    rmat.data64F[0] * rmat.data64F[0] + rmat.data64F[3] * rmat.data64F[3]
                );
                var singular = sy < 1e-6;
                if (!singular) {
                    x = Math.atan2(rmat.data64F[7], rmat.data64F[8]);
                    y = Math.atan2(-rmat.data64F[6], sy);
                    z = Math.atan2(rmat.data64F[3], rmat.data64F[0]);
                } else {
                    x = Math.atan2(-rmat.data64F[5], rmat.data64F[4]);
                    y = Math.atan2(-rmat.data64F[6], sy);
                    z = 0;
                }
                roll = Number((180.0 * (y / Math.PI)).toFixed(2));
                pitch = Number(((x * 180.0 / Math.PI + 360) % 360).toFixed(2));
                yaw = Number((180.0 * (z / Math.PI)).toFixed(2));
                if (AutoTune_Instancecount < ObsWindowLength) {
                    RollQueue.shift();
                    RollQueue.push(Math.round(roll));
                    YawQueue.shift();
                    YawQueue.push(Math.round(yaw));
                    PitchQueue.shift();
                    PitchQueue.push(Math.round(pitch));
                    AutoTune_Instancecount++;
                }
                if (AutoTune_Instancecount == ObsWindowLength) {
                    AutoTune_BiasFlag = 1;
                    Roll_Bias = calculatemode(RollQueue);
                    Yaw_Bias = calculatemode(YawQueue);
                    Pitch_Bias = calculatemode(PitchQueue);
                    canvasCtx6.fillStyle = "black";
                    canvasCtx6.font = "bold 30px Cambria";
                    if ((Roll_Bias <= 25) && (Roll_Bias >= -25)){
                        O_CameraPosition_Status = "Optimal";
                        CameraPosition_Flag = 1;
                        canvasCtx6.fillText(`Cam Position : Optimal`, 15, 80);
                    }
                    else {
                        O_CameraPosition_Status = "Non Optimal";
                        CameraPosition_Flag = 0;
                        canvasCtx6.fillText(`Cam Position : Non Optimal`, 15, 80);
                    }
                    if ((-5 <= Roll_Bias) && (Roll_Bias <= 5)) {
                        C_CamPosition = 1;
                    }
                    else if (((-10 <= Roll_Bias) && (Roll_Bias < -5)) || ((5 < Roll_Bias) && (Roll_Bias <= 10))) {
                        C_CamPosition = 0.9;
                    }
                    else if (((-15 <= Roll_Bias) && (Roll_Bias < -10)) || ((10 < Roll_Bias) && (Roll_Bias <= 15))) {
                        C_CamPosition = 0.75;
                    }
                    else if (((-20 <= Roll_Bias) && (Roll_Bias < -15)) || ((15 < Roll_Bias) && (Roll_Bias <= 20))) {
                        C_CamPosition = 0.60;
                    }
                    else if (((-25 <= Roll_Bias) && (Roll_Bias < -20)) || ((20 < Roll_Bias) && (Roll_Bias <= 25))) {
                        C_CamPosition = 0.45;
                    }
                    else{
                        C_CamPosition = 0;
                    }

                }

                if (AutoTune_BiasFlag == 1) {
                    AutoTune_Status = "Auto Tuning Complete"
                    canvasCtx6.fillText(`Auto Tuning : Complete`, 15, 30);
                }
                else {
                    AutoTune_Status = "Auto Tuning In Progress"
                    canvasCtx6.fillText(`Auto Tuning : In Progress`, 15, 30);
                }
                if ((roll > 65) || (roll < -65)) {
                    NoLandmarks = 1;
                }
                else {
                    NoLandmarks = 0;
                    NoLandmarks_Count = 0;
                    FailSafeEvent_Active = 0;
                    if (AutoTune_BiasFlag) {
                        if(CameraPosition_Flag)
                            {
                        P_HEAD_RIGHT_Th = Roll_Bias + 35;
                        P_HEAD_LEFT_Th = Roll_Bias - 35;
                        P_HEAD_DOWN_Th = Pitch_Bias+20;
                        P_HEAD_UP_Th = Pitch_Bias-20;                    

                            if ((roll > P_HEAD_RIGHT_Th) && (yaw < 45) && (yaw > -45)) {
                                O_HeadTurnRight_Flag = 1;
                            }
                            if ((roll < P_HEAD_LEFT_Th) && (yaw < 45) && (yaw > -45)) {
                                O_HeadTurnLeft_Flag = 1;
                            }
                            if (pitch < P_HEAD_UP_Th) {
                                O_HeadTurnUp_Flag = 1;                                
                            }
                            if (pitch > P_HEAD_DOWN_Th) {
                                O_HeadTurnDown_Flag = 1; 
                            }                        

                            Head_Left_Turn_queue.shift();
                            Head_Turn_Right_queue.shift();
                            Head_Up_queue.shift();
                            Head_Down_queue.shift();
                            Head_Left_Turn_queue.push(O_HeadTurnLeft_Flag);
                            Head_Turn_Right_queue.push(O_HeadTurnRight_Flag);
                            Head_Up_queue.push(O_HeadTurnUp_Flag);
                            Head_Down_queue.push(O_HeadTurnDown_Flag);
                            if (
                                Head_Left_Turn_queue.reduce((a, b) => a + b, 0) >
                                P_Head_Turn_Left_Sensitivity
                            ) {                                
                                HD_Status = "HEAD_LEFT_TURN";
                                SM_HDStatus_ACTIVE = 1;
                                Head_Turn_Right_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Up_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Down_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                
                            }
                            if (
                                Head_Turn_Right_queue.reduce((a, b) => a + b, 0) >
                                P_Head_Turn_Right_Sensitivity
                            ) {
                                HD_Status = "HEAD_RIGHT_TURN";
                                SM_HDStatus_ACTIVE = 1;
                                Head_Left_Turn_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Up_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Down_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                            }
                            if (
                                Head_Down_queue.reduce((a, b) => a + b, 0) > P_Head_Down_Sensitivity
                            ) {
                                HD_Status = "HEAD_DOWN";
                                SM_HDStatus_ACTIVE = 1;
                                Head_Left_Turn_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Turn_Right_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Up_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                            }
                            if (
                                Head_Up_queue.reduce((a, b) => a + b, 0) > P_Head_Up_Sensitivity
                            ) {
                                HD_Status = "HEAD_UP";
                                SM_HDStatus_ACTIVE = 1;
                                Head_Left_Turn_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Turn_Right_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Down_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                            }

                            if((SM_HDStatus_ACTIVE == 0) && (SM_DStatus_ACTIVE == 1)){
                                canvasCtx6.fillText(DD_Status, 15, 130);
                                Head_Left_Turn_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Turn_Right_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Up_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                                Head_Down_queue = new Array(P_HPE_ObseravationWindow).fill(0);
                            }

                            if((SM_DStatus_ACTIVE == 1) || (SM_HDStatus_ACTIVE == 1)){
                                if(PreviousState_Flag == 0){
                                    Confidence = Number(((40*C_CamPosition) + (30*C_FPS) + (30*C_Detection)).toFixed(0));
                                    canvasCtx6.fillText(`Confidence : ${Confidence}`, 15, 220);
                                }
                                else{
                                    canvasCtx6.fillText(`Confidence : ${Confidence}`, 15, 220);
                                }
                                
                           }
                        
                           PreviousState_Flag = SM_HDStatus_ACTIVE;                 
                        }
                    }
                    canvasCtx6.fillText(HD_Status, 15, 180);
                }
                canvasCtx6.fillStyle = "black";
                canvasCtx6.font = "bold 30px Cambria";
            }

        }
        canvasCtx6.fillStyle = "Black";
        canvasCtx6.font = "bold 30px Cambria";
        rvec.delete();
        tvec.delete();
    }
    else {
        if (pitch > P_HEAD_DOWN_Th) {
            HD_Status = "HEAD_DOWN";
            canvasCtx6.fillText(HD_Status, 15, 130);
            FailSafeEvent_Active =1;
        }
        if (pitch < P_HEAD_UP_Th) {
            HD_Status = "HEAD_UP";
            canvasCtx6.fillText(HD_Status, 15, 130);
            FailSafeEvent_Active =1;                            
        }
        NoLandmarks_Count = NoLandmarks_Count +1;
        NoLandmarks = 1;
    }

    canvasCtx6.restore();
    canvasCtx5.restore();
}
function isPointInROI(point, polygon) {
    const x = (point.x)*(out5.width), y = (point.y)*(out5.height);
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
  
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
  
    return inside;
  }


function getPointsInsideROI(landmarks, x1, y1, x2, y2, x3, y3, x4, y4) {
    const polygon = [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
      { x: x3, y: y3 },
      { x: x4, y: y4 }
    ];

  
    let insideIndices = [];
  
    landmarks.forEach((point, index) => {
      if (isPointInROI(point, polygon)) {
        insideIndices.push(index);
      }
    });
  
    return insideIndices;
  }
var ROI_x1; 
var ROI_y1; 
var ROI_x2; 
var ROI_y2; 
var ROI_x3; 
var ROI_y3; 
var ROI_x4; 
var ROI_y4; 
function drawFaceBoundingBoxROI(detection) {
    const boundingBox = detection.boundingBox;
    const ROI_Const =30;
    let x =((boundingBox.xCenter - boundingBox.width/ 2)*out5.width);
    let y =((boundingBox.yCenter - boundingBox.height/ 2)*out5.height);0
    let bw = (boundingBox.width*out5.width);
    let bh = (boundingBox.height*out5.height);
    ROI_x1 = x-ROI_Const;
    ROI_y1 = y-2.5*ROI_Const;
    ROI_x2 = x+bw+ROI_Const;
    ROI_y2 = y-2.5*ROI_Const;
    ROI_x3 = x+bw+ROI_Const;
    ROI_y3 = y+bh+ROI_Const;
    ROI_x4 = x-ROI_Const;
    ROI_y4 = y+bh+ROI_Const;;
    ctx.beginPath();
    ctx.moveTo(ROI_x1, ROI_y1);
    ctx.lineTo(ROI_x2, ROI_y2);
    ctx.lineTo(ROI_x3, ROI_y3); 
    ctx.lineTo(ROI_x4, ROI_y4); 
    ctx.closePath();    
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.stroke();
  }
var insideIndices;
function onResultsHands(results) {
 

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const isRightHand = classification.label === 'Right';
        const landmarks = results.multiHandLandmarks[index];

        insideIndices = getPointsInsideROI(landmarks, ROI_x1, ROI_y1, ROI_x2, ROI_y2, ROI_x3, ROI_y3, ROI_x4, ROI_y4);
        console.log(`Indices of points inside the ROI: ${insideIndices}`);
        console.log(`Number of points inside the ROI: ${insideIndices.length}`);

        if(insideIndices.length >0){
            DistractedHands_queue.shift();
            DistractedHands_queue.push(1);
        }
        else{
            // DistractedHands_queue.shift();
            // DistractedHands_queue.push(0);
            DistractedHands_queue = new Array(P_DistractedHands_ObseravationWindow).fill(0);
        }


        if (DistractedHands_queue.reduce((a, b) => a + b, 0) > P_DistractedHands_Sensitivity){
            canvasCtx6.fillStyle = "Black";
            canvasCtx6.font = "bold 30px Cambria";
            canvasCtx6.fillText(`Distracted Hands`, 15, 250);
        }


        drawConnectors(
            canvasCtx5, landmarks, HAND_CONNECTIONS,
            {color: isRightHand ? '#00FF00' : '#00FF00'}),
        drawLandmarks(canvasCtx5, landmarks, {
          color: isRightHand ? '#00FF00' : '#00FF00',
          fillColor: isRightHand ? '#00FF00' : '#00FF00',
          radius: (x) => {
            return lerp(x.from.z, -0.15, .1, 5, 1);
          }
        });
      }
    }
    canvasCtx5.restore();
  }

async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = stream.getVideoTracks()[0];
    const { width, height } = videoTrack.getSettings();
    video5.srcObject = stream;
    const videoProcessor = new ImageCapture(videoTrack);
   
    const faceDetection = new FaceDetection({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
        }
    });
     
    faceDetection.setOptions({
        model: 'short'
    });
     
    faceDetection.onResults(onDetectionResults);
    const faceMesh = new FaceMesh({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.1/${file}`;
        }
    });
    faceMesh.onResults(onResultsFaceMesh);
    
    const pose = new Pose({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
        }
    });
    pose.onResults(onResultsPose);

    const hands = new Hands({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1/${file}`;
    }});
    hands.onResults(onResultsHands);
   
    const frameProcessor = async () => {
      const frame = await videoProcessor.grabFrame();
      cap_frame = frame;
        await faceDetection.send({ image: frame });
        await pose.send({ image: frame });
        await faceMesh.send({ image: frame });
        await hands.send({ image: frame });
      requestAnimationFrame(frameProcessor);
    };
    frameProcessor();  
  }
  startCamera();

