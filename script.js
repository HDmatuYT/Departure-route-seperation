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
    const buttons = document.querySelectorAll(`button`);
    buttons.forEach(button => {
        if (button.getAttribute("onclick")?.includes(category) ||
            button.getAttribute("onclick")?.includes(value)) {
            button.classList.remove("active");
        }
    });

    const activeButton = document.querySelector(`button[onclick*="${value}"]`);
    if (activeButton) {
        activeButton.classList.add("active");
    }
}

function calculate() {
    if (!lead || !follow || !leadWake || !followWake || !leadGroup || !followGroup) {
        document.getElementById("result").textContent = "Please select all values.";
        return;
    }

    // ROUTE separation (seconds)
    const separationTable = {
        "E-E": 2,
        "E-W": 1,
        "W-E": 1,
        "W-W": 2
    };

    // WAKE separation (seconds)
    const wakeSeparation = {
        "L-L": 80,
        "L-S": 0,
        "L-M": 0,
        "L-H": 0,
        "L-J": 0,
        "S-L": 100,
        "S-M": 0,
        "S-H": 0,
        "S-J": 0,
        "M-L": 120,
        "M-S": 0,
        "M-M": 0,
        "M-H": 0,
        "M-J": 0,
        "H-L": 140,
        "H-S": 120,
        "H-M": 100,
        "H-H": 4, // NM special case
        "H-J": 0,
        "J-L": 180,
        "J-S": 160,
        "J-M": 140,
        "J-H": 100
    };

    const routeKey = `${lead}-${follow}`;
    const wakeKey = `${leadWake}-${followWake}`;

    const routeSeparation = separationTable[routeKey] || 0;
    const wakeSeparationTime = wakeSeparation[wakeKey] || 0;

    // GROUP LOGIC
    let groupDifference = followGroup - leadGroup;
    let groupAdjustment = 0;

    if (groupDifference > 0) {
        groupAdjustment = groupDifference;
    } else if (groupDifference <= -2) {
        groupAdjustment = -1;
    }

    // Special ICAO rule
    if (wakeKey === "H-H") {
        document.getElementById("result").textContent = "Total Separation: 4 NM";
        return;
    }

    // Prevent unrealistic values
    const combinedRouteSeparation = Math.max(
        routeSeparation,
        routeSeparation + groupAdjustment
    );

    const totalSeparation = Math.max(
        combinedRouteSeparation,
        wakeSeparationTime
    );

    document.getElementById("result").textContent = `Total Separation: ${totalSeparation} seconds`;
}

function clearInputs() {
    lead = "";
    follow = "";
    leadWake = "";
    followWake = "";
    leadGroup = 0;
    followGroup = 0;

    document.querySelectorAll("button").forEach(btn => {
        btn.classList.remove("active");
    });

    document.getElementById("result").textContent = "Result will appear here";
}
