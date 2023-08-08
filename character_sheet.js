// Init tracked things
var clearStorageButton = undefined;
let me = '';
const numDiceField = 4
let trackedIds = {};
let allResults = [];

// Init counts
let countIcon = 0;
let countExalted = 0;
let countCrit = 0;
let countComplication = 0;
let totalSuccesses = 0;

// Other
let crit = "";
let compl = "";
let color = `<color="white">`


// Take the name of the player 
async function findMe() {
    me = await TS.players.whoAmI().then(result => result.name);
}

function initSheet() {
    let inputs = document.querySelectorAll("input,button,textarea");

    // I didn't touch this for potential use later on
    for (let input of inputs) {
        if (input.id != undefined && input.id != "clear-storage") {
            input.addEventListener("change", function () {
                onInputChange(input)
            });

            let titleSibling = findFirstSiblingWithClass(input, "field-title");
            if (titleSibling != null) {
                titleSibling.id = `${input.id}-field-title`;
            }
            let descSibling = findFirstSiblingWithClass(input, "field-desc");
            if (descSibling != null) {
                descSibling.id = `${input.id}-field-desc`;
            }

            let finalInput = input; //otherwise the input can change which breaks the onchange handler
            if (titleSibling == null && input.dataset.modifier != undefined) {
                //manual fix for melee/ranged attack buttons being formatted differently
                titleSibling = finalInput;
                finalInput = document.getElementById(finalInput.dataset.modifier);
            }

            if (titleSibling != null && titleSibling.dataset.diceType != undefined) {
                titleSibling.classList.add("interactible-title");
                titleSibling.style.cursor = "pointer";
                titleSibling.addEventListener("click", function () {
                    TS.dice.putDiceInTray([createDiceRoll(titleSibling, finalInput)]);
                    //we are not checking for success or failure here, but could easily by adding a .then (success) and .catch (failure)
                });
                input.setAttribute("aria-labelledby", titleSibling.id);
                if (descSibling != null) {
                    input.setAttribute("aria-describedby", descSibling.id);
                }
            } else if (titleSibling != null) {
                titleSibling.setAttribute("for", input.id);
                if (descSibling != null) {
                    input.setAttribute("aria-describedby", descSibling.id);
                }
            }
        }
    }

    //   Pour rendre fonctionnel nos onglets weapons etc
    Array.from(document.querySelectorAll('.tabs')).forEach((tab_container, TabID) => {
        const registers = tab_container.querySelector('.tab-registers');
        const bodies = tab_container.querySelector('.tab-bodies');

        Array.from(registers.children).forEach((el, i) => {
            el.setAttribute('aria-controls', `${TabID}_${i}`)
            bodies.children[i]?.setAttribute('id', `${TabID}_${i}`)

            el.addEventListener('click', (ev) => {
                let activeRegister = registers.querySelector('.active-tab');
                activeRegister.classList.remove('active-tab')
                activeRegister = el;
                activeRegister.classList.add('active-tab')
                changeBody(registers, bodies, activeRegister)
            })
        })
    })

}

function onInputChange(input) {
    //handles input changes to store them in local storage
    let data;
    // get already stored data
    TS.localStorage.campaign.getBlob().then((storedData) => {
        //parse stored blob as json, but also handle if it's empty by
        //defaulting to an empty json document "{}" if stored data is false
        data = JSON.parse(storedData || "{}");
        if (input.type == "checkbox") {
            data[input.id] = input.checked ? "on" : "off";
        } else {
            data[input.id] = input.value;
        }
        //set new data, handle response
        TS.localStorage.campaign.setBlob(JSON.stringify(data)).then(() => {
            //if storing the data succeeded, enable the clear storage button
            clearStorageButton.classList.add("danger");
            clearStorageButton.disabled = false;
            clearStorageButton.textContent = "Clear Character Sheet";
        }).catch((setBlobResponse) => {
            TS.debug.log("Failed to store change to local storage: " + setBlobResponse.cause);
            console.error("Failed to store change to local storage:", setBlobResponse);
        });
    }).catch((getBlobResponse) => {
        TS.debug.log("Failed to load data from local storage: " + getBlobResponse.cause);
        console.error("Failed to load data from local storage:", getBlobResponse);
    });

    if (input.id == "abilities-text") {
        let actions = parseActions(input.value);
        addActions(actions);
    }
}

