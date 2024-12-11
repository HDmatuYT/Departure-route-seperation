let lead = "";
let follow = "";
let leadWake = "";
let followWake = "";

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

function setButtonActive(category, value) {

    const buttons = document.querySelectorAll(`.${category}-container button`);
    buttons.forEach(button => {
        button.classList.remove("active");
    });


    const activeButton = document.querySelector(`.${category}-container button[onclick="set${category.charAt(0).toUpperCase() + category.slice(1)}('${value}')"]`);
    if (activeButton) {
        activeButton.classList.add("active");
    }
}

function calculate() {
    if (!lead || !follow || !leadWake || !followWake) {
        document.getElementById("result").textContent = "Please select all values for Lead, Follow, and Wake turbulence.";
        return;
    }

    const routeKey = `${lead}-${follow}`;
    const wakeKey = `${leadWake}-${followWake}`;

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
        "H-H": 4,
        "H-F": 2,
        "F-S": 3,
        "F-M": 3,
        "F-H": 2
    };

    const routeSeparation = separationTable[routeKey];
    const wakeSeparationTime = wakeSeparation[wakeKey];

    if (routeSeparation === undefined || wakeSeparationTime === undefined) {
        document.getElementById("result").textContent = "Invalid combination.";
        return;
    }


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

    document.querySelectorAll("button").forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById("result").textContent = "Result will appear here";
}
