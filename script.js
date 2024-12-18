let lead = "";
let follow = "";
let leadWake = "";
let followWake = "";
let leadGroup = 0; 
let followGroup = 0; 

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

    const separationTable = {
        "E-E": 2,
        "E-W": 1,
        "W-E": 1,
        "W-W": 2
    };

    const wakeSeparation = {
        "S-L": 2,
        "S-M": 2,
        "S-H": 0,
        "S-F": 0,
        "M-L": 2,
        "M-S": 0,
        "M-M": 0,
        "M-H": 0,
        "M-F": 0,
        "H-L": 2,
        "H-S": 2,
        "H-M": 2,
        "H-H": 4, //nm
        "H-F": 0,
        "F-L": 3,
        "F-S": 3,
        "F-M": 3,
        "F-H": 2
    };

    const routeKey = `${lead}-${follow}`;
    const wakeKey = `${leadWake}-${followWake}`;

    const routeSeparation = separationTable[routeKey] || 0;
    const wakeSeparationTime = wakeSeparation[wakeKey] || 0;

    // Group separation logic    
    let groupDifference = followGroup - leadGroup; 
    let groupAdjustment = 0;

    if (groupDifference > 0) {
        groupAdjustment = groupDifference; 
    } else if (groupDifference <= -2) {
        groupAdjustment = -1; 
    }

    if (wakeKey === "H-H") {
        document.getElementById("result").textContent = "Total Separation: 4NM";
        return;
    }

    const combinedRouteSeparation = routeSeparation + groupAdjustment;

    // Determine the total separation (whichever is greater between combined route and wake separation)
    const totalSeparation = Math.max(combinedRouteSeparation, wakeSeparationTime);

    document.getElementById("result").textContent = `Total Separation: ${totalSeparation} minutes`;
}