function findFirstSiblingWithClass(element, className) {
    let siblings = element.parentElement.children;
    for (let sibling of siblings) {
        if (sibling.classList.contains(className)) {
            return sibling;
        }
    }
    return null;
}

function createDiceRoll(clickElement, inputElement) {
    let modifierString = "";
    if (clickElement.dataset.modifier != "no-mod" && inputElement != null) {
        modifierString = inputElement.value >= 0 ? "+" + inputElement.value : inputElement.value;
    }
    let label = "";
    if (clickElement.dataset.label != undefined) {
        label = clickElement.dataset.label;
    } else {
        label = clickElement.textContent;
    }
    let roll = `${clickElement.dataset.diceType}${modifierString == '+' ? '' : modifierString}`

    //this returns a roll descriptor object. we could be using TS.dice.makeRollDescriptor(`${roll}+${modifierString}`) instead
    //depends mostly on personal preference. using makeRollDescriptor can be safer through updates, but it's also less efficient
    //and would ideally need error handling on the return value (and can be rate limited)
    return { name: label, roll: roll };
}

function parseActions(text) {
    // Original
    // let results = text.matchAll(/(.*) (\d{0,2}d\d{1,2}[+-]?\d*) ?(.*)/gi);
    // To include more dice complexity
    // let results = text.matchAll(/(.*) ((?:\d{0,2}d\d{1,2}[+-]?\d*)+) ?(.*)/gi);
    // To follow our W&G weapon pattern
    let results = text.matchAll(/(.*);(melee|(?:(?:\d{1,2}) (?:\d{1,2}) (?:\d{1,2})));((?:\d{0,2}d\d{1,2}[+-]?\d*)+);(-|(?:[0-9]{1}));(-|(?:[0-9]{1}));?(.*)/gi);
    let actions = [];
    for (let result of results) {
        let action = {
            title: result[1],
            range: result[2],
            dice: result[3],
            ap: result[4],
            salvo: result[5],
            description: result[6]
        }
        actions.push(action);
    }
    return actions;
}

function addActions(results) {
    //remove old actions
    let oldActions = document.querySelectorAll("[id^=list-action]");
    for (let oldAction of oldActions) {
        oldAction.remove();
    }

    //add new actions
    let template = document.getElementById("abilities-template");
    let container = template.parentElement;
    for (let i = 0; i < results.length; i++) {
        let clonedAction = template.content.firstElementChild.cloneNode(true);
        clonedAction.id = "list-action" + i;
        let title = clonedAction.querySelector("[id=abilities-template-title]");
        title.removeAttribute("id");
        title.textContent = results[i]["title"];

        let description = clonedAction.querySelector("[id=abilities-template-traits]");
        description.removeAttribute("id");
        description.textContent = results[i]["description"];

        let range = clonedAction.querySelector("[id=abilities-template-range]");
        range.removeAttribute("id");
        range.textContent = results[i]["range"];

        let ap = clonedAction.querySelector("[id=abilities-template-ap]");
        ap.removeAttribute("id");
        ap.textContent = "-" + results[i]["ap"];

        let salvo = clonedAction.querySelector("[id=abilities-template-salvo]");
        salvo.removeAttribute("id");
        salvo.textContent = results[i]["salvo"];

        let button = clonedAction.querySelector("[id=abilities-template-button]");
        button.id = "action-button" + i;
        button.dataset.diceType = results[i]["dice"];
        button.dataset.label = results[i]["title"];
        button.addEventListener("click", function () {
            countIcon = 0;
            countExalted = 0;
            countCrit = 0;
            countComplication = 0;
            TS.symbiote.sendNotification(me, rolledMessage(button.dataset.diceType, true));
            TS.dice.putDiceInTray([createDiceRoll(button, null)]).then((rollId) => {
                // The dice roll has been initiated. Store the ID in our TrackedIds
                if (true) console.log("Roll initiated. Roll ID:", rollId);
                trackedIds[rollId] = 1
            })
                .catch((error) => {
                    // Something went wrong initiating the dice roll.
                    console.error("Error initiating roll:", error);
                });
            //we are not checking for success or failure here, but could easily by adding a .then (success) and .catch (failure)
        });

        container.insertBefore(clonedAction, document.getElementById("abilities-text").parentNode);
    }
}

