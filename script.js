let lead = "";
let follow = "";
let leadWake = "";
let followWake = "";

const separationTable = {
    "E-E": 2,
    "E-W": 1,
    "W-E": 1,
    "W-W": 2
};

const wakeSeparation = {
    "S-M": 2,
    "S-H": 2,
    "S-F": 3,
    "M-S": 2,
    "M-M": 2,
    "M-H": 2,
    "M-F": 3,
    "H-S": 2,
    "H-M": 2,
    "H-H": 4, // 4NM
    "H-F": 2,
    "F-S": 3,
    "F-M": 3,
    "F-H": 2
};

function setLead(value) {
    lead = value;
    document.getElementById("lead-summary").textContent = lead;
    console.log("Lead set to", lead);
}

function setFollow(value) {
    follow = value;
    document.getElementById("follow-summary").textContent = follow;
    console.log("Follow set to", follow);
}

function setWake(value) {
    if (!leadWake) {
        leadWake = value;
        document.getElementById("lead-wake-summary").textContent = leadWake;
        console.log("Lead wake set to", leadWake);
    } else {
        followWake = value;
        document.getElementById("follow-wake-summary").textContent = followWake;
        console.log("Follow wake set to", followWake);
    }
}

function calculate() {
if (!lead || !follow || !leadWake || !followWake) {
document.getElementById("result").textContent = "Please select all values for Lead, Follow, and Wake turbulence.";
return;
}

const routeKey = `${lead}-${follow}`;
const wakeKey = `${leadWake}-${followWake}`;

console.log("Route Key:", routeKey, "| Wake Key:", wakeKey);

const routeSeparation = separationTable[routeKey];
const wakeSeparationTime = wakeSeparation[wakeKey];

if (routeSeparation === undefined) {
console.log("Invalid route combination:", routeKey);
document.getElementById("result").textContent = "Invalid route combination.";
return;
}

if (wakeSeparationTime === undefined) {
console.log("Invalid wake turbulence combination:", wakeKey);
document.getElementById("result").textContent = "Invalid wake turbulence combination.";
return;
}

//reegel 4nm raskete vahel kuidas välja prindib
if (wakeKey === "H-H") {
document.getElementById("result").textContent = "Total Separation: 4NM";
return;
}


const totalSeparation = Math.max(routeSeparation, wakeSeparationTime);
document.getElementById("result").textContent = `Total Separation: ${totalSeparation} minutes`;
}



function clearInputs() {
    lead = "";
    follow = "";
    leadWake = "";
    followWake = "";

    document.getElementById("lead-summary").textContent = "-";
    document.getElementById("follow-summary").textContent = "-";
    document.getElementById("lead-wake-summary").textContent = "-";
    document.getElementById("follow-wake-summary").textContent = "-";
    document.getElementById("result").textContent = "Result will appear here";

    console.log("Inputs cleared");
}