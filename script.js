let lead = "";
let follow = "";
let leadWake = "";
let followWake = "";
let leadGroup = 0; // Group for Lead aircraft
let followGroup = 0; // Group for Follow aircraft

function setLead(value) {
    lead = value;
    setButtonActive("lead", value);
}

function setFollow(value) {
    follow = value;
    setButtonActive("follow", value);
}

function setWake(value) {
    if (!leadWake) {
        leadWake = value;
        setButtonActive("lead-wake", value);
    } else {
        followWake = value;
        setButtonActive("follow-wake", value);
    }
}

function setGroup(type, group) {
    if (type === "lead") {
        leadGroup = group;
    } else {
        followGroup = group;
    }
    setButtonActive(`${type}-group`, group);
}

function setButtonActive(category, value) {
    const buttons = document.querySelectorAll(`.${category}-container button, .${category}-group button`);
    buttons.forEach(button => button.classList.remove("active"));

    const activeButton = document.querySelector(
        `.${category}-container button[onclick*="${value}"], .${category}-group button[onclick*="${value}"]`
    );

    if (activeButton) {
        activeButton.classList.add("active");
    }
}

function calculate() {
    if (!lead || !follow || !leadWake || !followWake || !leadGroup || !followGroup) {
        document.getElementById("result").textContent = "Please select all values for Lead, Follow, Wake turbulence, and Groups.";
        return;
    }

    // Route separation table
    const separationTable = {
        "E-E": 2,
        "E-W": 1,
        "W-E": 1,
        "W-W": 2
    };

    // Wake turbulence table
    const wakeSeparation = {
        "S-L": 2,
        "S-M": 2,
        "S-H": 2,
        "S-F": 3,
        "M-S": 3,
        "M-M": 1,
        "M-H": 2,
        "M-F": 3,
        "H-S": 3,
        "H-M": 3,
        "H-H": 4,
        "H-F": 2,
        "F-S": 4,
        "F-M": 4,
        "F-H": 3
    };

    const routeKey = `${lead}-${follow}`;
    const wakeKey = `${leadWake}-${followWake}`;

    const routeSeparation = separationTable[routeKey] || 0;
    const wakeSeparationTime = wakeSeparation[wakeKey] || 0;

    // Group separation logic
    let groupDifference = followGroup - leadGroup; // Calculate difference: Follow - Lead
    let groupAdjustment = 0;

    if (groupDifference > 0) {
        // Faster following slower: +1 minute for each group difference
        groupAdjustment = groupDifference; 
    } else if (groupDifference <= -2) {
        // Slower following faster (2 or more groups slower): -1 minute
        groupAdjustment = -1; 
    }

    if (wakeKey === "H-H") {
        document.getElementById("result").textContent = "Total Separation: 4NM";
        return;
    }

    const totalSeparation = Math.max(routeSeparation, wakeSeparationTime) + groupAdjustment;

    document.getElementById("result").textContent = `Total Separation: ${totalSeparation} minutes`;
}

function clearInputs() {
    lead = "";
    follow = "";
    leadWake = "";
    followWake = "";
    leadGroup = 0;
    followGroup = 0;

    document.querySelectorAll("button").forEach(button => button.classList.remove("active"));
    document.getElementById("result").textContent = "Result will appear here";
}