function populateTHAC0(event) {
    let matrix = document.getElementById("thac0-matrix");
    let children = matrix.children;
    let remainingElements = 9;
    for (let child of children) {
        if (child.classList.contains("field-data-short")) {
            child.textContent = event.target.value - remainingElements;
            remainingElements--;
        }
    }
}

function loadStoredData() {
    TS.localStorage.campaign.getBlob().then((storedData) => {
        //localstorage blobs are just unstructured text.
        //this means we can store whatever we like, but we also need to parse it to use it.
        let data = JSON.parse(storedData || "{}");
        if (Object.entries(data).length > 0) {
            clearStorageButton.classList.add("danger");
            clearStorageButton.disabled = false;
            clearStorageButton.textContent = "Clear Character Sheet";
        }
        let keyCount = 0;
        for (let [key, value] of Object.entries(data)) {
            keyCount++;
            let element = document.getElementById(key);
            element.value = value;
            if (key == "thac0") {
                element.dispatchEvent(new Event('change'));
            } else if (element.type == "checkbox") {
                element.checked = value == "on" ? true : false;
            } else if (key == "abilities-text") {
                let results = parseActions(element.value);
                addActions(results);
            }
        }
        //adding some log information to the symbiote log
        //this doesn't have particular importance, but is here to show how it's done
        TS.debug.log(`Loaded ${keyCount} values from storage`);
    });
}

function clearSheet() {
    //clear stored data
    TS.localStorage.campaign.deleteBlob().then(() => {
        //if the delete succeeded (.then), set the UI to reflect that
        clearStorageButton.classList.remove("danger");
        clearStorageButton.disabled = true;
        clearStorageButton.textContent = "Character Sheet Empty";
    }).catch((deleteResponse) => {
        //if the delete failed (.catch), write a message to symbiote log
        TS.debug.log("Failed to delete local storage: " + deleteResponse.cause);
        console.error("Failed to delete local storage:", deleteResponse);
    });

    //clear sheet inputs
    let inputs = document.querySelectorAll("input,textarea");
    for (let input of inputs) {
        switch (input.type) {
            case "button":
                break;
            case "checkbox":
                input.checked = false;
                break;
            default:
                input.value = "";
                break;
        }
    }
}

function onStateChangeEvent(msg) {
    if (msg.kind === "hasInitialized") {
        //the TS Symbiote API has initialized and we can begin the setup. think of this as "init".
        clearStorageButton = document.getElementById("clear-storage");
        loadStoredData();
        initSheet();
        findMe();
    }
}

function roll(input) {
    countIcon = 0;
    countExalted = 0;
    countCrit = 0;
    countComplication = 0;

    console.log("input here : " + input.value)
    const numDice = input.value;
    const rollDesc = numDice + 'd6';
    console.log("rolldesc : " + rollDesc)
    TS.symbiote.sendNotification(me, rolledMessage(numDice));

    TS.dice.putDiceInTray([{ name: "myroll", roll: rollDesc }], null)
        .then((rollId) => {
            // The dice roll has been initiated. Store the ID in our TrackedIds
            if (true) console.log("Roll initiated. Roll ID:", rollId);
            trackedIds[rollId] = 1
        })
        .catch((error) => {
            // Something went wrong initiating the dice roll.
            console.error("Error initiating roll:", error);
        });
}


function hideShow(select) {
    const x = select;
    if (x.style.display === "none") {
        x.style.display = "flex";
    } else {
        x.style.display = "none";
    }
}

function changeBody(registers, bodies, activeRegister) {
    Array.from(registers.children).forEach((el, i) => {
        if (bodies.children[i]) {
            bodies.children[i].style.display = el == activeRegister ? 'block' : 'none'
        }

        el.setAttribute('aria-expanded', el == activeRegister ? 'true' : 'false')
    })
}

// Gets the message together when you start a roll
function rolledMessage(numDice, weapon) {

    if (me === '') findMe();

    let message = '<color="orange"><size=120%><align="center">';

    if (weapon) {
        message += `<color="white"><size=100%><align="left">\n<color="white">I'm rolling <color="green">${numDice}<color="white">`;

    } else {
        message += `<color="white"><size=100%><align="left">\n<color="white">I'm rolling <color="green">${numDice}d6<color="white">`;

    }

    return message;
}


// TaleSpire will call this after a die roll because of our manifest
// Takes a look at the roll and handles it if it's one we made
async function handleRollResult(rollEvent) {
    if (trackedIds[rollEvent.payload.rollId] == undefined) {
        // If we haven't tracked that roll, ignore it because it's not from us
        return;
    }

    if (true) console.log("roll event", rollEvent);

    // Get the results groups from the roll event
    const resultsGroups = rollEvent.payload.resultsGroups;

    // Process each results group
    for (let group of resultsGroups) {
        // Get the roll results from the group
        const results = group.result.results;

        // Add the results to allResults
        allResults = allResults.concat(results);
    }

    // After processing the roll event, remove its rollId from trackedIds
    delete trackedIds[rollEvent.payload.rollId];

    // Only update the HTML after all rolls are done
    if (Object.values(trackedIds).every(value => value === 1)) {
        const targetValue = 4

        // Now update the results
        updateResults(allResults, targetValue, true);
        allResults = [];
    }
}


function updateResults(results, targetValue, sendChatMessage) {

    let processedResults = results;

    // Process each result
    for (let i = 0; i < processedResults.length; i++) {
        let result = results[i];
        console.log("result of i : " + result)
        // If it's first dice = wrath dice, update the corresponding counters
        if (i === 0) {
            if (result === 6) {
                countCrit++;
                countExalted++;
            } else if (result === 1) {
                countComplication++;
            } else if (result >= targetValue && result !== 6) {
                countIcon++;
            }
        } else {
            // If result is a natural 1 or 6, update the corresponding counters
            if (result === 6) {
                countExalted++;
            } else if (result >= targetValue && result !== 6) {
                countIcon++;
            }
        }
    }

    if (sendChatMessage) {
        TS.symbiote.sendNotification(me, resultsMessage());
    }

}

// Makes the message for the Total Results table
function resultsMessage() {
    totalSuccesses = countIcon + 2 * countExalted
    if (countCrit != 0) {
        crit = "yes";
        color = `<color="red">`;
    } else crit = "no"
    if(countComplication != 0){
        compl = "yes";
        color = `<color="red">`;
    } else compl = "no"
    return `<size=120%><color="orange">Results<size=100%><color="white">
    <b>Icons :</b>  ${countIcon}
    <b>Exalted Icons :</b>  ${countExalted}
    <b>Total successes :</b> ${totalSuccesses}
    \n<color="orange"><b>WRATH DICE</b><color="white">
    <b>Complications :</b>${color}  ${compl}<color="white">
    <b>Critical Wrath :</b>${color}  ${crit}<color="white">
`;

}
